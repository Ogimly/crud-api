import { IncomingMessage, ServerResponse } from 'http';
import { CONTENT_TYPE_JSON } from '../app/const';
import { HttpCode } from '../app/enums';

export class Controller {
  private userService = '';

  public requestHandler(req: IncomingMessage, res: ServerResponse) {
    res.writeHead(HttpCode.Ok, CONTENT_TYPE_JSON);
    res.end(
      JSON.stringify({
        data: 'Hello World!',
      })
    );
  }
}
