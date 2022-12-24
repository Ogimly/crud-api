import request from 'supertest';
import * as uuid from 'uuid';

import { app } from '../src/index';
import { User } from '../src/users/entity';
import { Endpoints, HttpCode, Messages } from '../src/app/enums';

const server = app.server;
const userEndpoint = Endpoints.users;
const headerContentType = 'content-type';
const applicationJSON = 'application/json';

afterAll(() => {
  server.close();
});

describe('1. Test CRUD operations - successfully', () => {
  let expectedUser: User = {
    id: '',
    username: 'Leo',
    age: 30,
    hobbies: ['js', 'ts'],
  };

  it('Should get empty array on start', async () => {
    const { body: users, statusCode, header } = await request(server).get(userEndpoint);

    expect(statusCode).toBe(HttpCode.Ok);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(users).toHaveLength(0);
  });

  it('Should create new user and return it', async () => {
    let postBody = {} as Omit<User, 'id'>;
    Object.assign(postBody, expectedUser);

    const {
      body: newUser,
      statusCode,
      header,
    } = await request(server).post(userEndpoint).send(postBody);

    expectedUser.id = newUser.id;

    expect(statusCode).toBe(HttpCode.Created);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(newUser).toMatchObject(expectedUser);
  });

  it('Should get array with created user', async () => {
    const { body: users, statusCode, header } = await request(server).get(userEndpoint);

    const expectedUsers: User[] = [expectedUser];

    expect(statusCode).toBe(HttpCode.Ok);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(users).toHaveLength(1);
    expect(users).toMatchObject(expectedUsers);
  });

  it('Should get created user by id', async () => {
    const {
      body: user,
      statusCode,
      header,
    } = await request(server).get(`${userEndpoint}/${expectedUser.id}`);

    expect(statusCode).toBe(HttpCode.Ok);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(user).toStrictEqual(expectedUser);
  });

  it('Should update created user and return it', async () => {
    const putBody: Omit<User, 'id'> = {
      username: 'Lea',
      age: 33,
      hobbies: ['sql'],
    };

    const {
      body: user,
      statusCode,
      header,
    } = await request(server).put(`${userEndpoint}/${expectedUser.id}`).send(putBody);

    Object.assign(expectedUser, putBody);

    expect(statusCode).toBe(HttpCode.Ok);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(user).toStrictEqual(expectedUser);
  });

  it('Should delete created user and return empty body', async () => {
    const { body, statusCode, header } = await request(server).delete(
      `${userEndpoint}/${expectedUser.id}`
    );

    expect(statusCode).toBe(HttpCode.NoContent);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toBe('');
  });

  it('Should return error message if user not found', async () => {
    const { body, statusCode, header } = await request(server).get(
      `${userEndpoint}/${expectedUser.id}`
    );

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.UserNotFound });
  });

  it('Should get empty array after delete user', async () => {
    const { body: users, statusCode, header } = await request(server).get(userEndpoint);

    expect(statusCode).toBe(HttpCode.Ok);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(users).toHaveLength(0);
  });
});

describe('2. Test CRUD operations - not found', () => {
  const putBody: Omit<User, 'id'> = {
    username: 'Lea',
    age: 33,
    hobbies: ['sql'],
  };

  const id = uuid.v4();

  it('Should return error message if endpoint is empty', async () => {
    const { body, statusCode, header } = await request(server).get('');

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.RouteNotFound });
  });

  it('Should return error message if user endpoint is wrong', async () => {
    const { body, statusCode, header } = await request(server).get(
      `${userEndpoint}/id/smthg`
    );

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.RouteNotFound });
  });

  it('Should return error message if user not found', async () => {
    const { body, statusCode, header } = await request(server).get(
      `${userEndpoint}/${id}`
    );

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.UserNotFound });
  });

  it('Should return error message if user not found on update', async () => {
    const { body, statusCode, header } = await request(server)
      .put(`${userEndpoint}/${id}`)
      .send(putBody);

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.UserNotFound });
  });

  it('Should return error message if user not found on delete', async () => {
    const { body, statusCode, header } = await request(server).delete(
      `${userEndpoint}/${id}`
    );

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.UserNotFound });
  });
});
