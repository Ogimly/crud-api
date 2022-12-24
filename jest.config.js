/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts)?$': 'ts-jest',
  },
  testMatch: ['**/tests/**/*.spec.ts'],
  transformIgnorePatterns: ['./node_modules/'],
};
