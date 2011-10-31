var hookio = require('hook.io'),
    path = require('path'),
    attachEvents = require('../lib/utils').attachEvents,
    forever = require('forever')
    ;


// implementation of start tool, that uses carapace and hook.io to detect the port.

module.exports = function (config, callback) {
  var hook = new hookio.Hook(config);
  hook.listen(config, function (err) {
    console.error('Hook listening')
    return err ? callback(err) : callback(null, hook);
  });


  return {
    start: function (drone, config, callback) {
      var options
      if(config['hook-port']) {
        options = ['--hook-port', config['hook-port']]
      }
      else {
        options = []
      }

      var foreverOptions = {
            silent:    true,
            cwd:       drone.dir,
            hideEnv:   config.hideEnv,
            env:       drone.env,
            minUptime: config.minUptime,
            command:   path.join(require.resolve('haibu-carapace'), '..', '..', 'bin', 'carapace'),
            options:   options
          };

      foreverOptions.forever = typeof config.maxRestart === 'undefined';
      if (typeof config.maxRestart !== 'undefined') {
        foreverOptions.max = self.maxRestart;
      }

      var monitor = new forever.Monitor(drone.startScript, foreverOptions);

      monitor.on('error', function () {
        //
        // 'error' event needs to be caught, otherwise
        // the haibu process will die
        //
      });


      //
      // If the `forever.Monitor` instance emits an error then
      // pass this error back up to the callback.
      //
      // (remark) this may not work if haibu starts two apps at the same time
      //
      var responded
      function onError (err) {
        if (!responded) {
          responded = true;
          callback(err);

          //
          // Remove listeners to related events.
          //
          monitor.removeListener('exit', onExit);
          hook.removeListener('*::carapace::port', onCarapacePort);
        }
      }

      //
      // When the carapace provides the port that the drone
      // has bound to then respond to the callback
      //
      // Remark: What about `"worker"` processes that never
      // start and HTTP server?
      //

      function onCarapacePort (info) {
        if (!responded) {
          responded = true;
          console.error(info)
        
          monitor.minUptime = 0;
          drone.port = info.port
          drone.emit('port', info.port)
          callback(null, drone)
          //
          // Remove listeners to related events
          //
          monitor.removeListener('exit', onExit);
          monitor.removeListener('error', onError);
        }
      }

      //
      // When the drone starts, update the result that
      // we will respond with and continue to wait for
      // `*::carapace::port` from `haibu-carapace`.
      //
      function onStart (monitor, data) {
        result = {
          monitor: monitor,
          process: monitor.child,
          data: data
        };
      }

      //
      // If the drone exits prematurely then respond with an error
      // containing the data we receieved from `stderr`
      //
      function onExit () {
        if (!responded) {
          responded = true;
          error = new Error('Error spawning drone');
          error.stderr = stderr.join('\n')
          callback(error);

          //
          // Remove listeners to related events.
          //
          monitor.removeListener('error', onError);
          hook.removeListener('*::carapace::port', onCarapacePort);
        }
      }

      //
      // Listen to the appropriate events and start the drone process.
      //
      attachEvents(monitor, drone)
      hook.once('*::carapace::port', onCarapacePort);
      monitor.start();
    }
  }
}