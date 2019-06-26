const pretry = require('promise.retry')

const downloadBook = require('./download-book.js')
const tryDownloadBook = require('./try-download-book.js')
const downloadBookList = require('./download-book-list.js')

Object.assign(module.exports, {
  downloadBook,
  tryDownloadBook,
  downloadBookList,
})
