import { IncomingMessage, ServerResponse } from 'http';

import { CONTENT_TYPE_JSON } from '../app/const';
import { HttpCode, HttpMethods, Messages } from '../app/enums';
import { AppError } from '../app/error-handler/app-error';
import { errorHandler } from '../app/error-handler/error-handler';
import { User } from './entity';
import { UserService } from './in-memory-db/service';

export class UserController {
  constructor(private userService: UserService) {}

  public async handler(
    method: string | undefined,
    id: string | undefined,
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    try {
      if (!method) throw new AppError(HttpCode.BadRequest, Messages.UnknownMethod);

      if (method === HttpMethods.GET) {
        this.GETHandler(id, response);
      } else if (method === HttpMethods.POST) {
        await this.POSTHandler(request, response);
      } else if (method === HttpMethods.PUT) {
        await this.PUTHandler(request, response);
      } else if (method === HttpMethods.DELETE) {
        this.DELETEHandler(id, response);
      } else {
        throw new AppError(HttpCode.BadRequest, Messages.UnknownMethod);
      }
    } catch (error) {
      console.log(error);
      errorHandler(error, response);
    }
  }

  private GETHandler(id: string | undefined, response: ServerResponse): void {
    if (id) {
      const resultValidate = this.userService.validateId(id);

      if (!resultValidate.validate)
        throw new AppError(HttpCode.BadRequest, resultValidate.error);

      const user = this.userService.getById(id);
      console.log(user);

      if (!user) throw new AppError(HttpCode.NotFound, Messages.UserNotFound);

      this.sendResponse(HttpCode.Ok, response, user);
    } else {
      const users = this.userService.getAll();
      this.sendResponse(HttpCode.Ok, response, users);
    }
  }

  private async POSTHandler(
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    const body = await this.getBody(request);

    const resultValidate = this.userService.validateBody(body);

    if (!resultValidate.validate)
      throw new AppError(HttpCode.BadRequest, resultValidate.error);

    if (resultValidate.body) {
      const result = this.userService.create(resultValidate.body);
      this.sendResponse(HttpCode.Ok, response, result);
    }
  }

  private PUTHandler(request: IncomingMessage, response: ServerResponse): void {}

  private DELETEHandler(id: string | undefined, response: ServerResponse): void {}

  private getBody(request: IncomingMessage): Promise<Partial<User>> {
    return new Promise((resolve, reject) => {
      try {
        let data = '';

        request.on('data', (chunk) => {
          data += chunk.toString();
        });

        request.on('end', () => {
          try {
            const body = JSON.parse(data);
            resolve(body);
          } catch (error) {
            reject(new AppError(HttpCode.BadRequest, Messages.JSONInvalid));
          }
        });
      } catch (error) {
        reject(new AppError(HttpCode.BadRequest, Messages.BodyInvalid));
      }
    });
  }

  private sendResponse(code: number, response: ServerResponse, result: unknown): void {
    response.writeHead(code, CONTENT_TYPE_JSON);
    response.end(JSON.stringify(result));
  }
}
