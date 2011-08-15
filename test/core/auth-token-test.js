/*
 * auth-token-test.js: Tests for the authToken verification feature.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var vows = require('vows'),
    helpers = require('../helpers'),
    assert = require('assert'),
    eyes = require('eyes'),
    request = require('request'),
    haibu = require('../../lib/haibu');

var ipAddress = '127.0.0.1',
    port = 9020, server, store;

function makeRequest(token) {
  return function () {
    var callback = this.callback;

    request({
      uri: 'http://' + ipAddress + ':' + port + '/version',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': token
      }
    }, function(err, res, body) {
      callback(err, {
        response: res,
        body: body
      });
    });
  };
};

vows.describe('haibu/authToken').addBatch(
  helpers.requireInit(function () {
    haibu.config.set('authToken', 'secret');
    server = haibu.drone.createServer({
      port: port,
      host: ipAddress,
      maxRestart: 1
    });
  })
).addBatch({
  'When doing': {
    'unauthorized request': {
      topic: makeRequest('incorrect-token'),
      'should fail with 403 error': function (res) {
        assert.equal(res.response.statusCode, 403);
      }
    },
    'authorized request': {
      topic: makeRequest('secret'),
      'should work as expected': function (res) {
        assert.equal(res.response.statusCode, 200);
      }
    }
  }
}).export(module);
