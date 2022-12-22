import { ServerResponse } from 'http';

import { HttpCode, Messages } from '../enums';
import { AppError } from './app-error';

export const errorHandler = (error: unknown, response: ServerResponse): void => {
  if (error instanceof AppError) {
    error.sentError(response);
  } else {
    console.log(error);
    new AppError(HttpCode.InternalServerError, Messages.InternalServerError).sentError(
      response
    );
  }
};
