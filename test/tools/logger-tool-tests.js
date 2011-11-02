
var helpers = require('../helpers')
  , dTools = require('../../lib/drone-tools')
  , logger = require('../../plugins/logger')
  , tests = require('../plugin-tests').tests

var loggerTools = logger({})
loggerTools.__proto__ = dTools

helpers.addTests(exports, loggerTools, tests, 'logger tools')
