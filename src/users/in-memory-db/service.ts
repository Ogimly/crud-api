import * as uuid from 'uuid';

import { User } from '../entity';
import { usersDB } from './db';
import { ResultValidate } from '../controller.d';
import { Messages } from '../../app/enums';

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

  public validateId(id: string | undefined): ResultValidate {
    if (!id) return { validate: false, error: Messages.IdEmpty };
    return { validate: uuid.validate(id), error: Messages.IdInvalid };
  }

  public validateBody(body: Partial<User>): ResultValidate {
    let validate = true;
    const errors: string[] = [];

    if (!body) {
      validate = false;
      errors.push(Messages.BodyEmpty);
    }

    if (!body.username) {
      validate = false;
      errors.push(Messages.UsernameEmpty);
    }

    if (!body.age) {
      validate = false;
      errors.push(Messages.AgeEmpty);
    } else if (isNaN(+body.age)) {
      validate = false;
      errors.push(Messages.AgeNotNumber);
    }

    if (!body.hobbies) {
      validate = false;
      errors.push(Messages.HobbiesEmpty);
    }
    if (!Array.isArray(body.hobbies)) {
      validate = false;
      errors.push(Messages.HobbiesNotArray);
    }

    if (!validate) return { validate, error: errors.join(', ') };

    const validatedBody: Omit<User, 'id'> = {
      username: body.username!.toString(),
      age: +body.age!,
      hobbies: body.hobbies!.map((hobby) => hobby.toString()),
    };

    return { validate, error: '', body: validatedBody };
  }
}
