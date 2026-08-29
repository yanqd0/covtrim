'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/jest/**/*.test.js'],
  collectCoverageFrom: ['src/math.js'],
  coverageReporters: ['lcov'],
};
