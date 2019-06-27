module.exports = {
  command: 'serial-book-list',
  describe: '系列连载',
  builder: yargs => yargs,
  hander: argv => serialBookListHandler(argv),
}

const debug = require('debug')('app:lushang:serial-book-list')
const Api = require('../api/index.js')
const {downloadBookList} = require('../fn/index.js')
const DurationUtil = require('../../util/duration-util.js')
const {getFullIndexStr} = require('../../util/array-util.js')

async function serialBookListHandler(argv) {
  debug('argv = %O', argv)
  const {sessionId, id} = argv
  const api = new Api({sessionId})
  const getAllDuration = DurationUtil.start()

  // 4=系列连载
  const baseDir = '系列连载'
  const arr = await api.bookListAll(4)

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    const {listId: id, name} = item
    const bookListStart = Date.now()
    const getBookListDuration = DurationUtil.start()

    // download book list
    await downloadBookList({api, id, baseDir})

    // duration
    const dur = getBookListDuration()
    const fullIndexStr = getFullIndexStr({arr, index: i})
    console.log('---------------------')
    console.log('书单 (%s) (%s)下载完成 , 耗时%s', fullIndexStr, name, dur)
    console.log('---------------------')
  }

  // duration
  const dur = getAllDuration()
  console.log('全部下载完成 , 耗时%s', dur)
}
