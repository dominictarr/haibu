var http = require('http')
  , url = require('url')
  , qs = require('querystring')
  , connect = require('connect')
  ;

function send(res, status, obj) {
  res.writeHeader(status, {'content-type': 'application/json'})
    res.end(JSON.stringify(obj)+ '\n')
}

function eventResponse(emitter, res) {
  var events = []
  function add(event, listener) {
    var newListener = function (data) {
      listener.call(null, event, Buffer.isBuffer(data) ? data.toString() : data )
    }
    emitter.on(event, newListener)
    return [emitter, event, newListener]
  }
  function removeAll(array) {
    array.forEach(function (ary) {
      ary[0].removeListener(ary[1], ary[2])
    })
  }
  function writeEvent (event) {
    var json
    try { json = JSON.stringify([].slice.call(arguments)) } catch (err) { json = JSON.stringify([event, "[CIRCULAR]"]) }
    res.write(json+'\n')
  }
  return {
    add: function (event, listener) {
      events.push(add(event, 'function' == typeof listener ? listener : writeEvent))
      return this
    },
    emit: writeEvent,
    removeAll: function () {
      removeAll(events)   
    }
  }
}
module.exports = function (haibu, config) {

  function deploy(req, res, next) {
    res.writeHead(200, {'content-type': 'application/json'})
    //add event listeners, then on a given end event, remove them all.
    var meta = req.params
    meta.env = req.query

    var drone = haibu.deploy(req, meta)

    console.error(req.query)

    var eRes = eventResponse(drone, res)
    ;['stderr', 'stdout', 'start', 'restart', 'package', 'exit', 'install', 'port'].forEach(eRes.add)

    drone.once('port', function (port) {
      eRes.emit('info', drone.info())
      eRes.removeAll()
      res.end()
    })
  }

  function test(req, res, next) {
    var meta = req.params
    meta.env = req.query

    var drone = haibu.test(req, meta)
    //add event listeners, then on a given end event, remove them all.
    var eRes = eventResponse(drone, res)
    ;['stderr', 'stdout', 'start', 'restart', 'package', 'exit', 'install','install-error', 'result'].forEach(eRes.add)
    drone.once('result', function () {
      eRes.removeAll()
      res.end()
    })
  }

  function stop (req, res, next) {
    var drone = haibu.get(req.args.shift())
    var eRes = eventResponse(drone, res)
    ;['stderr', 'stdout', 'exit', 'stop'].forEach(eRes.add)
    drone.once('exit', function () {
      eRes.removeAll()
      res.end()
    })
    haibu.stop(drone.id)

  }

  function info(req, res, next) {
    //add event listeners, then on a given end event, remove them all.
      var infos = haibu.all().map(function (drone) { return drone.info() })
      send(res, 200, infos)
  }
  
  function error (err, req, res, next) {
    var status = 'number' == typeof err ? status : 500
    send(res, 404, {url: req.url, method: req.method, message: (err && err.message) || 'don\'t know that one'})
  }

var handler = 
  connect(
    connect.query(),
    connect.router(function (app) {
      app.put('/deploy/-/:instance?'      , deploy)
      app.put('/deploy/:group?/:instance?', deploy)
      app.put('/test/-/:instance?'        , test)
      app.put('/test/:group?/:instance?'  , test)

      app.post('/stop/-/:instance'        , stop)
      app.post('/stop/:group'             , stop)

      app.post('/restart/-/:instance'     , stop)
      app.post('/restart/:group'          , stop)

      app.get('/-/:instance?'             , info)
      app.get('/:group?'                  , info)
    }),
    error
//    connect.errorHandler()
  )

  var port = config.port || 9002
  handler.listen(port, function () {console.error('Haibu listening on '+port)})
  }
