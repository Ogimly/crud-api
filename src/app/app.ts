import 'dotenv/config';
import http from 'http';
import cluster, { Worker } from 'cluster';
import os from 'os';

import { Router } from './router';
import { UserController } from '../users/controller';
import { UserService } from '../users/in-memory-db/service';
import {
  clusterCommandsMap,
  DEFAULT_BASE_URL,
  DEFAULT_CLUSTER_MODE,
  DEFAULT_PORT,
} from './const';
import { ClusterCommands, ClusterMode } from './enums';
import { ClusterMessage, ClusterWorker } from './app.d';
import { Balancer } from './balancer';

export class App {
  private port: number = +(process.env.PORT ?? DEFAULT_PORT);

  private baseUrl = process.env.BASE_URL ?? DEFAULT_BASE_URL;

  private clusterMode = process.env.CLUSTER_MODE ?? DEFAULT_CLUSTER_MODE;

  private balancer?: Balancer;

  private userService?: UserService;

  private userController?: UserController;

  private router?: Router;

  private _server:
    | http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
    | undefined;

  private workers: ClusterWorker[] = [];

  private isBalancer = false;

  private isDB = false;

  private workerDB?: Worker;

  get server():
    | http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
    | undefined {
    return this._server;
  }

  constructor() {
    if (this.clusterMode === ClusterMode.single) {
      this.userService = new UserService();
      this.userController = new UserController(this.clusterMode, this.userService);
      this.router = new Router(this.userController);
      this._server = http.createServer(this.router.handler.bind(this.router));
    }
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

        // DB worker
        this.createWorker();

        // balancer and handler request workers
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
    const noDB = this.workers.every(({ isDB }) => !isDB);

    if (noDB) {
      this.workerDB = cluster.fork({ isDB: noDB, isBalancer: false, workerPort: 0 });

      const id = this.workerDB.process.pid;

      if (id) this.workers.push({ isDB: noDB, isBalancer: false, port: 0, id });
    } else {
      const noBalancer = this.workers.every(({ isBalancer }) => !isBalancer) && !noDB;

      const workerPort = noBalancer
        ? this.port
        : Math.max(this.port, ...this.workers.map(({ port }) => port)) + 1;

      const newWorker = cluster.fork({ isDB: false, isBalancer: noBalancer, workerPort });

      const id = newWorker.process.pid;

      if (id)
        this.workers.push({ isDB: false, isBalancer: noBalancer, port: workerPort, id });
    }
  }

  private startWorker(): void {
    if (!process.env.workerPort) return;

    this.port = +process.env.workerPort;
    this.isDB = process.env.isDB === 'true';
    this.isBalancer = process.env.isBalancer === 'true';

    if (this.isDB) {
      this.userService = new UserService();

      console.log(`DB Worker ${process.pid}: UserService running`);
    } else if (this.isBalancer) {
      this.balancerSendWorkersRequest();

      this.balancer = new Balancer(this.baseUrl);

      this._server = http.createServer(this.balancer.handler.bind(this.balancer));
    } else {
      this.userService = new UserService();
      this.userController = new UserController(this.clusterMode, this.userService);
      this.router = new Router(this.userController);

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

  private balancerSendWorkersRequest(): void {
    if (process.send) {
      const workersRequest: ClusterMessage = { cmd: ClusterCommands.workersRequest };
      process.send(workersRequest);
    }
  }

  private workerOnMessage(message: ClusterMessage): void {
    const { cmd } = message;

    if (cmd === ClusterCommands.workersResponse) {
      this.balancerSetWorkers(message);
    } else if (cmd.endsWith('Request')) {
      this.DBWorkerRequestHandler(message);
    }
  }

  private balancerSetWorkers({ data }: ClusterMessage): void {
    console.log(`Balancer ${process.pid}: workers received from cluster`);

    const workers = data?.workers;

    if (workers && this.balancer) {
      this.workers = [...workers];
      this.balancer.workers = workers;
    }
  }

  private DBWorkerRequestHandler({ cmd, data, workerID }: ClusterMessage): void {
    if (this.isDB && this.userService) {
      console.log(
        `DB worker ${process.pid}: ${cmd} received from cluster for ${workerID}`
      );

      const response: ClusterMessage = { cmd: clusterCommandsMap[cmd], workerID };

      const id = data?.id;
      const body = data?.body;

      if (cmd === ClusterCommands.getAllUsersRequest) {
        response.data = { users: [...this.userService.getAll()] };
      } else if (cmd === ClusterCommands.getOneUserRequest) {
        response.data = { user: id ? this.userService.getOne(id) : undefined };
      } else if (cmd === ClusterCommands.createUserRequest) {
        response.data = { user: body ? this.userService.create(body) : undefined };
      } else if (cmd === ClusterCommands.updateUserRequest) {
        response.data = {
          user: id && body ? this.userService.update(id, body) : undefined,
        };
      } else if (cmd === ClusterCommands.deleteUserRequest) {
        response.data = { ok: id ? this.userService.delete(id) : false };
      }

      if (process.send) {
        console.log(
          `DB worker ${process.pid}: ${clusterCommandsMap[cmd]} sent to cluster for ${workerID}`
        );

        process.send(response);
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

  private clusterOnMessage(fromWorker: Worker, message: ClusterMessage): void {
    const { cmd } = message;

    if (cmd === ClusterCommands.workersRequest) {
      this.clusterSendWorkers(fromWorker);
    } else if (cmd.endsWith('Request')) {
      this.clusterSendDBRequest(fromWorker, message);
    } else if (cmd.endsWith('Response')) {
      this.clusterSendDBResponse(fromWorker, message);
    }
  }

  private clusterSendWorkers(balancer: Worker): void {
    const workersResponse: ClusterMessage = {
      cmd: ClusterCommands.workersResponse,
      data: { workers: [...this.workers] },
    };

    console.log(
      `Cluster ${process.pid}: workers request from balancer ${balancer.process.pid}`
    );

    balancer.send(workersResponse);
  }

  private clusterSendDBRequest(fromWorker: Worker, { cmd, data }: ClusterMessage): void {
    if (this.workerDB) {
      const workerDBRequest: ClusterMessage = {
        cmd,
        data,
        workerID: fromWorker.process.pid,
      };

      console.log(
        `Cluster ${process.pid}: ${cmd} from worker ${fromWorker.process.pid} sent to DB worker ${this.workerDB.process.pid}`
      );

      this.workerDB.send(workerDBRequest);
    }
  }

  private clusterSendDBResponse(
    fromWorker: Worker,
    { cmd, data, workerID }: ClusterMessage
  ): void {
    const workerDBResponse: ClusterMessage = { cmd, data };

    console.log(
      `Cluster ${process.pid}: ${cmd} from DB worker ${fromWorker.process.pid} sent to worker ${workerID}`
    );

    const worker = this.getWorker(workerID);

    if (worker) worker.send(workerDBResponse);
  }

  private getWorker(id: number | undefined): Worker | undefined {
    if (cluster.workers)
      for (const worker of Object.values(cluster.workers)) {
        if (worker?.process.pid === id) return worker;
      }

    return undefined;
  }
}
