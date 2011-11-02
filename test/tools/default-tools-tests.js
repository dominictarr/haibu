
var helpers = require('../helpers')
  , dTools = require('../../lib/drone-tools')
  , tests = require('../plugin-tests').tests
  
helpers.addTests(exports, dTools, tests, 'default tools') 
