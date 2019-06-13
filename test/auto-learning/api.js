const should = require('should')
const Api = require('../../lib/auto-learning/api/index.js')

describe('auto-learning api', function() {
  const api = new Api({ sessionId: '1809308,d1a474a8-de07-4a6f-b74e-b1ccd27863b6' })

  it('bookDetail', async () => {
    const book = await api.bookDetail('26')
    console.log(book)
  })

  it('getExtension', async () => {
    const url = 'http://obj.auto-learning.com/89b9a257-88aa-4650-9e56-3fd64906c9c9'
    const ext = await api.getExtension(url)
    should.exists(ext)
    ext.should.equal('mp3')
  })
})
