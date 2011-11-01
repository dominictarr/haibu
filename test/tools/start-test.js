var vows = require ('vows')
  , ninja = require('ninja-tools')
  , path = require('path')
  , ctrl = require('ctrlflow')
  , a = require('assertions')
  , request = require('request')
  
var Drone = require('../../lib/drone')
  , dTools = require('../../lib/drone-tools')

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

function setupDrone (name, test){ 
  var tmpPath = path.join(tmp, 'haibu-test_' + Date.now())
  var drone = new Drone(tmpPath, {})
  ctrl([
    [ninja.cp_r, path.join(__projectdir, 'fixtures', name), tmpPath],
    [dTools.init, drone]
  ])(function (err) {
    test(err, drone)
  })
}

exports.start = function (test) {

  //if ANY of these async functions throw or callback an error, it skips straight to the callback.
  setupDrone('hellonode', function (err, drone) {
    if(err) return test.error(err)
    assertHasStartScript(drone)
    ctrl([
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
  })
}


exports['crash while starting -> return error'] = function (test) {
  
  setupDrone('spinner', function (err, drone) {
    if(err) return test.error(err)
    assertHasStartScript(drone)
    dTools.start(drone, {}, function (err, drone) {
      a.ok(err, 'expects start to error if app crashes before the port is bound')
      a.equal(drone.port, null, 'do not expect examples/spinner to ever bind the port')
      test.done()
    })
  })

}
