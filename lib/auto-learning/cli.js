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
