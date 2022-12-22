import { App } from './app/app';
import { Controller } from './controller/controller';

const app = new App(new Controller());
app.start();
