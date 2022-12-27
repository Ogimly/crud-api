import { Worker } from 'cluster';
import { User } from '../users/entity';

export type ClusterMessage = {
  cmd: string;
  data?: {
    port?: number;
    isPrimary?: boolean;
    users?: User[];
  };
};

export type ClusterWorker = {
  worker: Worker;
  isPrimary: boolean;
  id: number;
  port: number;
};
