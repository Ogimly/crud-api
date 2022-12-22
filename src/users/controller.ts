import { ServerResponse } from 'http';

import { CONTENT_TYPE_JSON } from '../app/const';
import { HttpCode, HttpMethods, Messages } from '../app/enums';
import { AppError } from '../app/error-handler/app-error';
import { errorHandler } from '../app/error-handler/error-handler';
import { UserService } from './in-memory-db/service';

export class UserController {
  constructor(private userService: UserService) {}

  public handler(
    method: string | undefined,
    id: string | undefined,
    response: ServerResponse
  ): void {
    try {
      if (!method) throw new AppError(HttpCode.BadRequest, Messages.UnknownMethod);

      if (method === HttpMethods.GET) {
        let result;

        if (id) {
          if (!this.userService.validateId(id))
            throw new AppError(HttpCode.BadRequest, Messages.invalidId);

          result = this.userService.getUserById(id);
        } else {
          result = this.userService.getAllUsers();
        }
        this.sendOk(response, result);
      } else if (method === HttpMethods.POST) {
      } else if (method === HttpMethods.PUT) {
      } else if (method === HttpMethods.DELETE) {
      } else {
        throw new AppError(HttpCode.BadRequest, Messages.UnknownMethod);
      }
    } catch (error) {
      errorHandler(error, response);
    }
  }

  private sendOk(response: ServerResponse, result: unknown): void {
    response.writeHead(HttpCode.Ok, CONTENT_TYPE_JSON);
    response.end(JSON.stringify(result));
  }
}
