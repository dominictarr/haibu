
var a = require('assertions')
  , ninja = require('ninja-tools') 
  , path = require('path')
  , tmp = process.env.TMP || '/tmp'
  , Drone = require('../lib/drone')
  , dTools = require('../lib/drone-tools')
  , ctrl = require('ctrlflow')
  
var __projectdir = path.join(__dirname, '..')

exports.makeTmpPath = function () {return path.join(tmp, 'haibu-test_' + Date.now())}

exports.assertHasStartScript = a._path(['package', 'scripts', 'start'], a._equal('server.js'), 'Drone must hake start script.')

exports.setupDrone =  function (name, test){ 
  var tmpPath = exports.makeTmpPath()
  var drone = new Drone(tmpPath, {})
  ctrl([
    [ninja.cp_r, path.join(__projectdir, 'fixtures', name), tmpPath],
    [dTools.init, drone]
  ])(function (err) {
    test(err, drone)
  })
}

exports.addTests = function (exports, toolSet, tests, description) {
  tests.forEach (function (pluginTest) {
    if(toolSet.hasOwnProperty(pluginTest.action))
    exports[JSON.stringify(pluginTest.action) + ' in ' + JSON.stringify(description) +': ' +pluginTest.name] = function (test) {
      pluginTest.test(toolSet, test)
    }
  })
}


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

exports.isCancelable = function (func, name) {

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

