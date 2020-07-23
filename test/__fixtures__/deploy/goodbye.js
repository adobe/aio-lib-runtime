
/** @private */
function main (params) {
  const msg = 'Goodbye ' + params.name + ', ' + params.message + '.'
  return { msg }
}

module.exports.main = main
