const path = require('path')
const fs = require('fs-extra')
const moment = require('moment')
const debug = require('debug')('app:lushang:all-type')
const Api = require('../api/index.js')
const pmap = require('promise.map')
const dl = require('dl-vampire')
const symbols = require('log-symbols')
const {tryDownloadBook, downloadBookList} = require('../fn/index.js')
const DurationUtil = require('../../util/duration-util.js')
const {getFullIndexStr, getIndexStr} = require('../../util/array-util.js')
const filenamify = require('filenamify')

module.exports = {
  command: 'all-type',
  desc: '所有类型',
  builder: yargs => {},
  handler: main,
}

async function main(argv) {
  const getAllDuration = DurationUtil.start()
  const {sessionId} = argv
  const api = new Api({sessionId})

  // get all types
  let allTypes = []
  {
    const [res, json] = await api.rp.get('/v3/xcx/all-type-list')
    let arr = json.data
    arr = arr.filter(item => {
      const {typeName, typeId, listType} = item
      if (typeName === '精选书单') return false
      if (typeName === '系列连载') return false
      return true
    })
    allTypes = arr
  }
  debug('allTypes = %O', allTypes.map(i => i.typeName))

  for (let t of allTypes) {
    const getDurationOfType = DurationUtil.start()

    // download current Type
    await downloadOneType(t)

    const duration = getDurationOfType()
    console.log('-------------------')
    console.log('type = %s 下载完成, 耗时 %s', t.typeName, duration)
    console.log('-------------------')
  }

  async function downloadOneType(t) {
    const {typeId, typeName} = t
    const books = await api.searchAll(typeId)
    const typedir = `所有类型/${filenamify(typeName)}` // 有的 typeName = '两性/婚宴', 包含 `/`

    // 单本书
    const downloadBook = async bookId => {
      let mp3
      try {
        mp3 = await tryDownloadBook({api, id: bookId})
      } catch (e) {
        console.error(`${symbols.error} 书籍下载失败`)
        console.error(e.stack || e)
        return
      }

      // 复制到当前
      const filename = path.basename(mp3)
      const newpath = `${typedir}/${filename}`
      await fs.copy(mp3, newpath)
    }

    // 连载
    const downloadSerial = async serialId => {
      // const getBookListDuration = DurationUtil.start()

      // download book list
      await downloadBookList({api, id: serialId, baseDir: typedir})

      // duration
      // const dur = getBookListDuration()
      // const fullIndexStr = getFullIndexStr({arr, index: i})
      // console.log('---------------------')
      // console.log('书单 (%s) (%s)下载完成 , 耗时%s', fullIndexStr, name, dur)
      // console.log('---------------------')
    }

    for (let i = 0; i < books.length; i++) {
      const book = books[i]
      const {bookId} = book
      let ok = false

      const logProgress = () => {
        const fullIndexStr = getFullIndexStr({arr: books, index: i})
        console.log(`[type-${typeName}] progress=${fullIndexStr}`)
      }

      // 是单本书
      if (bookId) {
        await downloadBook(bookId)
        logProgress()
        continue
      }

      // 连载
      // "serialId": 285,
      // "isSerial": 2,
      if (book.isSerial === 2 && typeof book.serialId === 'number') {
        await downloadSerial(book.serialId)
        logProgress()
        continue
      }

      const msg = `unsupport book type in type t = (${JSON.stringify(t)})`
      throw new Error(msg)
    }
  }
}
