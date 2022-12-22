import { ServerResponse } from 'http';

import { CONTENT_TYPE_JSON } from '../app/const';
import { HttpCode } from '../app/enums';

export const sendOk = (response: ServerResponse, result: unknown): void => {
  response.writeHead(HttpCode.Ok, CONTENT_TYPE_JSON);
  response.end(JSON.stringify(result));
};
