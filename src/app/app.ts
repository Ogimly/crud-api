import 'dotenv/config';
import http from 'http';

import { Controller } from '../controller/controller';
import { DEFAULT_BASE_URL, DEFAULT_PORT } from './const';

export class App {
  private port = process.env.PORT || DEFAULT_PORT;

  private baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;

  private server = http.createServer(this.controller.requestHandler);

  constructor(private controller: Controller) {}

  public start() {
    this.server.listen(this.port, () => {
      console.log(`Server running at ${this.baseUrl}:${this.port}/`);
    });
  }
}
