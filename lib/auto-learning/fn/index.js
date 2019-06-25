const pretry = require('promise.retry')

const downloadBook = require('./download-book.js')
const tryDownloadBook = pretry(downloadBook, {
  times: 5,
  onerror(err, i) {
    console.log('[tryDownloadBook] i = %s', i)
    console.error(err.stack || err)
  },
})

Object.assign(module.exports, {
  downloadBook,
  tryDownloadBook,
})
