const { fs } = require('memfs')

module.exports = {
  ...jest.requireActual('fs-extra'),
  // fix for "TypeError: Class constructors cannot be invoked without 'new'" - fs-extra and memfs don't mix well
  ...fs,
  // fix for "(node:35530) [fs-extra-WARN0003] Warning: fs.realpath.native is not a function. Is fs being monkey-patched?"
  realpath: jest.requireActual('fs').realpath
}
