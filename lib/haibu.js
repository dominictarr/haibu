

var Drone = require('./drone'), 
    path = require('path'),
    util = require('util'),
    events = require('events')
    ;

//
// the Haibu prototype is a facard around drone, it just calls the toolchain in the right order,
// and maintains the list of drones.
//
// the tool chain is where all the real work happens.
//

module.exports = Haibu
util.inherits(Drone , events.EventEmitter)

function droneDir(root) {
  return path.join(root || process.env.TMP || '/tmp', 'drone_' + Date.now())
}

function Haibu (options) {
  events.EventEmitter.call(this)
  this.config = options
  this.drones = []
}

var proto = Haibu.prototype

proto.deploy = function (tarballStream, env) {
  var drone = new Drone(droneDir(this.config.root), env)
  this.drones.push(drone)
  var tools = this.tools
  var config = this.config
  tools.create(drone, tarballStream, function () {
    tools.init(drone, function () {
      tools.install(drone, function () {
        tools.start(drone, config, function () {
        })
      })
    })
  })
  return drone
}

proto.test = function (tarballStream, env) {
  var drone = new Drone(droneDir(this.config.root), env)
  this.drones.push(drone)
  var tools = this.tools
  tools.create(drone, tarballStream, function () {
    tools.init(drone, function () {
      tools.install(drone, function () {
        tools.test(drone, function () {
        })
      })
    })
  })
  return drone
}

proto.get = function (id) {
  return ninja.find(this.drones, function (v,k){ 
    return v.id == id
  })
}

proto.stop = function (id) {
  //find the drone with the given id and stop it.
  var drone = this.get(id)
  this.tools.stop(drone)
  // and clean?
  return drone   
}

proto.clean = function (id) {
  var drone = this.get(id)
  var tools = this.tools
  tools.stop(drone, function () {
    tools.clean(drone)
  })
  return drone
}

proto.restart = function (id) {
  var drone = this.get(id)
  this.tools.restart(drone)
  return drone
}

proto.all = function () {
  console.error(this.drones)
  return this.drones
}
