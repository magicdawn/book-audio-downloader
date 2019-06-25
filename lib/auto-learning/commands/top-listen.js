const path = require('path')
const fs = require('fs-extra')
const moment = require('moment')
const debug = require('debug')('app:lushang:top-listen')
const Api = require('../api/index.js')
const pmap = require('promise.map')
const dl = require('dl-vampire')
const {tryDownloadBook} = require('../fn/index.js')
const DurationUtil = require('../../util/duration-util.js')
const {getFullIndexStr, getIndexStr} = require('../../util/array-util.js')

module.exports = {
  command: 'top-listen',
  describe: '小程序畅听榜-总榜',

  builder(yargs) {
    return yargs.options({
      limit: {
        describe: '榜单前多少(建议 1000)',
        type: 'number',
        demandOption: true, // --limit 必须有
        requireArg: true, // --limit val 必须有
        alias: ['l'],
      },
    })
  },

  handler(argv) {
    return main(argv)
  },
}

async function main(argv) {
  debug('argv = %O', argv)
  const {sessionId, limit} = argv
  const api = new Api({sessionId})
  const d = DurationUtil.start()

  // get list
  const list = await getList({api, limit})
  // console.log(list)

  // download
  const time = moment().format('YYYYMMDD')
  const dir = `畅听榜-总榜-${time}`

  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    let mp3

    try {
      mp3 = await tryDownloadBook({api, id: item.bookId})
    } catch (e) {
      console.error(e.stack || e)
      console.error('tryDownloadBook fail')
      continue
    }

    // 复制到当前
    const filename = path.basename(mp3)
    const indexInRank = getIndexStr({index: i, arr: list}) // 名次
    const newpath = `${dir}/第${indexInRank}___${filename}`
    await fs.copy(mp3, newpath)
  }

  const dur = d.end()
  console.log('---------------------')
  console.log('排行榜下载完成 , 耗时%s', dur)
  console.log('---------------------')
}

async function getPage({api, page}) {
  const reqbody = {booktype: 3, rankType: 3, pageIndex: page}
  const [res, json] = await api.rp.post('/v3/xcx/index/book-list-module-second', {form: reqbody})

  if (!json.meta || !json.meta.success) {
    throw new Error('getPage fail')
  }

  const l = json.data.list.list.list
  return l
}

async function getList({api, limit}) {
  let page = -1
  let arr = []

  while (arr.length < limit) {
    page++
    const currentList = await getPage({api, page})
    arr = arr.concat(currentList)
  }

  return arr
}
