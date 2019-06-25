#!/usr/bin/env node

require('log-reject-error')()
const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')
const symbols = require('log-symbols')
const dl = require('dl-vampire')
const ms = require('ms')
const yargs = require('yargs')
const pmap = require('promise.map')
const humanizeDuration = require('humanize-duration')
const debug = require('debug')('app:lushang')
const pretry = require('promise.retry')
const Api = require('./api/index.js')
const concat = require('../util/concat.js')
const {getFullIndexStr} = require('../util/array-util.js')
const {secureFilepath} = require('../util/file-util.js')
const DurationUtil = require('../util/duration-util.js')

// enable debug log
require('debug').enable('app:*')

// mark download start
const start = Date.now()

const argv = yargs
  .alias({
    h: 'help',
  })
  .command(
    'book <id> [options]',
    '下载书籍',
    yargs => {
      return yargs.positional('id', {
        describe: '书籍ID',
        type: 'number',
      })
    },
    argv => bookHandler(argv)
  )
  .command(
    'list <id> [options]',
    '下载书单',
    yargs => {
      return yargs.positional('id', {
        describe: '书单ID',
        type: 'number',
      })
    },
    argv => bookListHandler(argv)
  )
  .command('featured-book-list', '精选书单', yargs => yargs, argv => featuredBookListHandler(argv))
  .command('serial-book-list', '系列连载', yargs => yargs, argv => serialBookListHandler(argv))
  .commandDir('commands')
  .option({
    'session-id': {
      type: 'string',
      // required: true,
      describe: 'sessionId',
      default: '1809308,d1a474a8-de07-4a6f-b74e-b1ccd27863b6',
    },
  })
  .demandCommand()
  .help().argv

const {downloadBook, tryDownloadBook} = require('./fn/index.js')

async function downloadBookList({api, id, baseDir = 'list'}) {
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
    const bookStart = Date.now()

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
    const dur = humanizeDuration(Date.now() - bookStart, {language: 'zh_CN'})
    console.log(`${symbols.success} 书籍下载完成, 耗时${dur}`)
  }
}

async function bookHandler(argv) {
  debug('argv = %O', argv)
  const {sessionId, id} = argv
  const api = new Api({sessionId})

  // book
  await downloadBook({api, id})

  // duration
  const dur = humanizeDuration(Date.now() - start, {language: 'zh_CN'})
  console.log('下载完成, 耗时%s', dur)
}

async function bookListHandler(argv) {
  debug('argv = %O', argv)
  const {sessionId, id} = argv
  const api = new Api({sessionId})

  // 下载书单
  await downloadBookList({api, id})

  // duration
  const dur = humanizeDuration(Date.now() - start, {language: 'zh_CN'})
  console.log('全部下载完成 , 耗时%s', dur)
}

async function featuredBookListHandler(argv) {
  debug('argv = %O', argv)
  const {sessionId, id} = argv
  const api = new Api({sessionId})

  // 2=精选书单
  const baseDir = '精选书单'
  const arr = await api.bookListAll(2)

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    const {listId: id, name} = item
    const bookListStart = Date.now()

    // download book list
    await downloadBookList({api, id, baseDir})

    // duration
    const dur = humanizeDuration(Date.now() - bookListStart, {language: 'zh_CN'})
    const fullIndexStr = getFullIndexStr({arr, index: i})
    console.log('---------------------')
    console.log('书单 (%s) (%s)下载完成 , 耗时%s', fullIndexStr, name, dur)
    console.log('---------------------')
  }

  // duration
  const dur = humanizeDuration(Date.now() - start, {language: 'zh_CN'})
  console.log('全部下载完成 , 耗时%s', dur)
}

async function serialBookListHandler(argv) {
  debug('argv = %O', argv)
  const {sessionId, id} = argv
  const api = new Api({sessionId})

  // 4=系列连载
  const baseDir = '系列连载'
  const arr = await api.bookListAll(4)

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    const {listId: id, name} = item
    const bookListStart = Date.now()

    // download book list
    await downloadBookList({api, id, baseDir})

    // duration
    const dur = humanizeDuration(Date.now() - bookListStart, {language: 'zh_CN'})
    const fullIndexStr = getFullIndexStr({arr, index: i})
    console.log('---------------------')
    console.log('书单 (%s) (%s)下载完成 , 耗时%s', fullIndexStr, name, dur)
    console.log('---------------------')
  }

  // duration
  const dur = humanizeDuration(Date.now() - start, {language: 'zh_CN'})
  console.log('全部下载完成 , 耗时%s', dur)
}
