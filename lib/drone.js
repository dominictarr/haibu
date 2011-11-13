
var u = require('utile'),
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

u.inherits(Drone , events.EventEmitter)

function Drone (dir, meta) {
  this.dir = dir

  u.mixin(this, meta)
  this.env = this.env || {}

  this.instance = this.instance || 'drone_' + u.randomString(32)

  if(!this.group || this.group === '-')
    this.group = this.group || 'G'+Date.now()
  
  this.ctime = Date.now ()
  events.EventEmitter.call(this)

  this.info = function () {

    var out = {
      port: this.port,
      name: this.package.name,
      group: this.group,
      instance: this.instance,
      ctime: this.ctime,
      pid: u.path(this, 'child','pid')
    }
    return out
  }
}