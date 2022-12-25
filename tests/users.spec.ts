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

  it('Should get an array with created user', async () => {
    const { body: users, statusCode, header } = await request(server).get(userEndpoint);

    const expectedUsers: User[] = [expectedUser];

    expect(statusCode).toBe(HttpCode.Ok);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(users).toHaveLength(1);
    expect(users).toMatchObject(expectedUsers);
  });

  it('Should get created user with a specific id', async () => {
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

  it('Should return an error message if the user not found with a specific id', async () => {
    const { body, statusCode, header } = await request(server).get(
      `${userEndpoint}/${expectedUser.id}`
    );

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.UserNotFound });
  });

  it('Should get empty array after deleting a user', async () => {
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

  it('Should return an error message if the endpoint is empty', async () => {
    const { body, statusCode, header } = await request(server).get('');

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.RouteNotFound });
  });

  it('Should return an error message if the endpoint is not existing', async () => {
    const { body, statusCode, header } = await request(server).get('/some-non/existing');

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.RouteNotFound });
  });

  it('Should return an error message if the user endpoint is invalid', async () => {
    const { body, statusCode, header } = await request(server).get(
      `${userEndpoint}/id/smthg`
    );

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.RouteNotFound });
  });

  it('Should return an error message if the user not found with a specific id', async () => {
    const { body, statusCode, header } = await request(server).get(
      `${userEndpoint}/${id}`
    );

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.UserNotFound });
  });

  it('Should return an error message if the user not found when updating the user', async () => {
    const { body, statusCode, header } = await request(server)
      .put(`${userEndpoint}/${id}`)
      .send(putBody);

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.UserNotFound });
  });

  it('Should return an error message if the user not found when deleting the user', async () => {
    const { body, statusCode, header } = await request(server).delete(
      `${userEndpoint}/${id}`
    );

    expect(statusCode).toBe(HttpCode.NotFound);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.UserNotFound });
  });
});

