const humanizeDuration = require('humanize-duration')

class Duration {
  constructor() {
    this.start = Date.now()
  }

  end() {
    const dur = humanizeDuration(Date.now() - this.start, {language: 'zh_CN'})
    return dur
  }
}

exports.start = function() {
  const d = new Duration()
  return function() {
    return d.end()
  }
}
