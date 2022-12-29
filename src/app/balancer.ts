import http from 'http';
import { ClusterWorker } from './app.d';
import { CONTENT_TYPE_JSON } from './const';

import { Messages, HttpCode } from './enums';
import { AppError } from './error-handler/app-error';
import { errorHandler } from './error-handler/error-handler';

export class Balancer {
  private _workers: ClusterWorker[] = [];

  private currentWorker = 0;

  constructor(private baseUrl: string) {}

  public set workers(value: ClusterWorker[]) {
    this._workers = [...value].filter(({ isBalancer }) => !isBalancer);
  }

  public handler(request: http.IncomingMessage, response: http.ServerResponse): void {
    try {
      const path = request.url;
      if (!path)
        throw new AppError(HttpCode.InternalServerError, Messages.InternalServerError);

      // define worker to redirect
      this.setCurrentWorker();
      // send request to worker
      const workerRequest = this.createWorkerRequest(request, response);

      workerRequest.on('error', () => {
        throw new AppError(HttpCode.InternalServerError, Messages.InternalServerError);
      });

      let data = '';

      request.on('data', (chunk) => {
        data += chunk.toString();
      });
      request.on('end', () => {
        workerRequest.write(data);
        workerRequest.end();
      });
    } catch (error) {
      errorHandler(error, response);
    }
  }

  private setCurrentWorker(): void {
    this.currentWorker += 1;
    this.currentWorker = this.currentWorker % this._workers.length;
  }

  private createWorkerRequest(
    request: http.IncomingMessage,
    response: http.ServerResponse
  ): http.ClientRequest {
    const { url: path, method, headers } = request;
    const options = {
      hostname: this.baseUrl,
      port: this._workers[this.currentWorker].port,
      path,
      method,
      headers,
    };

    console.log(
      `Balancer ${process.pid}: redirecting ${method} to ${options.hostname}:${options.port}/`
    );

    return http.request(options, (workerResponse) => {
      let data = '';

      workerResponse.on('data', (chunk) => {
        data += chunk.toString();
      });
      workerResponse.on('end', () => {
        const statusCode = workerResponse.statusCode ?? HttpCode.InternalServerError;

        // send response from worker
        response.writeHead(statusCode, CONTENT_TYPE_JSON);
        response.end(data);
      });
    });
  }
}
