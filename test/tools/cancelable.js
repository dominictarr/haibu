
var a = require('assertions')
// each tool command should return a cancel function.
// if you call the cancel function, it should stop what ever it was doing,
// rolling back if necessary/possible
// and not callback.

// the most important things to be able to cancel are the things that take the longest.
// create, install, start, and test.

/*
  function whatever (args..., callback) {
    //start doing whatever.
    return cancel () {
      //stop doing whatever.
    }  
  }
*/


//
// assert that an async function keeps the Cancellable contract.
//
// a Cancellable function must take a callback, and return a cancel function.
// if the cancel function is called, it must stop what it is doing, and callback with an error.
// ( kill child processes, destroy streams, rollback changes, etc )

function isCancelable (func, name) {

  return function () {
    var args = [].slice.call(arguments)
      , callback = args.pop()
      , called = false
      , cancelled = false
      ;
  
    a.isFunction(callback, 'the cancelable function "'+name+'" must be passed a callback')
    
    var _callback = function (err) {
        a.equal(called, false, 'callback should only be called once in "'+name+'"')
        called = true
        if(cancelled)
          a.ok(err, 'cancelled function "'+name+'" must callback with an error')
        return callback.apply(this, arguments)
    }

    args.push(_callback)
    var cancel = func.apply(this, args)
    a.isFunction(cancel, 'cancelable function "'+name+'" must return a cancel function')
    return function () {
        cancelled = true;
        cancel()
      }
  
  }
}



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


function setupDrone (name, test){ 
  var tmpPath = path.join(tmp, 'haibu-test_' + Date.now())
  var drone = new Drone(tmpPath, {})
  ctrl([
    [ninja.cp_r, path.join(__projectdir, 'fixtures', name), tmpPath],
    [isCancelable(dTools.init, 'init'), drone]
  ])(function (err) {
    test(err, drone)
  })
}

var assertHasStartScript = a._path(['package', 'scripts', 'start'], a._equal('server.js'), 'Drone must hake start script.')

exports['abort start'] = function (test) {
  setupDrone('delayed-start', function (err, drone) {
    if(err) return test.error(err)
    assertHasStartScript(drone)
    var abort = isCancelable(dTools.start, 'start')(drone, {}, function (err) {
      //this should give an error, because we are gonna abort it.
      a.ok(err, 'expected error after aborting start opperation')
      test.done()
    })
    setTimeout(abort, 200)
  })
}

exports['abort install'] = function (test) {
  setupDrone('slow-install', function (err, drone) {
    if(err) return test.error(err)
    assertHasStartScript(drone)
    var abort = isCancelable(dTools.install, 'install')(drone, {}, function (err) {
      //this should give an error, because we are gonna abort it.
      a.ok(err, 'expected error after aborting install opperation')
      test.done()
    })
    setTimeout(abort, 200)
  })
}

exports['abort test'] = function (test) {
  setupDrone('hanging-test', function (err, drone) {
    if(err) return test.error(err)
    assertHasStartScript(drone)
    var abort = isCancelable(dTools.test, 'install')(drone, {}, function (err) {
      //this should give an error, because we are gonna abort it.
      a.ok(err, 'expected error after aborting install opperation')
      test.done()
    })
    setTimeout(abort, 200)
  })
}