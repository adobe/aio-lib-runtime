module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    './src/**/*.js'
  ],
  rootDir: '../',
  setupFilesAfterEnv: [
    './e2e/jest.setup.js'
  ],
  testEnvironment: 'node',
  testRegex: './e2e/e2e.js'
}
