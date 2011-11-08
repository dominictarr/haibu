var sys = require('sys'),    
  http = require('http');

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('hello, i know nodejitsu!')

  res.end();
}).listen(process.env.PORT || 8001);

/* server started */  
sys.puts('> hello world running on port 8001');
