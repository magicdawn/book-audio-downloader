const pretry = require('promise.retry')
const downloadBook = require('./download-book.js')

const tryDownloadBook = pretry(downloadBook, {
  times: 5,
  onerror(err, i) {
    console.log('[tryDownloadBook] i = %s', i)
    console.error(err.stack || err)
  },
})
module.exports = tryDownloadBook
