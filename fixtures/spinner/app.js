var http = require('http');

module.exports = http.createServer(function(req, res){
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('hello, i know nodejitsu.')
  res.end();
});

setTimeout(function () {
  throw "WILL THIS CRASH HAIBU?"
}, 10)