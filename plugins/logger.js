

// a simple logger plugin. 
// it creates logger functions
// that log, then defer to the next thing in the proto type chain.
//
//
// of course, this is just an example... it could wrap the callbacks, and log that,
// or override methods, or change the arguments, or almost anything.

module.exports = function (haibu, config) {
  // keep a reference to itself, so that can identify the next item in the chain.
  // 'this' will refer to the top of the chain.
  var tools = {}
  function logger (name) {
    tools[name] = function (drone) {
      var callback = arguments[arguments.length - 1]
      console.error(name, drone.id)
      return tools.__proto__[name].apply(this, arguments)
    }
  }
  ;['create', 'init', 'start', 'test', 'stop', 'restart'].forEach(logger)
  return tools
}