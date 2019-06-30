#!/usr/bin/env node

require('log-reject-error')()
const yargs = require('yargs')

// enable debug log
require('debug').enable('app:*')

// commandDir 无序

const argv = yargs
  .alias({
    h: 'help',
  })
  .command(require('./commands/book.js'))
  .command(require('./commands/list.js'))
  .command(require('./commands/featured-book-list.js'))
  .command(require('./commands/serial-book-list.js'))
  .command(require('./commands/top-listen.js'))
  .command(require('./commands/all-type.js'))
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
