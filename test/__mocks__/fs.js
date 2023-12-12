const { fs } = require('memfs')

module.exports = {
  ...fs,
  // fix for "(node:35530) [fs-extra-WARN0003] Warning: fs.realpath.native is not a function. Is fs being monkey-patched?"
  realpath: jest.requireActual('fs').realpath // get rid of warnings
}
