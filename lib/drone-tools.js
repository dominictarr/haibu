
var ninja = require('ninja-tools'),
    path = require('path'),
    Drone = require('./drone'),
    parseTable = require('parse-table'),
    forever = require('forever'),
    async = require('async'),
    spawn = require('child_process').spawn,
    es = require('event-stream'),
    fs = require ('fs'),
    attachEvents = require('./utils').attachEvents,
    psTree =require('ps-tree')
    ;

// default tools, these may be over-ridden by methods higher up the toolchain.
// also see ../plugins/carapace.js

// these functions will all be called by Haibu
// however, they are implemented here, 
// because Haibu should not care about their implementation

// they are all just functions that change the state of a drone, 
// cause it to emit events and so on, but do not have access to the Haibu object or any global state.

exports.init = function (drone, callback) {
  //if ('function' == typeof stream) callback = stream, stream = null
  var cancelled = false
  ninja.readJSONFile(path.join(drone.dir, 'package.json'), function (err, pkg) {
    if(err) return callback(err)
    if(cancelled)
      return callback({error: 'init was cancelled', drone: drone})
    if(pkg) {
      drone.package = pkg
      drone.startScript = path.join(drone.dir, pkg.scripts &&  pkg.scripts.start)
      drone.emit('package', pkg)
    }
    callback(err, drone)
  })
  return function() {
    cancelled = true
  }
}

process.on('uncaughtException', function (err){ 
  console.error(err.stack)
})

exports.create = function (drone, stream, callback) {
  var gated = es.gate()

  stream.pipe(gated)
  ninja.mkdir_p(drone.dir, 0755, function (err, dir) {
    if(err) {
      drone.emit('error', err)
      return callback(err)
    }
    var tar = spawn('tar', ['-xz'], {cwd: drone.dir})
    gated.pipe(tar.stdin)
    gated.open()
    tar.stderr.pipe(process.stderr, {end: false})
    tar.on('exit', function () {
      callback(null, drone)
    })
  })
}

function emitChildEvents(child, drone) {

  function onStdout (line) {
    drone.emit('stdout', line)
  }
  function onStderr (line) {
    drone.emit('stderr', line)  
  }

  child.stdout.on('data', onStdout)
  child.stderr.on('data', onStderr)

  //the child will be discarded, so these event listeners will be GCed.
}

exports.install = function (drone, config, callback) {
  if(!callback) callback = config, config = {}
  var isDone = false
  function done (err) {
    if(isDone)
      return
    called = true
    callback(err)
  }

  // don't invoke npm if there are no dependencies.
  // will make hello worlds start in ~ 300 ms
  
  // check that there are no dependencies, no /(pre|post)?install/ scripts, and no wscript file.
  // that means that npm will have nothing to do.
  
  var npm = spawn('npm', ['install'], {cwd: drone.dir})
  emitChildEvents(npm, drone)

  npm.on('exit', function (code) {
    if(code) {
      var err = {error: 'npm exited with code:'+ code}
      drone.emit('install-error', err)
      return done(err, drone)
    }
    drone.emit('install')
    done(null, drone)
  })
  
  return function () {
    if(isDone) return
    npm.kill()
  }
}

function lsof (pid, callback) {
  // the following command will find all listening TCP ports belonging to a PID.
  //-a AND all filters
  //-p filter by pid
  //-i filter by protocol
  //-s filter by state
  var child = spawn('lsof', ['-a', '-p', pid, '-i', 'TCP', '-s', 'TCP:LISTEN'])
  child.stdout.pipe(parseTable(function (err, ports) {
    if(err)
      return callback (err)
    if(!ports.length)
      return callback (null, [])
    else
      return callback(null, ports.map( function (line) {
        var m = /^(.*)\:(\d+)\s\((\w+)\)$/exec(line.NAME)      
        if(!m) return null
        return {bound: m[1], port: m[2], state: m[3]}
      }))
  }))
}

//
// detect based start
//

exports.start = function (drone, config, callback) {
  if ('function' == typeof config) callback = config, config = {}
  var options = []
    , cancelled = false
  var foreverOptions = {
        silent:    true,
        cwd:       drone.dir,
        hideEnv:   config.hideEnv,
        env:       drone.env,
        minUptime: config.minUptime,
        options:   options
      };
  drone.env.PORT = ~~(Math.random() * 40000) + 1000

  var m = drone.monitor = new forever.Monitor(drone.startScript, foreverOptions),
      isDone = false;

  function done (err) {
    if(isDone) return 
    isDone = true
    callback (err, drone)
  }

  function abort () {
    cancelled = true
    m.stop()
  }

  function onEarlyExit(){
    //if the app crashes before the port is bound, then do not restart it!!!
    cancelled = true
    m.stop() // just to be sure
    done(new Error('drone exited before port was bound'))
  }

  m.on('restart', function () {
    console.error('restart!')
    drone.process = m.child
  })
  m.on('start', function () {
    drone.process = m.child
    drone.emit('start')
    //start polling for a port.
    var port = null
    async.whilst(
      function test() {
        return !(cancelled || drone.port)
      },
      function loop (next) {
        lsof(drone.process.pid,function (err, ports) {
          if(ports.length) {
            drone.port = +(ports[0].port)
            //if the drone crashes now, restart it
            m.removeListener('exit', onEarlyExit)
            drone.emit('port', drone.port)
          }
          next()
        })       
      },
      function () {
        if(!cancelled) done()
        //else, wait for the child to exit, and that will pass an error to done
      }
    )
  })
  m.start()
  m.child.on('exit', onEarlyExit)
  attachEvents(m, drone)
  m.once('error', done)
  return abort
}

// an application server is _nearly_ a CI server.
// basically, all that is needed to make haibu a CI server is to finish this function
//
// will be necessary to use a timeout, and to kill the tree of child processes.
// but this will work if the test process exits by it self

exports.test = function (drone, config, callback) {
  if ('function' == typeof config) callback = config, config = {}
  var testCmd = ninja.path(drone, ['package','scripts','test'])
    , aborted
    ;
  if(!testCmd) {
    var result = {code: 1, status: 'Error', message: 'no test script'}
    drone.emit('result', result)
    return callback({error: 'no test script'}, result)
  }
  var test = spawn('sh', ['-c', testCmd], {cwd: drone.dir})

  emitChildEvents(test, drone)
  test.on('exit', function (code) {
    var result = {code: code, status: aborted ? 'Aborted' : code ? 'Failure' : 'Success'}
    drone.emit('result', result)
    callback(aborted, result)
  })
  
  return function () {
    aborted = new Error('aborted test')
    //must be a bit more heavy handed here, because the test may have spawned children.
    psTree(test.pid, function (err, children) {
        var pids = children.map(function (p) {
          return p.PID;
        });

        pids.unshift(test.pid);
        spawn('kill', ['-9'].concat(pids)).on('exit', function () {
          //self.emit('stop', self.childData);
        });
      });
  }
}

exports.stop = function (drone, callback) {
  drone.monitor.once ('stop', function (d) {
    callback(null, d)
  })
  drone.monitor.stop()
  return function () {
    //this can't actually be cancelled
  }
}

exports.restart = function (drone, callback) {
  drone.monitor.once  ('restart', function () {
    callback(null, drone)
  })
  drone.monitor.restart()
  return function () {
    //can't be cancelled
  }
}
