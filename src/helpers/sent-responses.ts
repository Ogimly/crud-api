import { ServerResponse } from 'http';

import { CONTENT_TYPE_JSON } from '../app/const';
import { HttpCode, Messages } from '../app/enums';

export const sendOk = (res: ServerResponse, result: unknown): void => {
  res.writeHead(HttpCode.Ok, CONTENT_TYPE_JSON);
  res.end(JSON.stringify(result));
};

export const sendBadRequestError = (res: ServerResponse, message: string): void => {
  res.writeHead(HttpCode.BadRequest, CONTENT_TYPE_JSON);
  res.end(JSON.stringify({ message }));
};

export const sendNotFoundError = (res: ServerResponse, message: string): void => {
  res.writeHead(HttpCode.NotFound, CONTENT_TYPE_JSON);
  res.end(JSON.stringify({ message }));
};

export const sendInternalServerError = (res: ServerResponse): void => {
  res.writeHead(HttpCode.InternalServerError, CONTENT_TYPE_JSON);
  res.end(JSON.stringify({ message: Messages.InternalServerError }));
};
