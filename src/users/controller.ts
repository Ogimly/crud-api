import { ServerResponse } from 'http';

import { HttpMethods, Messages } from '../app/enums';
import { sendBadRequestError, sendOk } from '../helpers/sent-responses';
import { UserService } from './in-memory-db/service';

export class UserController {
  constructor(private userService: UserService) {}

  public handler(
    method: string | undefined,
    id: string | undefined,
    res: ServerResponse
  ): void {
    try {
      if (!method) throw Error(Messages.UnknownMethod);

      if (method === HttpMethods.GET) {
        const result = this.userService.getAllUsers();
        sendOk(res, result);
      } else {
        throw Error(Messages.UnknownMethod);
      }
    } catch (error) {
      sendBadRequestError(res, Messages.UnknownMethod);
    }
  }
}
