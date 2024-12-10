module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/types.jsdoc.js'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      lines: 100,
      statements: 100
    }
  },
  testPathIgnorePatterns: [
    '<rootDir>/jest.setup.js'
  ],
  reporters: [
    'default',
    'jest-junit'
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    './test/jest.setup.js'
  ]
}
