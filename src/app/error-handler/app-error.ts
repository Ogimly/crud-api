import { ServerResponse } from 'http';

import { CONTENT_TYPE_JSON } from '../const';

export class AppError extends Error {
  constructor(private code: number, public message: string) {
    super();
  }

  public sentError(response: ServerResponse): void {
    response.writeHead(this.code, CONTENT_TYPE_JSON);
    response.end(JSON.stringify({ message: this.message }));
  }
}