describe('3. Test CRUD operations - bad request', () => {
  const wrongId = uuid.v4() + '1';

  it('Should return an error message if the method is not implemented', async () => {
    const { body, statusCode, header } = await request(server).patch(userEndpoint);

    expect(statusCode).toBe(HttpCode.BadRequest);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.UnknownMethod });
  });

  it('Should return an error message if the POST method with id', async () => {
    const { body, statusCode, header } = await request(server).post(
      `${userEndpoint}/${wrongId}`
    );

    expect(statusCode).toBe(HttpCode.BadRequest);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.RouteInvalid });
  });

  it('Should return an error message if the id is not uuid when getting the user', async () => {
    const { body, statusCode, header } = await request(server).get(
      `${userEndpoint}/${wrongId}`
    );

    expect(statusCode).toBe(HttpCode.BadRequest);
    expect(header[headerContentType]).toEqual(applicationJSON);
    expect(body).toStrictEqual({ message: Messages.IdInvalid });
  });

  describe('Creating the user', () => {
    const postBody: Omit<User, 'id'> = {
      username: 'Leo',
      age: 30,
      hobbies: ['js', 'ts'],
    };

    it('Should return an error message if the the body is empty', async () => {
      const wrongBody = JSON.stringify('');

      const { body, statusCode, header } = await request(server)
        .post(userEndpoint)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({
        message: [
          Messages.BodyEmpty,
          Messages.UsernameEmpty,
          Messages.AgeEmpty,
          Messages.HobbiesEmpty,
          Messages.HobbiesNotArray,
        ].join(', '),
      });
    });

    it('Should return an error message if the the username is empty', async () => {
      const wrongBody: any = { ...postBody };
      wrongBody.username = undefined;

      const { body, statusCode, header } = await request(server)
        .post(userEndpoint)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.UsernameEmpty });
    });

    it('Should return an error message if the the age is empty', async () => {
      const wrongBody: any = { ...postBody };
      wrongBody.age = undefined;

      const { body, statusCode, header } = await request(server)
        .post(userEndpoint)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.AgeEmpty });
    });

    it('Should return an error message if the the age is not number', async () => {
      const wrongBody: any = { ...postBody };
      wrongBody.age = 'age';

      const { body, statusCode, header } = await request(server)
        .post(userEndpoint)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.AgeNotNumber });
    });

    it('Should create the user if the age is 0', async () => {
      const wrongBody: any = { ...postBody };
      wrongBody.age = 0;

      const { body, statusCode, header } = await request(server)
        .post(userEndpoint)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.Created);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body.age).toStrictEqual(wrongBody.age);
    });

    it('Should create new user if the age is as number', async () => {
      const wrongBody: any = { ...postBody };
      wrongBody.age = '44';

      const { body, statusCode, header } = await request(server)
        .post(userEndpoint)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.Created);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body.age).toStrictEqual(+wrongBody.age);
    });

    it('Should return an error message if the the hobbies is empty', async () => {
      const wrongBody: any = { ...postBody };
      wrongBody.hobbies = undefined;

      const { body, statusCode, header } = await request(server)
        .post(userEndpoint)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({
        message: [Messages.HobbiesEmpty, Messages.HobbiesNotArray].join(', '),
      });
    });

    it('Should return an error message if the the hobbies is not array', async () => {
      const wrongBody: any = { ...postBody };
      wrongBody.hobbies = 'hobbies';

      const { body, statusCode, header } = await request(server)
        .post(userEndpoint)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.HobbiesNotArray });
    });

    it('Should return an error message if the hobbies is not string array', async () => {
      const wrongBody: any = { ...postBody };
      wrongBody.hobbies = [22, 'true'];

      const { body, statusCode, header } = await request(server)
        .post(userEndpoint)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.HobbiesNotStringArray });
    });

    it('Should create the user if the hobbies is a string array', async () => {
      const wrongBody: any = { ...postBody };
      wrongBody.hobbies = ['22', 'true'];

      const { body, statusCode, header } = await request(server)
        .post(userEndpoint)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.Created);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body.hobbies).toStrictEqual(wrongBody.hobbies);
    });
  });

  describe('Updating the user', () => {
    const postBody: Omit<User, 'id'> = {
      username: 'Leo',
      age: 30,
      hobbies: ['js', 'ts'],
    };

    const putBody: Omit<User, 'id'> = {
      username: 'Lea',
      age: 33,
      hobbies: ['sql'],
    };

    let id: string;

    it('Should create new user to test user update', async () => {
      const {
        body: newUser,
        statusCode,
        header,
      } = await request(server).post(userEndpoint).send(postBody);

      id = newUser.id;

      expect(statusCode).toBe(HttpCode.Created);
      expect(header[headerContentType]).toEqual(applicationJSON);
    });

    it('Should return an error message if the id is empty', async () => {
      const { body, statusCode, header } = await request(server).put(userEndpoint);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.IdEmpty });
    });

    it('Should return an error message if the id is not uuid', async () => {
      const { body, statusCode, header } = await request(server).put(
        `${userEndpoint}/${wrongId}`
      );

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.IdInvalid });
    });

    it('Should return an error message if the the body is empty', async () => {
      const wrongBody = JSON.stringify('');

      const { body, statusCode, header } = await request(server)
        .put(`${userEndpoint}/${id}`)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({
        message: [
          Messages.BodyEmpty,
          Messages.UsernameEmpty,
          Messages.AgeEmpty,
          Messages.HobbiesEmpty,
          Messages.HobbiesNotArray,
        ].join(', '),
      });
    });

    it('Should return an error message if the the username is empty', async () => {
      const wrongBody: any = { ...putBody };
      wrongBody.username = undefined;

      const { body, statusCode, header } = await request(server)
        .put(`${userEndpoint}/${id}`)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.UsernameEmpty });
    });

    it('Should return an error message if the the age is empty', async () => {
      const wrongBody: any = { ...putBody };
      wrongBody.age = undefined;

      const { body, statusCode, header } = await request(server)
        .put(`${userEndpoint}/${id}`)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.AgeEmpty });
    });

    it('Should update the user if the age is 0', async () => {
      const wrongBody: any = { ...putBody };
      wrongBody.age = 0;

      const { body, statusCode, header } = await request(server)
        .put(`${userEndpoint}/${id}`)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.Ok);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body.age).toStrictEqual(wrongBody.age);
    });

    it('Should return an error message if the the age is not number', async () => {
      const wrongBody: any = { ...putBody };
      wrongBody.age = 'age';

      const { body, statusCode, header } = await request(server)
        .put(`${userEndpoint}/${id}`)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.AgeNotNumber });
    });

    it('Should update the user if the age is as number', async () => {
      const wrongBody: any = { ...putBody };
      wrongBody.age = '44';

      const { body, statusCode, header } = await request(server)
        .put(`${userEndpoint}/${id}`)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.Ok);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body.age).toStrictEqual(+wrongBody.age);
    });

    it('Should return an error message if the the hobbies is empty', async () => {
      const wrongBody: any = { ...putBody };
      wrongBody.hobbies = undefined;

      const { body, statusCode, header } = await request(server)
        .put(`${userEndpoint}/${id}`)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({
        message: [Messages.HobbiesEmpty, Messages.HobbiesNotArray].join(', '),
      });
    });

    it('Should return an error message if the the hobbies is not array', async () => {
      const wrongBody: any = { ...putBody };
      wrongBody.hobbies = 'hobbies';

      const { body, statusCode, header } = await request(server)
        .put(`${userEndpoint}/${id}`)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.HobbiesNotArray });
    });

    it('Should return an error message if the hobbies is not string array', async () => {
      const wrongBody: any = { ...putBody };
      wrongBody.hobbies = [22, 'true'];

      const { body, statusCode, header } = await request(server)
        .put(`${userEndpoint}/${id}`)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.HobbiesNotStringArray });
    });

    it('Should update the user if the hobbies is a string array', async () => {
      const wrongBody: any = { ...putBody };
      wrongBody.hobbies = ['22', 'true'];

      const { body, statusCode, header } = await request(server)
        .put(`${userEndpoint}/${id}`)
        .send(wrongBody);

      expect(statusCode).toBe(HttpCode.Ok);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body.hobbies).toStrictEqual(wrongBody.hobbies);
    });
  });

  describe('Deleting the user', () => {
    it('Should return an error message if the id is empty', async () => {
      const { body, statusCode, header } = await request(server).delete(userEndpoint);

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.IdEmpty });
    });

    it('Should return an error message if the id is not uuid', async () => {
      const { body, statusCode, header } = await request(server).delete(
        `${userEndpoint}/${wrongId}`
      );

      expect(statusCode).toBe(HttpCode.BadRequest);
      expect(header[headerContentType]).toEqual(applicationJSON);
      expect(body).toStrictEqual({ message: Messages.IdInvalid });
    });
  });
});
