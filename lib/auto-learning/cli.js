#!/usr/bin/env node

const dl = require('dl-vampire')
const _ = require('lodash')
const yargs = require('yargs')
const filenamify = require('filenamify')
const fs = require('fs-extra')
const pmap = require('promise.map')
const symbols = require('log-symbols')
const humanizeDuration = require('humanize-duration')
const debug = require('debug')('app:lushang')
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
      return yargs
        .positional('id', {
          describe: '书籍ID',
          type: 'number',
        })
        .option({
          'session-id': {
            type: 'string',
            // required: true,
            describe: 'sessionId',
            default: '1809308,d1a474a8-de07-4a6f-b74e-b1ccd27863b6',
          },
        })
    },
    argv => {
      return bookHandler(argv)
    }
  )
  .help().argv

async function bookHandler(argv) {
  debug('argv = %O', argv)
  const { sessionId, id } = argv

  const api = new Api({ sessionId })
  const book = await api.bookDetail(id)

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

    return { title, url: proAudioUrl, duration: proSec, index, indexStr, fullIndexStr }
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
  const output = `${dir}/0-${filenamify(bookName)}.mp3`
  await concat(input, output)

  const dur = humanizeDuration(Date.now() - start, { language: 'zh_CN' })
  console.log('下载完成, 耗时%s', dur)
}
