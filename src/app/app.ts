import 'dotenv/config';
import http from 'http';
import cluster from 'cluster';
import os from 'os';

import { Router } from './router';
import { DEFAULT_BASE_URL, DEFAULT_PORT, DEFAULT_CLUSTER_MODE } from './const';
import { ClusterCommands, ClusterMode } from './enums';
import { ClusterMessage } from './app.d';

export class App {
  private port = process.env.PORT || DEFAULT_PORT;

  private baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;

  private clusterMode = process.env.CLUSTER_MODE || DEFAULT_CLUSTER_MODE;

  private _server;

  get server(): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> {
    return this._server;
  }

  constructor(private router: Router) {
    this._server = http.createServer(this.router.handler.bind(router));
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

        console.log(`Primary process ${process.pid} is running, wait for workers...`);

        let portCounter = +this.port + 1;

        // const cpus = os.cpus();
        const workersNum = 3; //cpus.length;

        console.log(`Workers: ${workersNum}`);

        for (let i = 0; i < workersNum; i++) {
          cluster.fork();
        }

        cluster.on('exit', (worker, code) => {
          console.log(`Worker process: ${worker.process.pid} died. Code ${code}`);
          cluster.fork();
        });

        cluster.on('message', (worker, message) => {
          const { cmd } = message;

          console.log(`Message from worker ${worker.process.pid}: ${cmd}`);

          if (cmd === ClusterCommands.portRequest) {
            const portResponse: ClusterMessage = {
              cmd: ClusterCommands.portResponse,
              data: { portIndex: portCounter },
            };
            portCounter += 1;
            worker.send(portResponse);
          }
        });
      } else {
        // Worker process

        process.on('message', (message: ClusterMessage) => {
          const { cmd } = message;

          console.log(`Worker process ${process.pid}: message from server ${cmd}`);

          if (cmd === ClusterCommands.portResponse) {
            const port = message.data?.portIndex || this.port;

            this._server.listen(port, () => {
              console.log(
                `Worker process ${process.pid}: server running at ${this.baseUrl}:${port}/`
              );
            });
          }
        });

        if (process.send) {
          const portRequest: ClusterMessage = { cmd: ClusterCommands.portRequest };
          process.send(portRequest);
          console.log(`Worker process ${process.pid}: portRequest sent`);
        }
      }
    } else {
      this._server.close();
    }
  }
}
