import * as uuid from 'uuid';

import { User } from '../entity';
import { usersDB } from './db';

export class UserService {
  private users = usersDB;

  public getAll(): User[] {
    return this.users;
  }

  public getOne(userId: string): User | undefined {
    return this.users.find(({ id }) => id === userId);
  }

  public create({ username, age, hobbies }: Omit<User, 'id'>): User {
    const newUser: User = { id: uuid.v4(), username, age, hobbies };
    this.users.push(newUser);
    return newUser;
  }

  public update(userId: string, body: Omit<User, 'id'>): User | undefined {
    const foundUser = this.users.find(({ id }) => id === userId);

    if (!foundUser) return foundUser;

    Object.assign(foundUser, body);

    return foundUser;
  }

  public delete(userId: string): boolean {
    const index = this.users.findIndex(({ id }) => id === userId);

    if (index === -1) return false;

    this.users.splice(index, 1);

    return true;
  }
}
