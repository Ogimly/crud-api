export const enum HttpCode {
  Ok = 200,
  Created = 201,
  NoContent = 204,
  BadRequest = 400,
  NotFound = 404,
  InternalServerError = 500,
}

export const enum HttpMethods {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export const enum Messages {
  InternalServerError = 'Internal Server Error',
  RouteNotFound = 'Route not found',
  UserNotFound = 'User not found',
  UnknownMethod = 'Unknown method',
  JSONInvalid = 'JSON is invalid',
  IdEmpty = 'ID is empty',
  IdInvalid = 'ID is invalid',
  BodyEmpty = 'Body is empty',
  BodyInvalid = 'Body is invalid',
  UsernameEmpty = 'Username is empty',
  AgeEmpty = 'Age is empty',
  AgeNotNumber = 'Age is not number',
  HobbiesEmpty = 'Hobbies is not define',
  HobbiesNotArray = 'Hobbies is not array',
}

export const enum Endpoints {
  users = '/api/users',
}
