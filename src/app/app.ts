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

  private currentPort = this.port;

  private baseUrl = process.env.BASE_URL ?? DEFAULT_BASE_URL;

  private router: Router;

  private userController: UserController;

  private userService: UserService;

  private _server;

  private workers: ClusterWorker[] = [];

  private isPrimary = false;

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

        this.workers = this.createWorkers();

        cluster.on('exit', this.clusterOnExit.bind(this));

        cluster.on('message', this.clusterOnMessage.bind(this));
      } else {
        // Worker process

        process.on('message', this.workerOnMessage.bind(this));

        if (process.send) {
          const portRequest: ClusterMessage = { cmd: ClusterCommands.portRequest };
          process.send(portRequest);
        }

        setTimeout(() => process.exit(), Math.random() * 10000);
      }
    } else {
      this._server.close();
    }
  }

  private createWorkers(): ClusterWorker[] {
    return os.cpus().map((): ClusterWorker => {
      const worker = cluster.fork();

      console.log(`Worker forked: ${worker.process.pid}`);

      return {
        worker,
        isPrimary: false,
        id: worker.process.pid ?? 0,
        port: 0,
      };
    });
  }

  private clusterOnExit(worker: Worker, code: number): void {
    console.log(`Cluster: worker ${worker.process.pid} died, code ${code}`);

    const found = this.workers.find(({ id }) => id === worker.process.pid);
    if (found) {
      found.isPrimary = false;
      found.port = 0;

      const newWorker = cluster.fork();

      found.worker = newWorker;
      found.id = newWorker.process.pid ?? 0;
    }
  }

  private clusterOnMessage(worker: Worker, message: ClusterMessage): void {
    const { cmd, data } = message;

    if (cmd === ClusterCommands.portRequest) {
      console.log(
        `Cluster ${process.pid}: port request from worker ${worker.process.pid}`
      );

      const noPrimary = this.workers.every(({ isPrimary }) => !isPrimary);
      const port = noPrimary ? this.port : this.currentPort;

      const portResponse: ClusterMessage = {
        cmd: ClusterCommands.portResponse,
        data: { port, isPrimary: noPrimary },
      };

      const found = this.workers.find(({ id }) => id === worker.process.pid);
      if (found) {
        found.port = port;
        found.isPrimary = noPrimary;
      }

      this.currentPort += 1;

      worker.send(portResponse);
    } else if (cmd === ClusterCommands.usersRequest) {
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

  private workerOnMessage(message: ClusterMessage): void {
    const { cmd } = message;

    if (cmd === ClusterCommands.portResponse) {
      console.log(`Worker ${process.pid}: port sent from server`);

      this.port = message.data?.port ?? this.port;
      this.isPrimary = message.data?.isPrimary ?? false;

      this._server.listen(this.port, () => {
        console.log(
          `Worker ${this.isPrimary ? 'primary ' : ''}${process.pid}: server running at ${
            this.baseUrl
          }:${this.port}/`
        );
      });
    }
  }
}
