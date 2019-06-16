#!/usr/bin/env node

const path = require('path')
const fs = require('fs-extra')
const { resolve: urlresolve } = require('url')
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
const m3u8Parse = require('../util/m3u8-parse.js')
const { getFullIndexStr, getIndexStr } = require('../util/array-util.js')

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

async function getAllInfo(api) {
  const books = await api.allBooks()
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
    10
  )
  return { books, downloadArr }
}

async function allHandler(argv) {
  const { token } = argv
  const api = new Api({ token })

  const { books, downloadArr } = await getAllInfo()
  const dir = 'books'

  // 000-all.json
  {
    const filepath = `${dir}/000-all.json`
    await fs.outputJson(filepath, books, { spaces: 2 })
  }

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

      const len = downloadArr.length.toString().length
      const indexStr = _.padStart(String(index + 1), len, '0')
      const fullIndexStr = `${indexStr}/${downloadArr.length}`

      // video
      {
        const filepath = `${dir}/${basicName}.m3u8`
        if (videoUrl) {
          try {
            await dl({
              url: videoUrl,
              file: filepath,
            })
          } catch (e) {
            console.error(`${symbols.error} ${fullIndexStr} 下载失败 ${filepath}`)
            console.error(e.stack || e)
          }
        }
      }

      // download audio file
      {
        const filepath = `${dir}/${basicName}.mp3`
        try {
          await dl({
            url: audioUrl,
            file: filepath,
          })
        } catch (e) {
          console.log(`${symbols.error} ${fullIndexStr} 下载失败 ${filepath}`)
          console.error(e.stack || e)
          return
        }
        console.log(`${symbols.success} ${fullIndexStr} 下载成功 ${filepath}`)
      }
    },
    5
  )

  // duration
  const dur = humanizeDuration(Date.now() - start, { language: 'zh_CN' })
  console.log('下载完成, 耗时%s', dur)
}

async function allVideoHandler() {
  const { token } = argv
  const api = new Api({ token })

  const { books, downloadArr } = await getAllInfo()
  const dir = 'videos'

  // 000-all.json
  {
    const filepath = `${dir}/000-all.json`
    await fs.outputJson(filepath, { books, downloadArr }, { spaces: 2 })
  }

  for (let i = 0; i < downloadArr.length; i++) {
    const downloadItem = downloadArr[i]

    try {
      await downloadBookVideo({
        api,
        dir,

        // map.forEach
        downloadItem,
        index: i,
        downloadArr,
      })
    } catch (e) {
      console.log('--------------------')
      console.log('书籍下载失败, 跳过')
      console.log('--------------------')
    }

    console.log('====================')
  }

  // duration
  const dur = humanizeDuration(Date.now() - start, { language: 'zh_CN' })
  console.log('全部下载完成, 耗时%s', dur)
}

async function downloadBookVideo({ api, dir, downloadItem, index, downloadArr }) {
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
  const videoDetailDir = `${dir}/${basicName}`
  const m3u8Filepath = `${videoDetailDir}/${basicName}.m3u8` // .m3u8
  const infoJsonFilepath = `${videoDetailDir}/info.json`
  const filelistTxtFilepath = `${videoDetailDir}/filelist.txt` // filelist.txt

  if (!videoUrl) {
    console.error('no videoUrl found in downloadItem = %o', downloadItem)
    return
  }

  // 下载 m3u8
  {
    const url = videoUrl
    const file = m3u8Filepath
    await dl({ url, file })
  }

  // parse m3u8
  const m3u = await m3u8Parse(m3u8Filepath)
  let segments = m3u.serialize().items.PlaylistItem.map(item => item.properties.uri)

  // map-url 相对路径 => 绝对路径
  segments = segments.map(s => {
    return urlresolve(videoUrl, s)
  })

  // info.json
  {
    const content = { m3u8Url: videoUrl, segments }
    await fs.outputJson(infoJsonFilepath, content, { spaces: 2 })
  }

  // start log
  const timeBookDownloadStart = Date.now()
  const bookFullIndexStr = getFullIndexStr({ arr: downloadItem, index })
  console.log(`${symbols.info} ${bookFullIndexStr} 视频下载开始 ${basicName}`)

  // 文件名
  const segmentObjArr = segments.map((segment, index, arr) => {
    const segmentFullIndexStr = getFullIndexStr({ arr, index })
    const segmentIndexStr = getIndexStr({ arr, index })
    const url = segment
    const ext = path.extname(url).slice(1)
    const filepath = `${videoDetailDir}/${segmentIndexStr}.${ext}`
    return { url, filepath, segmentIndexStr, segmentFullIndexStr }
  })

  // filelist.txt
  {
    // https://superuser.com/questions/692990/use-ffmpeg-copy-codec-to-combine-ts-files-into-a-single-mp4/1267448#1267448
    const content = segmentObjArr.map(o => `file ${o.filpath}`).join('\n')
    await fs.outputFile(filelistTxtFilepath, content)
  }

  // download
  await pmap(
    segmentObjArr,
    async segmentObj => {
      const { url, filepath, segmentFullIndexStr } = segmentObj
      await dl({
        url,
        file: filepath,
        retry: {
          times: 10,
          timeout: false,
          onerror(err, i) {
            console.log(`${symbols.warn} ${segmentFullIndexStr} 第${i + 1}次失败`)
          },
        },
      })

      console.log(`${symbols.success} ${segmentFullIndexStr} 下载成功 ${filepath}`)
    },
    5
  )

  // 合成
  const finalVideoFile = `${dir}/${basicName}.mp4`
  const command = `ffmpeg -f concat -i ${filelistTxtFilepath} -bsf:a aac_adtstoasc -vcodec copy -c copy ${finalVideoFile}`

  // duration
  const dur = humanizeDuration(Date.now() - timeBookDownloadStart, { language: 'zh_CN' })
  console.log('下载完成, 耗时%s', dur)
}
