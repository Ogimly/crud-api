import { User } from '../users/entity';

export type ClusterMessage = {
  cmd: string;
  data?: {
    port?: number;
    isBalancer?: boolean;
    users?: User[];
    workers?: ClusterWorker[];
  };
};

export type ClusterWorker = {
  isBalancer: boolean;
  id: number;
  port: number;
};
