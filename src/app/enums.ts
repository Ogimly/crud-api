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
  UnknownMethod = 'Unknown method',
  invalidId = 'ID is invalid',
}

export const enum Endpoints {
  users = '/api/users',
}
