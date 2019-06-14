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
const debug = require('debug')('app:fandeng')
const pretry = require('promise.retry')
const moment = require('moment')
const Api = require('./api/index.js')
const concat = require('../util/concat.js')

// mark download start
const start = Date.now()

const argv = yargs
  .alias({
    help: 'h',
  })
  .command(
    'all [options]',
    '下载全部书籍',
    yargs => yargs,
    argv => {
      return allHandler(argv)
    }
  )
  .option({
    token: {
      type: 'string',
      describe: 'the user token',
      default: 'Fx51DaT9DBAkCe7Grm2',
    },
  })
  .help().argv

async function allHandler(argv) {
  const { token } = argv
  const api = new Api({ token })

  const books = await api.allBooks()
  const dir = 'books'

  // 000-all.json
  {
    const filepath = `${dir}/000-all.json`
    await fs.outputJson(filepath, books, { spaces: 2 })
  }

  const downloadArr = await pmap(
    books,
    async book => {
      const bookId = book.id
      const bookName = book.title
      const bookImageUrl = book.imageUrl
      const bookDate = moment(book.createTime).format('YYYY-MM-DD')

      // urls
      const contents = book.contents
      let audioFragmentId
      let videoFragmentId
      {
        const item = _.find(contents, { type: 2 })
        audioFragmentId = item && item.fragmentId
      }
      {
        const item = _.find(contents, { type: 3 })
        videoFragmentId = item && item.fragmentId
      }

      // detail
      let audioFragmentContent
      let videoFragmentContent
      if (audioFragmentId) audioFragmentContent = await api.fragmentContent(audioFragmentId)
      if (videoFragmentId) videoFragmentContent = await api.fragmentContent(videoFragmentId)

      // final url
      const audioUrl = _.get(audioFragmentContent, 'mediaUrls.0')
      const videoUrl = _.get(videoFragmentContent, 'mediaUrls.0') || '无'

      // extra
      let bookAuthorName = _.get(audioFragmentContent, 'bookAuthorName') || ''
      if (!bookAuthorName) {
        debug('bookAuthorName empty, bookName = %s', bookName)
      }

      // const
      return {
        bookId,
        bookName,
        bookImageUrl,
        bookDate,
        bookAuthorName,

        audioUrl,
        videoUrl,

        // the unprocessed content
        raw: {
          book,
          audioFragmentContent,
          videoFragmentContent,
        },
      }
    },
    5
  )

  await pmap(
    downloadArr,
    async (downloadItem, index) => {
      const {
        bookId,
        bookName,
        bookAuthorName,
        bookImageUrl,
        bookDate,
        audioUrl,
        videoUrl,
        raw,
      } = downloadItem

      const basicName = filenamify(`${bookDate}-${bookAuthorName}-${bookName}`)

      // write json
      {
        const filepath = `${dir}/${basicName}.json`
        await fs.outputJson(filepath, downloadItem, { spaces: 2 })
      }

      // video
      {
        const filepath = `${dir}/${basicName}.m3u8`
        if (videoUrl) {
          await dl({
            url: videoUrl,
            file: filepath,
          })
        }
      }

      // download audio file
      {
        const filepath = `${dir}/${basicName}.mp3`
        await dl({
          url: audioUrl,
          file: filepath,
        })

        const len = downloadArr.length.toString().length
        const indexStr = _.padStart(String(index + 1), len, '0')
        const fullIndexStr = `${indexStr}/${downloadArr.length}`
        console.log(`${symbols.success} ${fullIndexStr} ${filepath}`)
      }
    },
    5
  )

  // duration
  const dur = humanizeDuration(Date.now() - start, { language: 'zh_CN' })
  console.log('下载完成, 耗时%s', dur)
}
