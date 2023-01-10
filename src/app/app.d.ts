import { User } from '../users/entity';

export type ClusterMessage = {
  cmd: string;
  data?: {
    port?: number;
    isBalancer?: boolean;
    users?: User[];
    workers?: ClusterWorker[];
    id?: string;
    user?: User;
    body?: Omit<User, 'id'>;
    ok?: boolean;
  };
};

export type ClusterWorker = {
  isBalancer: boolean;
  id: number;
  port: number;
};
