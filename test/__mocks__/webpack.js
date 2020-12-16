
const webpackMock = {
  run: jest.fn()
}

const webpack = jest.fn(() => webpackMock)

webpack.DefinePlugin = jest.fn(def => def)

webpack.webpackMock = webpackMock

const webpackStatsMock = {
  toJson: jest.fn(),
  hasErrors: jest.fn(),
  hasWarnings: jest.fn()
}

webpackMock.mockReset = () => {
  // webpackMock.mockClear()
  webpackMock.run.mockReset()
  webpackMock.run.mockImplementation(cb => cb(null, webpackMock.webpackStatsMock))
  webpackStatsMock.toJson.mockReset()
  webpackStatsMock.hasErrors.mockReset()
  webpackStatsMock.hasWarnings.mockReset()
}

webpackMock.webpackStatsMock = webpackStatsMock

module.exports = webpack
