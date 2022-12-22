import * as uuid from 'uuid';

import { User } from '../entity';
import { usersDB } from './db';

export class UserService {
  private users = usersDB;

  public validateId(id: string): boolean {
    return uuid.validate(id);
  }

  public getAllUsers(): User[] {
    return this.users;
  }

  public getUserById(userId: string): User | null {
    const found = this.users.find(({ id }) => id === userId);

    return found || null;
  }
}
