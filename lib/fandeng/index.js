const rpFactory = require('@magicdawn/rp')
const mime = require('mime')

const WX_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/7.0.4(0x17000428) NetType/WIFI Language/zh_CN'

module.exports = class Api {
  constructor(options) {
    const { sessionId } = options

    this.rp = rpFactory.defaults({
      baseUrl: 'https://apis.auto-learning.com',
      form: { sessionId },
      json: true,
      gzip: true,
      jar: true,
      strictSSL: false,
      headers: {
        'User-Agent': WX_UA,
        'Referer': 'https://servicewechat.com/wxeb50022be9f0bc35/96/page-frame.html',
        'Accept-Language': 'zh-cn',
      },
    })

    this.otherRp = rpFactory.defaults({
      form: { sessionId },
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
    const [res, json] = await this.rp.post('/v3/xcx/listen-mode', { form: { bookId } })

    const { meta, data } = json
    if (!meta.success) {
      const msg = `get book detail fail(bookId=${bookId})`
      throw new Error(msg)
    }

    // id: data.bookId,
    // name: data.bookName,
    return data
  }

  async bookListInfo(listId) {
    const [res, json] = await this.rp.post('/v3/xcx/book-list-info', { form: { listId } })

    const { meta, data } = json
    if (!meta.success) {
      const msg = `get book detail fail(listId=${listId})`
      throw new Error(msg)
    }

    return data
  }

  async bookListDetail(listId) {
    const [res, json] = await this.rp.post('/v3/xcx/book-list-detail', {
      form: { listId, pageSplit: 1, pageIndex: 0 },
    })

    const { meta, data } = json
    if (!meta.success) {
      const msg = `get book detail fail(listId=${listId})`
      throw new Error(msg)
    }

    return data
  }

  async getExtension(url) {
    const [res, body] = await this.otherRp.head(url)
    const contentType = res.headers['content-type']
    const ext = mime.getExtension(contentType)
    return ext
  }
}
