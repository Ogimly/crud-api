import { App } from './app/app';
import { UserService } from './users/in-memory-db/service';
import { Router } from './app/router';
import { UserController } from './users/controller';

const userService = new UserService();

const userController = new UserController(userService);

const router = new Router(userController);

export const app = new App(router);

app.start();
