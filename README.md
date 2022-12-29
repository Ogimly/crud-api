# CRUD API

This task implement simple CRUD API using in-memory database underneath and load balancer.

[Assignment](https://github.com/AlreadyBored/nodejs-assignments/blob/main/assignments/crud-api/assignment.md)

[Scoring](https://github.com/AlreadyBored/nodejs-assignments/blob/main/assignments/crud-api/score.md)

## Technologies:

- Node.js version: 18 LTS
- TypeScript
- ESLint
- Prettier
- Jest
- supertest
- nodemon
- webpack

## Install

Clone repository

```
git clone https://github.com/Ogimly/crud-api.git
```

Install dependencies

```
npm i
```

Switch to branch `develop`

```
git checkout develop
```

## Run the application

Development mode

```
npm run start:dev
```

Production mode

```
npm run start:prod
```

Cluster mode (on development mode)

```
npm run start:multi
```

Cluster mode (on production mode)

```
npm run start:prod:multi
```

Run tests

```
npm test
```

Run ESLint

```
npm lint
```

## API

Users endpoint: `api/users`

User entity:

```
{
  id: string;         // unique identifier (uuid)
  username: string;   // user's name (required)
  age: number;        // user's age (required)
  hobbies: string[];  // user's hobbies (required)
}
```

Get all users: `GET api/users`

Get user by id : `GET api/users/{userId}`

Create new user and store it in database: `POST api/users`

Update existing user: `PUT api/users/{userId}`

Delete existing user from database: `DELETE api/users/{userId}`

## Load balancer

Load balancer run and is listening for requests on `localhost:4000`

Workers run are listening for requests from load balancer on `localhost:4001` `localhost:4002` `localhost:4003` etс.

When user sends request to `localhost:4000`, load balancer sends this request to `localhost:4001`, next user request is sent to `localhost:4002` and so on. After sending request to last wotker load balancer starts from the first worker again (`localhost:4001`)

State of db should be consistent between different workers.

The console displays the process of run workers and redirecting requests from the load balancer to workers
![image](https://user-images.githubusercontent.com/101447709/210016666-1b3d137f-6cba-4dc7-9064-884b8b6b4c05.png)
