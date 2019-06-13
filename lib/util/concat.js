const audioconcat = require('audioconcat')

module.exports = async function(input, output) {
  if (!Array.isArray(input)) return

  return new Promise((resove, reject) => {
    audioconcat(input)
      .concat(output)
      .on('start', function(command) {
        console.log('ffmpeg process started:', command)
      })
      .on('error', function(err, stdout, stderr) {
        console.error('Error:', err)
        console.error('ffmpeg stderr:', stderr)
        reject(err)
      })
      .on('end', function(output) {
        console.log('Audio created in:', output)
        resove()
      })
  })
}
