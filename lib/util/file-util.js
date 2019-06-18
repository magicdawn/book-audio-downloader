const filenamify = require('filenamify')

exports.secureFilepath = path => {
  return path
    .split('/')
    .map(part => {
      part = filenamify(part)
      part = part.replace(/ /g, '_')
      return part
    })
    .join('/')
}
