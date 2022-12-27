import { IncomingMessage, ServerResponse } from 'http';

import { Messages, HttpCode } from './enums';
import { AppError } from './error-handler/app-error';
import { errorHandler } from './error-handler/error-handler';

export class Balancer {
  public handler(request: IncomingMessage, response: ServerResponse): void {
    try {
      const url = request.url;
      if (!url)
        throw new AppError(HttpCode.InternalServerError, Messages.InternalServerError);

      //
    } catch (error) {
      errorHandler(error, response);
    }
  }
}
