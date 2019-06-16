const m3u8 = require('m3u8')
const fs = require('fs')

module.exports = async filepath => {
  const parser = m3u8.createStream()
  const fileStream = fs.createReadStream(filepath)

  return new Promise((resolve, reject) => {
    fileStream
      .on('error', reject)
      .pipe(parser)
      .on('error', reject)

    parser.on('item', function(item) {
      // emits PlaylistItem, MediaItem, StreamItem, and IframeStreamItem
    })
    parser.on('m3u', function(m3u) {
      // fully parsed m3u file
      resolve(m3u)
    })
  })
}
