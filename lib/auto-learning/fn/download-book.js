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

module.exports = async function downloadBook({api, id, book}) {
  if (!book) {
    book = await api.bookDetail(id)
  }

  const bookId = book.bookId
  const bookName = book.bookName
  const dir = secureFilepath(`book/${bookId + '-' + bookName}`)

  // json
  {
    const filepath = `${dir}/book.json`
    await fs.outputJson(filepath, book, {spaces: 2})
  }

  // cover
  {
    const url = book.faceImgPlay
    const ext = await api.getExtension(url)
    const file = `${dir}/cover.${ext}`
    debug('cover = %s', url)

    await dl({url, file})
    debug('cover downloaded: %s', file)
  }

  // 音频
  const sections = book.sectionList.map((item, index, arr) => {
    const {title, proAudioUrl, proSec} = item

    // indexStr
    const len = arr.length.toString().length
    const indexStr = _.padStart(String(index + 1), len, '0')
    const fullIndexStr = `${indexStr}/${arr.length}`

    // url
    const url = item.proAudioUrl || item.doubiAudioUrl

    // duration(秒)
    const duration = item.proSec || item.doubiSec

    return {title, url, duration, index, indexStr, fullIndexStr}
  })

  console.log(`正在下载『${bookName}』,请稍候...`)
  await pmap(
    sections,
    async item => {
      const {title, url, index, indexStr, fullIndexStr} = item

      const ext = await api.getExtension(url)
      const file = secureFilepath(`${indexStr}-${title}.${ext}`)
      // const file = secureFilepath(`${indexStr}.${ext}`)
      const filepath = `${dir}/${file}`
      Object.assign(item, {file, filepath})

      try {
        await dl({
          url,
          file: filepath,
          retry: {
            times: 5,
            timeout: ms('3min'),
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
