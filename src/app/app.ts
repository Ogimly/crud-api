import 'dotenv/config';
import http from 'http';

import { Router } from './router';
import { DEFAULT_BASE_URL, DEFAULT_PORT } from './const';

export class App {
  private port = process.env.PORT || DEFAULT_PORT;

  private baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;

  private server;

  constructor(private router: Router) {
    this.server = http.createServer(this.router.handler.bind(router));
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`Server running at ${this.baseUrl}:${this.port}/`);
    });
  }
}
