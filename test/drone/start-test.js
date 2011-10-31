var vows = require ('vows')
  , ninja = require('ninja-tools')
  , path = require('path')
  , ctrl = require('ctrlflow')
  , a = require('assertions')
  , request = require('request')
  
var Drone = require('../../lib/drone')
  , dTools = require('../../lib/droneTools')

var __projectdir = path.join(__dirname, '../..')
  , tmp = process.env.TMP || '/tmp'
//
// start a an app
//
/*
vows.describe('drone').addBatch({
  'set up test app': {
    topic: function () {
    'create drone': {
      topic: function () {
        
      
      }
    }
  }
})*/

var tmpPath = path.join(tmp, 'test-start-test_' + Date.now())

var assertHasStartScript = a._path(['package', 'scripts', 'start'], a._equal('server.js'), 'Drone must hake start script.')

exports.start = function (test) {

  //if ANY of these async functions throw or callback an error, it skips straight to the callback.

  var drone = new Drone(tmpPath, {})
  ctrl([
    [ninja.cp_r, path.join(__projectdir, 'examples', 'hellonode'), tmpPath],
    [dTools.init, drone],
    [dTools.install, drone],
    [ctrl.toAsync(assertHasStartScript), drone],
    // start with forever and detect the port.
    [dTools.start, drone, {}],
    function (drone, next) {
      console.error(drone)
      next()
    },
    [ctrl.toAsync(a.property), drone, 'port', a._isNumber()],
    function (_, next) {
      request({url: 'http://localhost:'+drone.port}, next)
    },
    function (res, body, next){ 
      console.error('RESPONSE', body)
      a.property(res, 'statusCode', 200)
      next()
    },
    // now kill the child
    //[dTools.restart, drone],
    [dTools.stop, drone]
  ])(function (err) {
    console.error('oenuhonaetuh')
    if(err)
      throw err
    test.done()
  })
}

