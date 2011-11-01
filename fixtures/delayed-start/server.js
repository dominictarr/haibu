var sys = require('util'),    
  http = require('http'),
  port = process.env.PORT || 8001


var server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('hello, i know nodejitsu!')
  res.end();
})

setTimeout(function () {
  server.listen(port, function () {
    console.error('delayed-start listening on port ' + port)
  });
}, 2000)
