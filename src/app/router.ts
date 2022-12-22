import { IncomingMessage, ServerResponse } from 'http';

import { sendInternalServerError, sendNotFoundError } from '../helpers/sent-responses';
import { UserController } from '../users/controller';
import { Messages, Endpoints } from './enums';

export class Router {
  constructor(private userController: UserController) {}

  public handler(req: IncomingMessage, res: ServerResponse): void {
    try {
      const url = req.url;
      if (!url) throw Error(Messages.InternalServerError);

      const [root, endpoint, id, ...rest] = url.trim().slice(1).split('/');
      const method = req.method;

      if (rest.length !== 0) throw Error(Messages.RouteNotFound);

      if (`/${root}/${endpoint}` === Endpoints.users) {
        this.userController.handler(method, id, res);
      } else {
        sendNotFoundError(res, Messages.RouteNotFound);
      }
    } catch (error) {
      console.log(error);
      sendInternalServerError(res);
    }
  }
}
