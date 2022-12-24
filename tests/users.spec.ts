import request from 'supertest';
import * as uuid from 'uuid';

import { app } from '../src/index';
import { User } from '../src/users/entity';
import { Endpoints, HttpCode, Messages } from '../src/app/enums';

const server = app.server;
const userEndpoint = Endpoints.users;

let expectedUser: User = {
  id: '',
  username: 'Leo',
  age: 30,
  hobbies: ['js', 'ts'],
};

describe('Test CRUD operations - successfully', () => {
  it('Should get empty array on start', async () => {
    const { body: users, statusCode } = await request(server).get(userEndpoint);

    expect(statusCode).toBe(HttpCode.Ok);
    expect(users).toHaveLength(0);
  });

  it('Should create new user and return it', async () => {
    let postBody = {} as Omit<User, 'id'>;
    Object.assign(postBody, expectedUser);

    const { body: newUser, statusCode } = await request(server)
      .post(userEndpoint)
      .send(postBody);

    expectedUser.id = newUser.id;

    expect(statusCode).toBe(HttpCode.Created);
    expect(newUser).toMatchObject(expectedUser);
  });

  it('Should get array with created user', async () => {
    const { body: users, statusCode } = await request(server).get(userEndpoint);

    const expectedUsers: User[] = [expectedUser];

    expect(statusCode).toBe(HttpCode.Ok);
    expect(users).toHaveLength(1);
    expect(users).toMatchObject(expectedUsers);
  });

  it('Should get created user by id', async () => {
    const { body: user, statusCode } = await request(server).get(
      `${userEndpoint}/${expectedUser.id}`
    );

    expect(statusCode).toBe(HttpCode.Ok);
    expect(user).toStrictEqual(expectedUser);
  });

  it('Should update created user and return it', async () => {
    const putBody: Omit<User, 'id'> = {
      username: 'Lea',
      age: 33,
      hobbies: ['sql'],
    };

    const { body: user, statusCode } = await request(server)
      .put(`${userEndpoint}/${expectedUser.id}`)
      .send(putBody);

    Object.assign(expectedUser, putBody);

    expect(statusCode).toBe(HttpCode.Ok);
    expect(user).toStrictEqual(expectedUser);
  });

  it('Should delete created user and return empty body', async () => {
    const { body, statusCode } = await request(server).delete(
      `${userEndpoint}/${expectedUser.id}`
    );

    expect(statusCode).toBe(HttpCode.NoContent);
    expect(body).toBe('');
  });

  it('Should return error message if user not found', async () => {
    const { body, statusCode } = await request(server).get(
      `${userEndpoint}/${expectedUser.id}`
    );

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(body).toStrictEqual({ message: Messages.UserNotFound });
  });

  it('Should get empty array after delete user', async () => {
    const { body: users, statusCode } = await request(server).get(userEndpoint);

    expect(statusCode).toBe(HttpCode.Ok);
    expect(users).toHaveLength(0);
  });
});
