import http from 'http';

import { BASE_URL, PORT } from './const';

export const app = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      data: 'Hello World!',
    })
  );
});

export const start = () => {
  app.listen(PORT, () => {
    console.log(`Server running at ${BASE_URL}:${PORT}/`);
  });
};
