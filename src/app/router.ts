import { IncomingMessage, ServerResponse } from 'http';

import { UserController } from '../users/controller';
import { Messages, Endpoints, HttpCode } from './enums';
import { AppError } from './error-handler/app-error';
import { errorHandler } from './error-handler/error-handler';

export class Router {
  constructor(private userController: UserController) {}

  public handler(request: IncomingMessage, response: ServerResponse): void {
    try {
      const url = request.url;
      if (!url)
        throw new AppError(HttpCode.InternalServerError, Messages.InternalServerError);

      const [root, endpoint, id, ...rest] = url.trim().slice(1).split('/');
      const method = request.method;

      if (rest.length !== 0)
        throw new AppError(HttpCode.NotFound, Messages.RouteNotFound);

      if (`/${root}/${endpoint}` === Endpoints.users) {
        this.userController.handler(method, id, request, response);
      } else {
        throw new AppError(HttpCode.NotFound, Messages.RouteNotFound);
      }
    } catch (error) {
      errorHandler(error, response);
    }
  }
}
