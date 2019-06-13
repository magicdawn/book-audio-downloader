#!/usr/bin/env node

const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')
const symbols = require('log-symbols')
const dl = require('dl-vampire')
const yargs = require('yargs')
const filenamify = require('filenamify')
const pmap = require('promise.map')
const humanizeDuration = require('humanize-duration')
const debug = require('debug')('app:lushang')
const pretry = require('promise.retry')
const Api = require('./api/index.js')
const concat = require('../util/concat.js')

// mark download start
const start = Date.now()

const argv = yargs
  .alias({
    help: 'h',
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
    argv => {
      return bookHandler(argv)
    }
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
    argv => {
      return bookListHandler(argv)
    }
  )
  .option({
    'session-id': {
      type: 'string',
      // required: true,
      describe: 'sessionId',
      default: '1809308,d1a474a8-de07-4a6f-b74e-b1ccd27863b6',
    },
  })
  .help().argv

async function downloadBook({ api, id, book }) {
  if (!book) {
    book = await api.bookDetail(id)
  }

  const bookId = book.bookId
  const bookName = book.bookName
  const dir = `book/${filenamify(bookId + '-' + bookName)}`

  // json
  {
    const filepath = `${dir}/book.json`
    await fs.outputJson(filepath, book, { spaces: 2 })
  }

  // cover
  {
    const url = book.faceImgPlay
    const ext = await api.getExtension(url)
    const file = `${dir}/cover.${ext}`
    debug('cover = %s', url)

    await dl({ url, file })
    debug('cover downloaded: %s', file)
  }

  // 音频
  const sections = book.sectionList.map((item, index, arr) => {
    const { title, proAudioUrl, proSec } = item

    // indexStr
    const len = arr.length.toString().length
    const indexStr = _.padStart(String(index + 1), len, '0')
    const fullIndexStr = `${indexStr}/${arr.length}`

    // url
    const url = item.proAudioUrl || item.doubiAudioUrl

    // duration(秒)
    const duration = item.proSec || item.doubiSec

    return { title, url, duration, index, indexStr, fullIndexStr }
  })

  console.log(`正在下载『${bookName}』,请稍候...`)
  await pmap(
    sections,
    async item => {
      const { title, url, index, indexStr, fullIndexStr } = item

      const ext = await api.getExtension(url)
      const file = `${indexStr}-${filenamify(title)}.${ext}`
      const filepath = `${dir}/${file}`
      Object.assign(item, { file, filepath })

      try {
        dl({
          url,
          file: filepath,
          retry: {
            onerror(err, i) {
              console.log(`${symbols.warning} ${fullIndexStr}  ${i + 1}次失败 ${file}`)
            },
          },
        })
      } catch (e) {
        console.log(`${symbols.error} ${fullIndexStr} 下载失败 ${file}`)
        console.error(e.stack || e)
        return
      }

      console.log(`${symbols.success} ${fullIndexStr} 下载完成 ${file}`)
    },
    5
  )

  // 合成
  const input = sections.map(item => item.filepath)
  const output = `${dir}.mp3`
  await concat(input, output)

  // the final mp3 location
  return output
}

async function bookHandler(argv) {
  debug('argv = %O', argv)
  const { sessionId, id } = argv
  const api = new Api({ sessionId })

  // book
  await downloadBook({ api, id })

  // duration
  const dur = humanizeDuration(Date.now() - start, { language: 'zh_CN' })
  console.log('下载完成, 耗时%s', dur)
}

async function bookListHandler(argv) {
  debug('argv = %O', argv)
  const { sessionId, id } = argv

  const api = new Api({ sessionId })
  const [bookListInfo, bookListDetail] = await Promise.all([
    api.bookListInfo(id),
    api.bookListDetail(id),
  ])

  const listId = bookListInfo.listId
  const listName = bookListInfo.name
  const dir = `list/${filenamify(listId + '-' + listName)}`

  // book-list-info.json
  {
    const filepath = `${dir}/book-list-info.json`
    await fs.outputJson(filepath, bookListInfo, { spaces: 2 })
  }

  // book-list-detail.json
  {
    const filepath = `${dir}/book-list-detail.json`
    await fs.outputJson(filepath, bookListDetail, { spaces: 2 })
  }

  // content.txt
  {
    const filepath = `${dir}/content.txt`
    const content = bookListDetail
      .map(book => {
        const bookId = book.bookId
        const bookName = book.bookName
        return `${bookId}-${bookName}`
      })
      .join('\n')
    await fs.outputFile(filepath, content)
  }

  const tryDownloadBook = pretry(downloadBook, {
    times: 5,
    onerror(err, i) {
      console.log('[tryDownloadBook] i = %s', i)
      console.error(err.stack || err)
    },
  })

  const books = bookListDetail
  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    const bookStart = Date.now()

    // 下载书
    // detail 中的 book sectionList title 为空...
    // await downloadBook({ id: book.bookId, api, book })
    const mp3 = await tryDownloadBook({ id: book.bookId, api })

    // 复制到当前
    const filename = path.basename(mp3)
    const newpath = `${dir}/${filename}`
    await fs.copy(mp3, newpath)

    // duration
    const dur = humanizeDuration(Date.now() - bookStart, { language: 'zh_CN' })
    console.log(`${symbols.success} 书籍下载完成, 耗时${dur}`)
  }

  // duration
  const dur = humanizeDuration(Date.now() - start, { language: 'zh_CN' })
  console.log('全部下载完成 , 耗时%s', dur)
}
