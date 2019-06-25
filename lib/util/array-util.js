const _ = require('lodash')

function getFullIndexStr({arr, index}) {
  const len = arr.length.toString().length
  const indexStr = _.padStart(String(index + 1), len, '0')
  const fullIndexStr = `${indexStr}/${arr.length}`
  return fullIndexStr
}

function getIndexStr({arr, index}) {
  const len = arr.length.toString().length
  const indexStr = _.padStart(String(index + 1), len, '0')
  return indexStr
}

Object.assign(module.exports, {
  getFullIndexStr,
  getIndexStr,
})
