var spawn = require('child_process').spawn
  , path = require('path')
  , a = require('assertions')
  
var __projectdir = path.join(__dirname, '../..')
  , tmp = process.env.TMP || '/tmp'
var tmpPath = path.join(tmp, 'test-start-test_' + Date.now())

var Drone = require('../../lib/drone')
  , dTools = require('../../lib/droneTools')

exports.tarball = function (test) {

  var dir = path.join(__projectdir, 'examples', 'testable')
  
  var tar = spawn('tar', ['-cz'], {cwd: dir})
  
  var drone = new Drone(dir, {})
  
  dTools.create(drone, tar.stdout, function (err, drone) {
  
    dTools.init(drone, function (err, drone) {
      //drone should now have a package.json !
      function log (line) {
        process.stdout.write(line)
      }
      drone.on('stdout', log)
      drone.on('stderr', log)
      dTools.test(drone, function (err, result) {
        console.error('RESULT', result)
        a.deepEqual(result, {code: 1, status: 'Failure'})
        test.done()
      })
    }) 
  })

}