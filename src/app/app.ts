import 'dotenv/config';
import http from 'http';
import cluster, { Worker } from 'cluster';
import os from 'os';

import { Router } from './router';
import { UserController } from '../users/controller';
import { UserService } from '../users/in-memory-db/service';
import { DEFAULT_BASE_URL, DEFAULT_CLUSTER_MODE, DEFAULT_PORT } from './const';
import { ClusterCommands, ClusterMode } from './enums';
import { ClusterMessage, ClusterWorker } from './app.d';
import { Balancer } from './balancer';
import { User } from '../users/entity';

export class App {
  private port: number = +(process.env.PORT ?? DEFAULT_PORT);

  private baseUrl = process.env.BASE_URL ?? DEFAULT_BASE_URL;

  private clusterMode = process.env.CLUSTER_MODE ?? DEFAULT_CLUSTER_MODE;

  private balancer?: Balancer;

  private userService = new UserService();

  private userController = new UserController(this.clusterMode, this.userService);

  private router = new Router(this.userController);

  private _server:
    | http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
    | undefined;

  private workers: ClusterWorker[] = [];

  private isBalancer = false;

  get server():
    | http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
    | undefined {
    return this._server;
  }

  constructor() {
    if (this.clusterMode === ClusterMode.single)
      this._server = http.createServer(this.router.handler.bind(this.router));
  }

  public start(): void {
    if (this.clusterMode === ClusterMode.single) {
      // single server

      if (this._server)
        this._server.listen(this.port, () => {
          console.log(`Server running at ${this.baseUrl}:${this.port}/`);
        });
    } else if (this.clusterMode === ClusterMode.multi) {
      // start cluster

      if (cluster.isPrimary) {
        // Primary process
        console.log(`Cluster ${process.pid} is running, wait for workers...`);

        const numWorkers = os.cpus().length;

        for (let i = 0; i < numWorkers; i++) {
          this.createWorker();
        }

        cluster.on('exit', this.clusterOnExit.bind(this));
        cluster.on('message', this.clusterOnMessage.bind(this));
      } else {
        // Worker process
        this.startWorker();

        process.on('message', this.workerOnMessage.bind(this));
      }
    }

    process.on('exit', () => {
      if (this._server) this._server.close();
    });

    process.on('SIGINT', () => process.exit());
  }

  private createWorker(): void {
    const noBalancer = this.workers.every(({ isBalancer }) => !isBalancer);
    const workerPort = noBalancer
      ? this.port
      : Math.max(this.port, ...this.workers.map(({ port }) => port)) + 1;

    const newWorker = cluster.fork({ workerPort, isBalancer: noBalancer });

    const id = newWorker.process.pid;

    if (id) this.workers.push({ port: workerPort, isBalancer: noBalancer, id });
  }

  private startWorker(): void {
    if (!process.env.workerPort) return;

    this.port = +process.env.workerPort;
    this.isBalancer = process.env.isBalancer === 'true';

    if (this.isBalancer) {
      this.balancerSendWorkersRequest();

      this.balancer = new Balancer(this.baseUrl);

      this._server = http.createServer(this.balancer.handler.bind(this.balancer));
    } else {
      this._server = http.createServer(this.router.handler.bind(this.router));
    }

    if (this._server)
      this._server.listen(this.port, () => {
        console.log(
          `${this.isBalancer ? 'Balancer' : 'Worker'} ${process.pid}: server running at ${
            this.baseUrl
          }:${this.port}/`
        );
      });

    // setTimeout(() => process.exit(), Math.random() * 10000);
  }

  private workerOnMessage(message: ClusterMessage): void {
    const { cmd, data } = message;

    if (cmd === ClusterCommands.workersResponse) {
      console.log(
        `${this.isBalancer ? 'Balancer' : 'Worker'} ${
          process.pid
        }: workers received from cluster`
      );

      const workers = data?.workers;

      if (workers) {
        this.workers = [...workers];
        if (this.balancer) this.balancer.workers = workers;
      }
    }
  }

  private clusterOnExit(worker: Worker, code: number): void {
    console.log(`Cluster: worker ${worker.process.pid} died, code ${code}`);

    const foundIndex = this.workers.findIndex(({ id }) => id === worker.process.pid);

    if (foundIndex !== -1) {
      this.workers.splice(foundIndex, 1);

      this.createWorker();
    }
  }

  private clusterOnMessage(worker: Worker, message: ClusterMessage): void {
    const { cmd, data } = message;

    if (cmd === ClusterCommands.getAllUsersRequest) {
      this.clusterSendAllUsers(worker);
    } else if (cmd === ClusterCommands.getOneUserRequest) {
      this.clusterSendOneUser(worker, data?.id);
    } else if (cmd === ClusterCommands.createUserRequest) {
      this.clusterSendCreateUser(worker, data?.body);
    } else if (cmd === ClusterCommands.updateUserRequest) {
      this.clusterSendUpdateUser(worker, data?.id, data?.body);
    } else if (cmd === ClusterCommands.deleteUserRequest) {
      this.clusterSendDeleteUser(worker, data?.id);
    } else if (cmd === ClusterCommands.workersRequest) {
      console.log(
        `Cluster ${process.pid}: workers request from balancer ${worker.process.pid}`
      );

      this.clusterSendWorkers(worker);
    }
  }

  private clusterSendAllUsers(worker: Worker): void {
    const getAllUsersResponse: ClusterMessage = {
      cmd: ClusterCommands.getAllUsersResponse,
      data: { users: [...this.userService.getAll()] },
    };

    worker.send(getAllUsersResponse);
  }

  private clusterSendOneUser(worker: Worker, id: string | undefined): void {
    const getOneUserResponse: ClusterMessage = {
      cmd: ClusterCommands.getOneUserResponse,
      data: { user: id ? this.userService.getOne(id) : undefined },
    };

    worker.send(getOneUserResponse);
  }

  private clusterSendCreateUser(
    worker: Worker,
    body: Omit<User, 'id'> | undefined
  ): void {
    const createUserResponse: ClusterMessage = {
      cmd: ClusterCommands.createUserResponse,
      data: { user: body ? this.userService.create(body) : undefined },
    };

    worker.send(createUserResponse);
  }

  private clusterSendUpdateUser(
    worker: Worker,
    id: string | undefined,
    body: Omit<User, 'id'> | undefined
  ): void {
    const updateUserResponse: ClusterMessage = {
      cmd: ClusterCommands.updateUserResponse,
      data: { user: id && body ? this.userService.update(id, body) : undefined },
    };

    worker.send(updateUserResponse);
  }

  private clusterSendDeleteUser(worker: Worker, id: string | undefined): void {
    const deleteUserResponse: ClusterMessage = {
      cmd: ClusterCommands.deleteUserResponse,
      data: { ok: id ? this.userService.delete(id) : false },
    };

    worker.send(deleteUserResponse);
  }

  private balancerSendWorkersRequest(): void {
    if (process.send) {
      const workersRequest: ClusterMessage = { cmd: ClusterCommands.workersRequest };
      process.send(workersRequest);
    }
  }

  private clusterSendWorkers(balancer: Worker): void {
    const workersResponse: ClusterMessage = {
      cmd: ClusterCommands.workersResponse,
      data: { workers: [...this.workers] },
    };

    balancer.send(workersResponse);
  }
}
