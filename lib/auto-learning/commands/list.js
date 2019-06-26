module.exports = {
  command: 'list <id> [options]',
  describe: '下载书单',

  builder(yargs) {
    return yargs.positional('id', {
      describe: '书单ID',
      type: 'number',
    })
  },

  handler(argv) {
    return main(argv)
  },
}

function main(argv) {
  return bookListHandler(argv)
}

const debug = require('debug')('app:lushang:book')
const Api = require('../api/index.js')
const {downloadBookList} = require('../fn/index.js')
const DurationUtil = require('../../util/duration-util.js')

async function bookListHandler(argv) {
  debug('argv = %O', argv)
  const {sessionId, id} = argv
  const api = new Api({sessionId})
  const getDuration = DurationUtil.start()

  // 下载书单
  await downloadBookList({api, id})

  // duration
  const duration = getDuration()
  console.log('全部下载完成 , 耗时%s', duration)
}
