
var ninja = require('ninja-tools'),
    forever = require('forever'),
    path = require('path'),
    util = require('util'),
    events = require('events')
    ;

//
// a drone is an EventEmitter that represents the state of a child process.
//

// all Haibu functions will return a drone,
// and then the service will respond with a stream of events, 
// depending on what it's trying to do with the drone.

module.exports = Drone

util.inherits(Drone , events.EventEmitter)

function Drone (dir, meta) {
  this.dir = dir
  ninja.mixin(this, meta)
  this.env = this.env || {}
  this.id = 'drone_' + ninja.randomString(128)
  this.ctime = Date.now ()
  events.EventEmitter.call(this)
  this.info = function () {

    var out = {
      id: this.id,
      port: this.port,
      name: this.package.name,
      ctime: this.ctime,
      pid: ninja.path(this, 'child','pid')
    }
    return out
  }
}