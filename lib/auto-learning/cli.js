#!/usr/bin/env node

require('log-reject-error')()
const yargs = require('yargs')

// enable debug log
require('debug').enable('app:*')

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
