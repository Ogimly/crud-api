import { User } from '../entity';
import { usersDB } from './db';

export class UserService {
  private users = usersDB;

  public getAllUsers(): User[] {
    return this.users;
  }

  public getUserById(userId: string): User | null {
    const res = this.users.find(({ id }) => id === userId);

    return res || null;
  }
}
