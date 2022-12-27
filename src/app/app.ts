import 'dotenv/config';
import http from 'http';
import cluster, { Worker } from 'cluster';
import os from 'os';

import { Router } from './router';
import { UserController } from '../users/controller';
import { UserService } from '../users/in-memory-db/service';
import { DEFAULT_BASE_URL, DEFAULT_PORT } from './const';
import { ClusterCommands, ClusterMode } from './enums';
import { ClusterMessage, ClusterWorker } from './app.d';

export class App {
  private port: number = +(process.env.PORT ?? DEFAULT_PORT);

  private baseUrl = process.env.BASE_URL ?? DEFAULT_BASE_URL;

  private router: Router;

  private userController: UserController;

  private userService: UserService;

  private _server;

  private workers: ClusterWorker[] = [];

  private isBalancer = false;

  get server(): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> {
    return this._server;
  }

  constructor(private clusterMode: string) {
    this.userService = new UserService();

    this.userController = new UserController(clusterMode, this.userService);

    this.router = new Router(this.userController);

    this._server = http.createServer(this.router.handler.bind(this.router));
  }

  public start(): void {
    if (this.clusterMode === ClusterMode.single) {
      // single server

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
      }
    }
  }

  private createWorker(): void {
    const noBalancer = this.workers.every(({ isBalancer }) => !isBalancer);
    const workerPort = noBalancer
      ? this.port
      : Math.max(this.port, ...this.workers.map(({ port }) => port)) + 1;

    const newWorker = cluster.fork({ workerPort, isBalancer: noBalancer });

    const id = +(newWorker.process.pid ?? 0);

    this.workers.push({ port: workerPort, isBalancer: noBalancer, id });
  }

  startWorker(): void {
    this.port = +(process.env.workerPort ?? 0);
    this.isBalancer = process.env.isBalancer === 'true';

    this._server.listen(this.port, () => {
      console.log(
        `Worker${this.isBalancer ? ' balancer' : ''} ${process.pid}: server running at ${
          this.baseUrl
        }:${this.port}/`
      );
    });

    // setTimeout(() => process.exit(), Math.random() * 10000);
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

    if (cmd === ClusterCommands.usersRequest) {
      console.log(
        `Cluster ${process.pid}: users request from worker ${worker.process.pid}`
      );

      const usersResponse: ClusterMessage = {
        cmd: ClusterCommands.usersResponse,
        data: { users: [...this.userService.getAll()] },
      };

      worker.send(usersResponse);
    } else if (cmd === ClusterCommands.usersResponse) {
      console.log(`Cluster ${process.pid}: users sent from worker ${worker.process.pid}`);

      const users = data?.users;

      if (users) this.userService.setUsers(users);
    }
  }
}
