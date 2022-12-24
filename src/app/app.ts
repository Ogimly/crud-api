import 'dotenv/config';
import http from 'http';

import { Router } from './router';
import { DEFAULT_BASE_URL, DEFAULT_PORT } from './const';

export class App {
  private port = process.env.PORT || DEFAULT_PORT;

  private baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;

  private _server;

  get server(): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> {
    return this._server;
  }

  constructor(private router: Router) {
    this._server = http.createServer(this.router.handler.bind(router));
  }

  public start(): void {
    this._server.listen(this.port, () => {
      console.log(`Server running at ${this.baseUrl}:${this.port}/`);
    });
  }
}
