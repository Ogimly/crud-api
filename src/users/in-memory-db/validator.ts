import * as uuid from 'uuid';

import { User } from '../entity';
import { ResultValidate } from '../controller.d';
import { Messages } from '../../app/enums';

export class UserValidator {
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

    if (!body.age && body.age !== 0) {
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
    } else {
      if (!body.hobbies?.every((hobby) => typeof hobby === 'string')) {
        validate = false;
        errors.push(Messages.HobbiesNotStringArray);
      }
    }

    if (!validate) return { validate, error: errors.join(', ') };

    const validatedBody: Omit<User, 'id'> = {
      username: body.username!.toString(),
      age: +body.age!,
      hobbies: body.hobbies!,
    };
    return { validate, error: '', body: validatedBody };
  }
}
