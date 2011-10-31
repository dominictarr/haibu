var Haibu = require('./lib/haibu')
  , server = require('./plugins/server')
  , mini = require('./plugins/mini-balancer')
  , logger = require('./plugins/logger')
  , carapace = require('./plugins/carapace')
  , ProtoList = require('proto-list')

// config chain

//currently am only using this configuration.
//but should use a configuration chain, like the tool chain.
//take config from optimist, files, config server, etc

var config = {'hook-port': 5000, port: 9002}

// toolchain
//
// could create a more elegant way to setup the chain, but it would do the same thing as this.
// tools should get passed the config only.

var tools = {} // this is the head of the ProtoList, pass this to haibu.
var toolChain = new ProtoList()

toolChain.push(tools)
toolChain.push(logger(config))
toolChain.push(carapace(config, function (err) {console.error("carapace tools ready")}))
toolChain.push(require('./lib/drone-tools'))

var haibu = new Haibu(config)

haibu.tools = tools

//finally, these plugins do not form a chain, but they may control haibu.

server(haibu, config)
mini(haibu, config) //mini balancer

//also make a balancer plugin?
//could also do logging this way.