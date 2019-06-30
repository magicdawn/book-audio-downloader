const rpFactory = require('@magicdawn/rp')
const mime = require('mime')
const _ = require('lodash')

const WX_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/7.0.4(0x17000428) NetType/WIFI Language/zh_CN'

module.exports = class Api {
  constructor(options) {
    const {sessionId} = options

    this.rp = rpFactory.defaults({
      baseUrl: 'https://apis.auto-learning.com',
      form: {sessionId},
      json: true,
      gzip: true,
      jar: true,
      strictSSL: false,
      headers: {
        'User-Agent': WX_UA,
        'Referer': 'https://servicewechat.com/wxeb50022be9f0bc35/96/page-frame.html',
        'Accept-Language': 'zh-cn',
      },

      // to charles
      // proxy: {
      //   host: '127.0.0.1',
      //   port: 8888,
      // },
    })

    this.otherRp = rpFactory.defaults({
      form: {sessionId},
      json: true,
      gzip: true,
      strictSSL: false,
      headers: {
        'User-Agent': WX_UA,
        'Referer': 'https://servicewechat.com/wxeb50022be9f0bc35/96/page-frame.html',
        'Accept-Language': 'zh-cn',
      },
    })
  }

  async bookDetail(bookId) {
    const [res, json] = await this.rp.post('/v3/xcx/listen-mode', {form: {bookId}})

    const {meta, data} = json
    if (!meta.success) {
      const msg = `get book detail fail(bookId=${bookId})`
      throw new Error(msg)
    }

    // id: data.bookId,
    // name: data.bookName,
    return data
  }

  async bookListInfo(listId) {
    const [res, json] = await this.rp.post('/v3/xcx/book-list-info', {form: {listId}})

    const {meta, data} = json
    if (!meta.success) {
      const msg = `get book detail fail(listId=${listId})`
      throw new Error(msg)
    }

    return data
  }

  async bookListDetail(listId) {
    const [res, json] = await this.rp.post('/v3/xcx/book-list-detail', {
      form: {listId, pageSplit: 1, pageIndex: 0},
    })

    const {meta, data} = json
    if (!meta.success) {
      const msg = `get book detail fail(listId=${listId})`
      throw new Error(msg)
    }

    return data
  }

  // book-list 其实是列出书单
  async bookList(reqbody) {
    const [res, json] = await this.rp.post('/v3/xcx/book-list', {
      form: {
        ...reqbody,
      },
    })

    const {meta, data} = json
    if (!meta.success) {
      const msg = `get book detail fail(reqbody=${JSON.stringify(reqbody)})`
      throw new Error(msg)
    }

    return data
  }

  // 全部书单
  async bookListAll(listType) {
    // pageIndex=7&listType=2&orderBy=1
    let ret = []
    let current = []
    let pageIndex = 0

    while (pageIndex === -1 || current.length > 0) {
      pageIndex++
      const reqbody = {orderBy: 1, listType, pageIndex}
      current = await this.bookList(reqbody)
      ret = ret.concat(current)
    }

    return ret
  }

  // nationId=0&typeId=22&pageIndex=0&isAsc=0&isRead=0
  // 其实就 typeId 有用
  async search(reqbody) {
    reqbody = _.defaults(reqbody, {
      nationId: 0,
      pageIndex: 0,
      isAsc: 0,
      isRead: 0,
    })

    if (typeof reqbody.typeId !== 'number') {
      throw new Error('params.typeId is required')
    }

    const [res, json] = await this.rp.post('/v3/xcx/search', {form: reqbody})
    const arr = json.data
    return arr || []
  }

  async searchAll(typeId) {
    let ret = []
    let current = []
    let pageIndex = -1

    // 第一次 or 上次length > 0
    while (pageIndex === -1 || current.length > 0) {
      pageIndex++
      const reqbody = {typeId, pageIndex}
      current = await this.search(reqbody)
      ret = ret.concat(current)
    }

    return ret
  }

  async getExtension(url) {
    const [res, body] = await this.otherRp.head(url)
    const contentType = res.headers['content-type']
    const ext = mime.getExtension(contentType)
    return ext
  }
}
