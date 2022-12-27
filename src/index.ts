import { App } from './app/app';
import { DEFAULT_CLUSTER_MODE } from './app/const';

const clusterMode = process.env.CLUSTER_MODE ?? DEFAULT_CLUSTER_MODE;

export const app = new App(clusterMode);

app.start();
