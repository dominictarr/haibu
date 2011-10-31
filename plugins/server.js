var http = require('http')

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
    removeAll: function () {
      removeAll(events)   
    }
  }
}
module.exports = function (haibu, config) {

  function deploy(req, res) {
    res.writeHead(200, {'content-type': 'application/json'})
    //add event listeners, then on a given end event, remove them all.
    var drone = haibu.deploy(req, {})

    var eRes = eventResponse(drone, res)
    ;['stderr', 'stdout', 'start', 'restart', 'package', 'exit', 'install', 'port'].forEach(eRes.add)

    drone.once('port', function (port) {
      eRes.removeAll()
      res.end()
    })
  }

  function test(req, res) {
    var drone = haibu.test(req, {})
    //add event listeners, then on a given end event, remove them all.
    var eRes = eventResponse(drone, res)
    ;['stderr', 'stdout', 'start', 'restart', 'package', 'exit', 'install','install-error', 'result'].forEach(eRes.add)
    drone.once('result', function () {
      eRes.removeAll()
      res.end()
    })
  }

  function info(req, res) {
    //add event listeners, then on a given end event, remove them all.
      var infos = haibu.all().map(function (drone) { return drone.info() })
      send(res, 200, infos)
  }
  
  function _404 (req, res) {
    send(res, 404, {url: req.url, method: req.method, message: 'don\'t know that one'})
  }

  var handler = function (req, res) {
    function match(rx) {
      var m = rx.exec(req.url)
      if(m) {
        req.args = m.slice(1)
        return true
      }
    }

    var method = req.method
      var handler = 
      ( method == 'POST' || method == 'PUT' ? (
          match(/^\/drones\/([0-9a-zA-Z_\-]+)\/deploy/)   ? deploy
        : match(/^\/drones\/([0-9a-zA-Z_\-]+)\/test/)     ? test
//        : match(/^\/drones\/([0-9a-zA-Z_\-]+)\/stop/)     ? stop
//        : match(/^\/drones\/([0-9a-zA-Z_\-]+)\/restart/)  ? restart
        : null ) 
      : method == 'GET' ? (
          match(/^\/drones(\/[0-9a-zA-Z_\-]+)?\/?$/)         ? info
        : null) 
      : null 
      ) || _404
      console.error(handler)
      handler(req, res)
    }
  var port = config.port || 9002
  http.createServer(handler).listen(port, function () {console.error('Haibu listening on '+port)})
  }
