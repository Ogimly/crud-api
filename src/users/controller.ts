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
      if (!this.response) return;

      const { cmd, data } = message;

      if (cmd === ClusterCommands.getAllUsersResponse) {
        const users = data?.users;
        this.sendResponse(HttpCode.Ok, this.response, users);
      } else if (cmd === ClusterCommands.getOneUserResponse) {
        const user = data?.user;
        if (!user) {
          new AppError(HttpCode.NotFound, Messages.UserNotFound).sentError(this.response);
        } else {
          this.sendResponse(HttpCode.Ok, this.response, user);
        }
      } else if (cmd === ClusterCommands.createUserResponse) {
        const user = data?.user;
        if (!user) {
          new AppError(HttpCode.NotFound, Messages.UserNotFound).sentError(this.response);
        } else {
          this.sendResponse(HttpCode.Created, this.response, user);
        }
      } else if (cmd === ClusterCommands.updateUserResponse) {
        const user = data?.user;
        if (!user) {
          new AppError(HttpCode.NotFound, Messages.UserNotFound).sentError(this.response);
        } else {
          this.sendResponse(HttpCode.Ok, this.response, user);
        }
      } else if (cmd === ClusterCommands.deleteUserResponse) {
        if (!data?.ok) {
          new AppError(HttpCode.NotFound, Messages.UserNotFound).sentError(this.response);
        } else {
          this.sendResponse(HttpCode.NoContent, this.response);
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

    try {
      if (!this.method || !this.request)
        throw new AppError(HttpCode.BadRequest, Messages.UnknownMethod);

      if (this.method === HttpMethods.GET) {
        this.GETHandler(this.id);
      } else if (this.method === HttpMethods.POST) {
        if (this.id) throw new AppError(HttpCode.BadRequest, Messages.RouteInvalid);
        await this.POSTHandler(this.request);
      } else if (this.method === HttpMethods.PUT) {
        await this.PUTHandler(this.id, this.request);
      } else if (this.method === HttpMethods.DELETE) {
        this.DELETEHandler(this.id);
      } else {
        throw new AppError(HttpCode.BadRequest, Messages.UnknownMethod);
      }
    } catch (error) {
      errorHandler(error, this.response);
    }
  }

  private GETHandler(id: string | undefined): void {
    if (id) {
      this.GETOneHandler(id);
    } else {
      this.GETAllHandler();
    }
  }

  private GETOneHandler(id: string): void {
    if (!this.response) return;

    const resultValidate = this.userService.validateId(id);

    if (!resultValidate.validate)
      throw new AppError(HttpCode.BadRequest, resultValidate.error);

    if (this.clusterMode === ClusterMode.multi && !cluster.isPrimary) {
      if (process.send) {
        const getOneUsersRequest: ClusterMessage = {
          cmd: ClusterCommands.getOneUserRequest,
          data: { id },
        };
        process.send(getOneUsersRequest);
      }
    } else {
      const user = this.userService.getOne(id);
      if (!user) throw new AppError(HttpCode.NotFound, Messages.UserNotFound);

      this.sendResponse(HttpCode.Ok, this.response, user);
    }
  }

  private GETAllHandler(): void {
    if (!this.response) return;

    if (this.clusterMode === ClusterMode.multi && !cluster.isPrimary) {
      if (process.send) {
        const getAllUsersRequest: ClusterMessage = {
          cmd: ClusterCommands.getAllUsersRequest,
        };
        process.send(getAllUsersRequest);
      }
    } else {
      const users = this.userService.getAll();
      this.sendResponse(HttpCode.Ok, this.response, users);
    }
  }

  private async POSTHandler(request: IncomingMessage): Promise<void> {
    if (!this.response) return;

    const body = await this.getBody(request);
    const resultValidate = this.userService.validateBody(body);

    if (!resultValidate.validate)
      throw new AppError(HttpCode.BadRequest, resultValidate.error);

    if (resultValidate.body) {
      if (this.clusterMode === ClusterMode.multi && !cluster.isPrimary) {
        if (process.send) {
          const createUserRequest: ClusterMessage = {
            cmd: ClusterCommands.createUserRequest,
            data: { body: resultValidate.body },
          };

          process.send(createUserRequest);
        }
      } else {
        const result = this.userService.create(resultValidate.body);
        this.sendResponse(HttpCode.Created, this.response, result);
      }
    }
  }

  private async PUTHandler(
    id: string | undefined,
    request: IncomingMessage
  ): Promise<void> {
    if (!this.response) return;

    const resultValidateId = this.userService.validateId(id);

    if (!resultValidateId.validate)
      throw new AppError(HttpCode.BadRequest, resultValidateId.error);

    const body = await this.getBody(request);

    const resultValidateBody = this.userService.validateBody(body);

    if (!resultValidateBody.validate)
      throw new AppError(HttpCode.BadRequest, resultValidateBody.error);

    if (resultValidateBody.body) {
      if (this.clusterMode === ClusterMode.multi && !cluster.isPrimary) {
        if (process.send) {
          const updateUserRequest: ClusterMessage = {
            cmd: ClusterCommands.updateUserRequest,
            data: { id, body: resultValidateBody.body },
          };

          process.send(updateUserRequest);
        }
      } else {
        const result = this.userService.update(id!, resultValidateBody.body);
        if (!result) throw new AppError(HttpCode.NotFound, Messages.UserNotFound);

        this.sendResponse(HttpCode.Ok, this.response, result);
      }
    }
  }

  private DELETEHandler(id: string | undefined): void {
    if (!this.response) return;

    const resultValidate = this.userService.validateId(id);

    if (!resultValidate.validate)
      throw new AppError(HttpCode.BadRequest, resultValidate.error);

    if (this.clusterMode === ClusterMode.multi && !cluster.isPrimary) {
      if (process.send) {
        const deleteUserRequest: ClusterMessage = {
          cmd: ClusterCommands.deleteUserRequest,
          data: { id },
        };

        process.send(deleteUserRequest);
      }
    } else {
      const result = this.userService.delete(id!);
      if (!result) throw new AppError(HttpCode.NotFound, Messages.UserNotFound);

      this.sendResponse(HttpCode.NoContent, this.response);
    }
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
