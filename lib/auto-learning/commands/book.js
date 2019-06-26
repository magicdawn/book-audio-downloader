module.exports = {
  command: 'book <id> [options]',
  describe: '下载书籍',

  builder(yargs) {
    return yargs.positional('id', {
      describe: '书籍ID',
      type: 'number',
    })
  },

  handler(argv) {
    return main(argv)
  },
}

async function main(argv) {
  bookHandler(argv)
}

const debug = require('app:lushang:book')
const Api = require('../api/index.js')
const {downloadBook} = require('../fn/index.js')
const DurationUtil = require('../../util/duration-util.js')

async function bookHandler(argv) {
  debug('argv = %O', argv)
  const {sessionId, id} = argv
  const api = new Api({sessionId})
  const getDuration = DurationUtil.start()

  // book
  await downloadBook({api, id})

  // duration
  const dur = getDuration()
  console.log('下载完成, 耗时%s', dur)
}
