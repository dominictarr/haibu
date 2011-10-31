
var configurator = require('CONFIGURATOR')
  , opts = require('optimist')


module.exports = 
  configurator(
    opts,
    ninja.findFileSync('config.json'),
    { // defaults
      
    })
  