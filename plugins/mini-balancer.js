var net = require('net')
  , ninja = require('ninja-tools')


// Mini-Balancer
//
// this is a super-simple, super fast proxy.
// it does not understand any http, it just 
// proxies any connection to the newest drone 
// that has a port bound... for zero-downtime updates.
//
// of course, it only works when there is only one app hosted on the haibu.
// if there are more than one app, write a more sophisticated balancer.
//
// TODO: count connections, and take down old apps when there are no users.

module.exports = function (haibu, config) {
  var port = config['balancer-port'] || 8080 
  net.createServer(function (sock) {
    //find the drone with the latest ctime that has a port bound.
    var drone = ninja.max(haibu.drones, function (drone) {
      return drone.port ? drone.ctime : null
    })
    
    if(drone) {
      var _sock = net.createConnection(drone.port)
      sock.pipe(_sock)
      _sock.pipe(sock)
      drone.connections = (drone.connections || 0) + 1
      console.error('OPEN', drone.name, drone.id, drone.connections)
      sock.on('close', function() {
        console.error('CLOSE', drone.name, drone.id, drone.connections)
      })
    }
    else {
      sock.write(raw404('NO DRONES'))
      sock.end()
    }
    
  }).listen(port, function () {
    console.error('mini-balancer listening on port:' + port)
  })

}

// there is something not right with this...
// however it's too late at night to fix.

function raw404 (message) {
  return [
    'HTTP/1.1 404 Not Found',
    'content-type: application/json',
    'Connection: close',
    'Transfer-Encoding: chunked',
    '',
    message.length,
    message,
    '',
    '0',
    '',
//    '',
  ].join('\r\n') + '\r\n'
}
