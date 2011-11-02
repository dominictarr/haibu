/*
 * drone-test.js: Tests for the `Drone` resource.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    sys = require('sys'),
    eyes = require('eyes'),
    vows = require('vows'),
    data = require('../fixtures/apps'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu'),
    Drone = haibu.drone.Drone;

var ipAddress = '127.0.0.1',
    app = data.apps[0];

//
// Add a user property to the app
//
app.user = 'marak';

vows.describe('haibu/drone/drone').addBatch(helpers.requireHook()).addBatch({
  "An instance of haibu.drone.Drone": {
    "when passed a valid app json": {
      "the start() method": {
        topic: function () {
           var that = this,
               sourceDir = path.join(__dirname, '..', 'fixtures', 'repositories', 'delayed-fail'),
               pkgJson = fs.readFileSync(path.join(sourceDir, 'package.json')),
               delayFail = JSON.parse(pkgJson),
               drone;
            
           drone = this.drone = new Drone({
             minUptime: 2000,
             host: ipAddress,
             maxRestart: 3
           });

          delayFail.user = 'charlie';
          delayFail.repository.directory = sourceDir;
          drone.start(delayFail, this.callback);
        },
        "after the user has made the application crash": {
          topic: function () {
            this.pids = Object.keys(this.drone.apps['delayed-fail'].drones);
            setTimeout(this.callback.bind(this, null, this.pids, this.drone), 3000);
          },
          "should have an updated pid for the drone": function (_, pids, drone) {
            assert.isObject(drone);
            var updatedPids = Object.keys(drone.apps['delayed-fail'].drones);
            console.error('PIDS', pids[0], updatedPids[0])
            assert.length(pids, 1);
            assert.notEqual(pids[0], updatedPids[0]);
          },
          ".list() should return an updated pid" : function (_, pids, drone ){
          
            var updatedPids = Object.keys(drone.apps['delayed-fail'].drones);
            var listed = drone.list()['delayed-fail'].drones[0]
            assert.equal(listed.pid, updatedPids[0])
          }
        }
      }
    }
  }
}).export(module);
