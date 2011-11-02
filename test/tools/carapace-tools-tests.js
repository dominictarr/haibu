
var helpers = require('../helpers')
  , dTools = require('../../lib/drone-tools')
  , carapace = require('../../plugins/carapace')
  , tests = require('../plugin-tests').tests
  , hook
  
var caraTools = carapace({}, function (_, _hook) { hook = _hook })
caraTools.__proto__ = dTools

helpers.addTests(exports, caraTools, tests, 'default tools') 

exports.__teardown = function (test) {
  hook.server.close()
}