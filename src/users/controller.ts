import cluster from 'cluster';
import { IncomingMessage, ServerResponse } from 'http';

import { CONTENT_TYPE_JSON } from '../app/const';
import {
  ClusterCommands,
  ClusterMode,
  HttpCode,
  HttpMethods,
  Messages,
} from '../app/enums';
import { AppError } from '../app/error-handler/app-error';
import { errorHandler } from '../app/error-handler/error-handler';
import { User } from './entity';
import { UserService } from './in-memory-db/service';
import { ClusterMessage } from '../app/app.d';

export class UserController {
  method?: string;

  id?: string;

  request?: IncomingMessage;

  response?: ServerResponse;

  constructor(private clusterMode: string, private userService: UserService) {
    process.on('message', async (message: ClusterMessage) => {
      const { cmd, data } = message;

      if (cmd === ClusterCommands.usersResponse) {
        // console.log(`Worker ${process.pid}: users sent from server`);

        const users = data?.users;
        if (users) this.userService.setUsers(users);

        await this.methodsHandler();

        if (process.send) {
          const usersResponse: ClusterMessage = {
            cmd: ClusterCommands.usersResponse,
            data: { users: [...this.userService.getAll()] },
          };
          process.send(usersResponse);
        }
      }
    });
  }

  public async handler(
    method: string | undefined,
    id: string | undefined,
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    this.method = method;
    this.id = id;
    this.request = request;
    this.response = response;

    if (this.clusterMode === ClusterMode.multi && !cluster.isPrimary) {
      if (process.send) {
        const usersRequest: ClusterMessage = { cmd: ClusterCommands.usersRequest };
        process.send(usersRequest);
      }
    } else {
      this.methodsHandler();
    }
  }

  private async methodsHandler(): Promise<void> {
    if (!this.response) return;
    try {
      if (!this.method || !this.request)
        throw new AppError(HttpCode.BadRequest, Messages.UnknownMethod);

      if (this.method === HttpMethods.GET) {
        this.GETHandler(this.id, this.response);
      } else if (this.method === HttpMethods.POST) {
        if (this.id) throw new AppError(HttpCode.BadRequest, Messages.RouteInvalid);

        await this.POSTHandler(this.request, this.response);
      } else if (this.method === HttpMethods.PUT) {
        await this.PUTHandler(this.id, this.request, this.response);
      } else if (this.method === HttpMethods.DELETE) {
        this.DELETEHandler(this.id, this.response);
      } else {
        throw new AppError(HttpCode.BadRequest, Messages.UnknownMethod);
      }
    } catch (error) {
      errorHandler(error, this.response);
    }
  }

  private GETHandler(id: string | undefined, response: ServerResponse): void {
    if (id) {
      const resultValidate = this.userService.validateId(id);

      if (!resultValidate.validate)
        throw new AppError(HttpCode.BadRequest, resultValidate.error);

      const user = this.userService.getOne(id);

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
      this.sendResponse(HttpCode.Created, response, result);
    }
  }

  private async PUTHandler(
    id: string | undefined,
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    const resultValidateId = this.userService.validateId(id);

    if (!resultValidateId.validate)
      throw new AppError(HttpCode.BadRequest, resultValidateId.error);

    const body = await this.getBody(request);

    const resultValidateBody = this.userService.validateBody(body);

    if (!resultValidateBody.validate)
      throw new AppError(HttpCode.BadRequest, resultValidateBody.error);

    if (resultValidateBody.body) {
      const result = this.userService.update(id!, resultValidateBody.body);

      if (!result) throw new AppError(HttpCode.NotFound, Messages.UserNotFound);

      this.sendResponse(HttpCode.Ok, response, result);
    }
  }

  private DELETEHandler(id: string | undefined, response: ServerResponse): void {
    const resultValidate = this.userService.validateId(id);

    if (!resultValidate.validate)
      throw new AppError(HttpCode.BadRequest, resultValidate.error);

    const result = this.userService.delete(id!);

    if (!result) throw new AppError(HttpCode.NotFound, Messages.UserNotFound);

    this.sendResponse(HttpCode.NoContent, response);
  }

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

  private sendResponse(
    code: number,
    response: ServerResponse,
    result: unknown = ''
  ): void {
    response.writeHead(code, CONTENT_TYPE_JSON);
    response.end(JSON.stringify(result));
  }
}
