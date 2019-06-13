const audioconcat = require('audioconcat')
const debug = require('debug')('app:util:concat')

module.exports = async function(input, output) {
  if (!Array.isArray(input)) return

  return new Promise((resove, reject) => {
    audioconcat(input)
      .concat(output)
      .on('start', function(command) {
        debug('ffmpeg process started:', command)
      })
      .on('error', function(err, stdout, stderr) {
        debug('ffmpeg stderr:', stderr)
        reject(err)
      })
      .on('end', function() {
        debug('Audio created in:', output)
        resove()
      })
  })
}
