var spawn = require('child_process').spawn
  , path = require('path')
  
var __projectdir = path.join(__dirname, '../..')
  , tmp = process.env.TMP || '/tmp'
var tmpPath = path.join(tmp, 'test-start-test_' + Date.now())

var Drone = require('../../lib/drone')
  , dTools = require('../../lib/drone-tools')

exports.tarball = function (test) {

  var dir = path.join(__projectdir, 'fixtures', 'hellonode')
  
  var tar = spawn('tar', ['-cz'], {cwd: dir})
  
  var drone = new Drone(dir, {})
  
  dTools.create(drone, tar.stdout, function (err, drone) {
  
    dTools.init(drone, function (err, drone) {
      //drone should now have a package.json !
      
      console.error(drone.id, drone.package)
      test.done()
    })
  
  })

}