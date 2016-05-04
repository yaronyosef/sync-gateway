'use strict';
/**
 * Sync Gateway Rest Wrapper
 **/

var request = require('request-promise');
var querystring = require('querystring');
var slashes = require('remove-trailing-slash')
var jsonRequest = {};
var remoteDb = ""
function SyncGateway(baseUrl, dbName) {
  this.baseUrl = baseUrl;
  this.dbName = dbName;
  this.remoteDb = remoteDb = this.baseUrl + '/' + dbName + '/';
  jsonRequest = request.defaults({
    baseUrl: this.remoteDb,
    json: true,
    timeout: 60000,
    time: true,
    transform: function (body, response, resolveWithFullResponse) {
      console.log(response.request.method + ' /' + response.url + ': ' + response.statusCode + ', time: ' + response.elapsedTime + 'ms');
      if (!(/^2/.test('' + response.statusCode))) { return resolveWithFullResponse ? response : body; }
      return body;
    }
  });
}

/**
 * Database Rest API
 **/

SyncGateway.prototype.info = function() {
  return jsonRequest.get({
    uri: ''
  });
};

SyncGateway.prototype.allDocs = function(opt) {
  var options = {
    uri : '/_all_docs'
  };
  if (opt.keys) {
    options.body = {
      keys: opt.keys
    };
    delete opt.keys;
    options.uri += '?' + querystring.stringify(opt);
    return jsonRequest.post(options);
  }
  else {
    options.uri += '?' + querystring.stringify(opt);
    return jsonRequest.get(options);
  }
};

SyncGateway.prototype.bulkDocs = function(docs) {
  var options = {
    uri: '/_bulk_docs',
    body: {
      docs: docs
    }
  };
  return jsonRequest.post(options);
};

// /**
//  * Document Rest API
//  **/

SyncGateway.prototype.get = function(docId) {
  var options = {
    uri: '/' + docId
  };
  return jsonRequest.get(options);
};

SyncGateway.prototype.post = function(doc) {
  var options = {
    uri: '/',
    body: doc
  };

  return jsonRequest.post(options);
};

SyncGateway.prototype.put = function(doc) {
  var options = {
    uri: '/' + doc._id + (doc._rev?'?_rev='+doc._rev:''),
    body: doc
  };

  return jsonRequest.put(options);
};

SyncGateway.prototype.delete = function(doc) {
  var options = {
    uri: '/' + doc._id + '?_rev='+ doc._rev
  };

  return jsonRequest.delete(options);
};

SyncGateway.prototype.deleteAll = function() {
  return jsonRequest.delete({uri: ''})
    .finally(function() {
       var specialRequest = jsonRequest.defaults({baseUrl:slashes(remoteDb), uri: ''})
       return specialRequest.put()
    });
};

SyncGateway.prototype.resync = function() {
  return jsonRequest.get({
    uri: '_offline'
  }).then(function() {
    return jsonRequest.get({
      uri: '_resync'
    })
  }).then(function() {
    return jsonRequest.get({
      uri: '_online'
    })
  })
};

module.exports = SyncGateway;
