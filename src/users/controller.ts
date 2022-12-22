import { ServerResponse } from 'http';

import { HttpCode, HttpMethods, Messages } from '../app/enums';
import { AppError } from '../app/error-handler/app-error';
import { errorHandler } from '../app/error-handler/error-handler';
import { sendOk } from '../helpers/sent-responses';
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
        const result = this.userService.getAllUsers();
        sendOk(response, result);
      } else {
        throw new AppError(HttpCode.BadRequest, Messages.UnknownMethod);
      }
    } catch (error) {
      errorHandler(error, response);
    }
  }
}
