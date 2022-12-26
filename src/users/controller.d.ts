import { User } from './entity';

export type ResultValidate = {
  validate: boolean;
  error: string;
  body?: Omit<User, 'id'>;
};
