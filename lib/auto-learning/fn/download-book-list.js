const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')
const symbols = require('log-symbols')
const dl = require('dl-vampire')
const ms = require('ms')
const pmap = require('promise.map')
const debug = require('debug')('app:lushang:fn:download-book')
const Api = require('../api/index.js')
const concat = require('../../util/concat.js')
const {getFullIndexStr} = require('../../util/array-util.js')
const {secureFilepath} = require('../../util/file-util.js')
const tryDownloadBook = require('./try-download-book.js')
const DurationUtil = require('../../util/duration-util.js')

module.exports = async function downloadBookList({api, id, baseDir = 'list'}) {
  const bookListStart = Date.now()

  const [bookListInfo, bookListDetail] = await Promise.all([
    api.bookListInfo(id),
    api.bookListDetail(id),
  ])

  const listId = bookListInfo.listId
  const listName = bookListInfo.name
  const dir = secureFilepath(`${baseDir}/${listId + '-' + listName}`)

  // book-list-info.json
  {
    const filepath = `${dir}/book-list-info.json`
    await fs.outputJson(filepath, bookListInfo, {spaces: 2})
  }

  // book-list-detail.json
  {
    const filepath = `${dir}/book-list-detail.json`
    await fs.outputJson(filepath, bookListDetail, {spaces: 2})
  }

  // content.txt
  {
    const filepath = `${dir}/content.txt`
    let content = ''

    // 书介绍
    content += bookListInfo.intro + '\n'
    content += '\n'

    // 目录
    bookListDetail.forEach(book => {
      const bookId = book.bookId
      const bookName = book.bookName

      content += `${bookId}-${bookName}\n`
      content += book.slogan + '\n'
      content += '\n'
    })

    await fs.outputFile(filepath, content)
  }

  const books = bookListDetail
  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    const getDuration = DurationUtil.start()

    // 下载书
    // detail 中的 book sectionList title 为空...
    // await downloadBook({ id: book.bookId, api, book })
    let mp3
    try {
      mp3 = await tryDownloadBook({id: book.bookId, api})
    } catch (e) {
      console.error(`${symbols.error} 书籍下载失败`)
      console.error(e.stack || e)
      continue
    }

    // 复制到当前
    const filename = path.basename(mp3)
    const newpath = `${dir}/${filename}`
    await fs.copy(mp3, newpath)

    // duration
    const dur = getDuration()
    console.log(`${symbols.success} 书籍下载完成, 耗时${dur}`)
  }
}
