var Drone = require('./drone'), 
    path = require('path'),
    u = require('utile'),
    events = require('events');

//
// the Haibu prototype is a facard around drone, it just calls the toolchain in the right order,
// and maintains the list of drones.
//
// the tool chain is where all the real work happens.
//

module.exports = Haibu
u.inherits(Drone , events.EventEmitter)

function droneDir(root) {
  return path.join(root || process.env.TMP || '/tmp', 'drone_' + Date.now())
}

function Haibu (options) {
  events.EventEmitter.call(this)
  this.config = options
  this.drones = []
}

var proto = Haibu.prototype

proto.deploy = function (tarballStream, meta) {
  var drone = new Drone(droneDir(this.config.root), meta)
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

proto.test = function (tarballStream, meta) {
  var drone = new Drone(droneDir(this.config.root), meta)
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

//tell haibu to update an app, hard.
//reinstall it, then restart it in the same place.
//planning to use haibu to update nodejitsu infrastructure also.
//master, and the balancer should be updateable via haibu.
//that will greatly simplify devops, 
//because it will only be necessary to have one image.
//those haibu's will be a little different.

//hmm, or what if haibu could update it's OWN code?
//it would need to start a daemon to oversee it's reincarnation,
//the the new code would be installed, the current process would die
//& the new process would be started. once ah... all that would need to happen is to
//upload a new version of the code, install it in the right place, then call forever 0 restart

//okay, so what needs to happen is there is a single master process that has all the children.
//you call to it to start a child process

/*
  proto.update = function (tarball, env) {

  
  }

*/


proto.get = function (id) {
  return u.find(this.drones, function (v,k){ 
    return v.instance == instance
  })
}

proto.filter = function (query) {
  return u.fitler(this.drones, function (v,k){ 
    if (query.group)
      return v.group == query.group
    if (query.instance)
      return v.instance == query.instance
  })
}


proto.stop = function (id) {
  //find the drone with the given id and stop it.
  var drone = this.get(id)
  this.tools.stop(drone, function () {})
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

//hard restart of the same app
proto.restart = function (id) {
  var drone = this.get(id)
  this.tools.restart(drone, function () {})
  return drone
}

proto.all = function () {
  console.error(this.drones)
  return this.drones
}
