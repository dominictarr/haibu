

exports.attachEvents = function (monitor, drone) {
  ;['stop', 'start', 'restart', 'exit', 'stderr', 'stdout'].forEach(function (event) {
    monitor.on(event, function (){ 
      var l = arguments.length
      var args = new Array(l + 1)
      while(l) { args[l] = arguments[--l] }
      args[0] = event
      drone.emit.apply(drone, args)
    });
  });
}
