#!/usr/bin/env node

require('log-reject-error')()
const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')
const symbols = require('log-symbols')
const dl = require('dl-vampire')
const ms = require('ms')
const yargs = require('yargs')
const pmap = require('promise.map')
const humanizeDuration = require('humanize-duration')
const debug = require('debug')('app:lushang')
const pretry = require('promise.retry')
const Api = require('./api/index.js')
const concat = require('../util/concat.js')
const {getFullIndexStr} = require('../util/array-util.js')
const {secureFilepath} = require('../util/file-util.js')
const DurationUtil = require('../util/duration-util.js')

// enable debug log
require('debug').enable('app:*')

// mark download start
const start = Date.now()

const argv = yargs
  .alias({
    h: 'help',
  })
  .command('featured-book-list', '精选书单', yargs => yargs, argv => featuredBookListHandler(argv))
  .command('serial-book-list', '系列连载', yargs => yargs, argv => serialBookListHandler(argv))
  .commandDir('commands')
  .option({
    'session-id': {
      type: 'string',
      // required: true,
      describe: 'sessionId',
      default: '1809308,d1a474a8-de07-4a6f-b74e-b1ccd27863b6',
    },
  })
  .demandCommand()
  .help().argv

const {downloadBook, tryDownloadBook, downloadBookList} = require('./fn/index.js')

async function featuredBookListHandler(argv) {
  debug('argv = %O', argv)
  const {sessionId, id} = argv
  const api = new Api({sessionId})

  // 2=精选书单
  const baseDir = '精选书单'
  const arr = await api.bookListAll(2)

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    const {listId: id, name} = item
    const bookListStart = Date.now()

    // download book list
    await downloadBookList({api, id, baseDir})

    // duration
    const dur = humanizeDuration(Date.now() - bookListStart, {language: 'zh_CN'})
    const fullIndexStr = getFullIndexStr({arr, index: i})
    console.log('---------------------')
    console.log('书单 (%s) (%s)下载完成 , 耗时%s', fullIndexStr, name, dur)
    console.log('---------------------')
  }

  // duration
  const dur = humanizeDuration(Date.now() - start, {language: 'zh_CN'})
  console.log('全部下载完成 , 耗时%s', dur)
}

async function serialBookListHandler(argv) {
  debug('argv = %O', argv)
  const {sessionId, id} = argv
  const api = new Api({sessionId})

  // 4=系列连载
  const baseDir = '系列连载'
  const arr = await api.bookListAll(4)

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    const {listId: id, name} = item
    const bookListStart = Date.now()

    // download book list
    await downloadBookList({api, id, baseDir})

    // duration
    const dur = humanizeDuration(Date.now() - bookListStart, {language: 'zh_CN'})
    const fullIndexStr = getFullIndexStr({arr, index: i})
    console.log('---------------------')
    console.log('书单 (%s) (%s)下载完成 , 耗时%s', fullIndexStr, name, dur)
    console.log('---------------------')
  }

  // duration
  const dur = humanizeDuration(Date.now() - start, {language: 'zh_CN'})
  console.log('全部下载完成 , 耗时%s', dur)
}
