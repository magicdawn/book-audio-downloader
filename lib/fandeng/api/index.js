const rpFactory = require('@magicdawn/rp')
const mime = require('mime')
const pmap = require('promise.map')
const _ = require('lodash')
const debug = require('debug')('app:fandeng:Api')

module.exports = class Api {
  constructor(options) {
    const {token} = options

    // to charles
    // proxy: {
    //   host: '127.0.0.1',
    //   port: 8888,
    // },

    this.rp = rpFactory.defaults({
      baseUrl: 'https://api.dushu.io',
      body: {token},
      json: true,
      gzip: true,
      jar: true,
      strictSSL: false,
      headers: {
        'x-dushu-app-ver': '3.9.42',
        'x-dushu-app-plt': '1',
        'x-dushu-app-muid': '9090E25A-4680-406F-8C64-D5666EDC744A',
        'accept-language': 'zh-Hans-CN;q=1, en-CN;q=0.9, zh-Hant-CN;q=0.8, io-CN;q=0.7',
        'user-agent': 'bookclub/3.9.42 (iPhone; iOS 12.4; Scale/2.00)',
        'x-dushu-app-sysver': 'Version 12.4 (Build 16G5027g)',
        'x-dushu-app-devid': '98A8C97D-E054-45D6-A4E4-F433A998ED86',
        'x-dushu-app-devtoken': 'bc9b740d9dcb97e0c7b7fafb614cd4781dee5ec520dbd5596f137d5eaa7d5108',
        'cookie':
          'SERVERID=1ebdc1cc2a3d66d97da2b6d9c90558b4|1560523179|1560522577; UM_distinctid=16ab63151d93d0-02c5e73ea9fd448-46634136-3d10d-16ab63151da444',
      },
    })
  }

  async user() {
    const [res, json] = await this.rp.post('/userInfo')
    return json
  }

  async books({pageSize, page}) {
    const reqbody = {bookReadStatus: -1, order: 1, pageSize, page}
    const [res, json] = await this.rp.post('/books', {body: reqbody})

    const success = json.status === 1
    if (!success) {
      const msg = `fetch /books error`
      debug('fetch /books json = %j', json)
      throw new Error(msg)
    }

    const {books, totalCount} = json
    return json
  }

  async allBooks() {
    const pageSize = 10
    let page = 1
    let total = 10
    let json
    let fiBooks

    // first
    {
      const json = await this.books({pageSize, page})
      const {totalCount, books} = json
      total = totalCount
      fiBooks = books
    }

    const maxPage = Math.ceil(total / pageSize)
    const pages = _.range(1, maxPage + 1)

    // get all
    const booksArr = await pmap(
      pages,
      async page => {
        // 第一页
        if (page === 1) return fiBooks

        // 其他
        const json = await this.books({pageSize, page})
        const {books} = json
        return books
      },
      5
    )

    const books = _.flattenDeep(booksArr)
    return books
  }

  async fragmentContent(id) {
    const reqbody = {fragmentId: id, albumId: 0, programId: 0}
    const [res, json] = await this.rp.post('/fragment/content', {body: reqbody})

    const success = json.status === 1
    if (!success) {
      const msg = `fetch /fragment/content error`
      debug('fetch /fragment/content json = %j', json)
      throw new Error(msg)
    }

    return json
  }
}
