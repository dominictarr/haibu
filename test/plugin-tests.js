
var a = require('assertions')


var vows = require ('vows')
  , ninja = require('ninja-tools')
  , path = require('path')
  , ctrl = require('ctrlflow')
  , a = require('assertions')
  , request = require('request')
  , helpers = require('./helpers')
  , isCancelable = helpers.isCancelable
  , spawn = require('child_process').spawn

var Drone = require('../lib/drone')
  , dTools = require('../lib/drone-tools')

var __projectdir = path.join(__dirname, '..')
  , tmp = process.env.TMP || '/tmp'


exports.tests = [
    {
    action: 'start',
    name: 'start a drone and bind port',
    test: function (dTools, test) {
      //if ANY of these async functions throw or callback an error, it skips straight to the callback.
      helpers.setupDrone('hellonode', function (err, drone) {
        if(err) return test.error(err)
        helpers.assertHasStartScript(drone)
        ctrl([
          // start with forever and detect the port.
          [dTools.start, drone, {}],
          function (drone, next) {
            next()
          },
          [ctrl.toAsync(a.property), drone, 'port', a._isNumber()],
          function (_, next) {
            request({url: 'http://localhost:'+drone.port}, next)
          },
          function (res, body, next){ 
            a.property(res, 'statusCode', 200)
            next()
          },
          // now kill the child
          //[dTools.restart, drone],
          [dTools.stop, drone]
        ])(function (err) {
          if(err)
            throw err
          test.done()
        })
      })
    }
  },
  { 
    action: 'start',
    name: 'crash while starting -> return error',
    test: function (dTools, test) {  
      helpers.setupDrone('spinner', function (err, drone) {
        if(err) return test.error(err)
        helpers.assertHasStartScript(drone)
        dTools.start(drone, {}, function (err, drone) {
          a.ok(err, 'expects start to error if app crashes before the port is bound')
          a.equal(drone.port, null, 'do not expect examples/spinner to ever bind the port')
          test.done()
        })
      })
    }
  },
    { action: 'test',
    name: 'simple failing test',
    test: function (dTools, test) {
      var dir = path.join(__projectdir, 'fixtures', 'testable')
  
      helpers.setupDrone('testable', function (err, drone) {
        //drone should now have a package.json !
        function log (line) {
          process.stdout.write(line)
        }
        drone.on('stdout', log)
        drone.on('stderr', log)
        dTools.test(drone, function (err, result) {
          console.error('RESULT', result, '(Expected failure)')
          a.deepEqual(result, {code: 1, status: 'Failure'})
          test.done()
        })
      })
    }
  },
    { action: 'create',
    name: 'create from tarball',
    test: function (dTools, test) {
      var dir = path.join(__projectdir, 'fixtures', 'hellonode')  
      var tar = spawn('tar', ['-cz', '.'], {cwd: dir})
      var drone = new Drone(helpers.makeTmpPath(), {})
      dTools.create(drone, tar.stdout, function (err, drone) {
        if(err)
          return test.error(err)
        dTools.init(drone, function (err, drone) {
          if(err)
            return test.error(err)
          //drone should now have a package.json !
      
          console.error(drone.id, drone.package)
          test.done()
        })
  
      })
    }
  },
  { action: 'start',
    name: 'abort delayed start',
    test: function (dTools, test) {
      helpers.setupDrone('delayed-start', function (err, drone) {
        if(err) return test.error(err)
        helpers.assertHasStartScript(drone)
        var abort = isCancelable(dTools.start, 'start')(drone, {}, function (err) {
          //this should give an error, because we are gonna abort it.
          a.ok(err, 'expected error after aborting start opperation')
          test.done()
        })
        setTimeout(abort, 200)
      })
    }
  },
  { action: 'install',
    name: 'abort install',
    test: function (dTools, test) {
      helpers.setupDrone('slow-install', function (err, drone) {
        if(err) return test.error(err)
        helpers.assertHasStartScript(drone)
        var abort = isCancelable(dTools.install, 'install')(drone, {}, function (err) {
          //this should give an error, because we are gonna abort it.
          a.ok(err, 'expected error after aborting install opperation')
          test.done()
        })
        setTimeout(abort, 200)
      })
    }
  },
  { action: 'test',
    name: 'abort test',
    test: function (dTools, test) {
      helpers.setupDrone('hanging-test', function (err, drone) {
        if(err) return test.error(err)
        helpers.assertHasStartScript(drone)
        var abort = isCancelable(dTools.test, 'install')(drone, {}, function (err) {
          //this should give an error, because we are gonna abort it.
          a.ok(err, 'expected error after aborting install opperation')
          test.done()
        })
        setTimeout(abort, 200)
      })
    }
  }
]

//helpers.addTests(exports, dTools, pluginTests, 'default tools')