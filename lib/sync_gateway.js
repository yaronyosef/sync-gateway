'use strict';
/**
 * Sync Gateway Rest Wrapper
 **/
var fs = require('fs')
var request = require('request-promise');
var Promise = require('bluebird');
var querystring = require('querystring');
var slashes = require('remove-trailing-slash')
var jsonRequest = {};
var remoteDb = ""
var baseUrl = ""
var jsonConf = "/Users/derrier/Downloads/couchbase-sync-gateway/bin/config.json"
var json = fs.readFileSync(jsonConf)
var defaultConfig = JSON.parse(json)
function SyncGateway(baseUrl, dbName) {
  this.baseUrl = baseUrl;
  this.dbName = dbName;
  this.remoteDb = remoteDb = this.baseUrl + '/' + dbName + '/';
  jsonRequest = request.defaults({
    baseUrl: this.remoteDb,
    json: true,
    timeout: 60000,
    time: true,
    headers: {'content-type': 'application/json'},
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
  if (opt && opt.keys) {
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

SyncGateway.prototype.deleteDoc = function(doc) {
  var options = {
    uri: '/' + doc.id + (doc._rev?'?_rev='+doc._rev:'')
  };
  return jsonRequest.delete(options);
};

SyncGateway.prototype.resetDb = function() {
var self = this;
  return self.allDocs().then(self.deleteAllDb.bind(self)).catch(function(e) {console.log(e)})
};

SyncGateway.prototype.deleteAllDb = function(docs) {
  var self = this
  var toDelete = docs.rows

  return Promise.map(toDelete, function(doc) {
    console.log(self)
    return self.deleteDoc(doc).then(self.purgeDb.bind(self)/*function(rep) { console.log(rep)}).catch(function(err) {console.log("ERRROR", err);}*/)
  }, {concurrency: 4});
}

SyncGateway.prototype.getUser = function(name) {
  return jsonRequest.get(`/_user/${name}`)
}
SyncGateway.prototype.createUser = function(res) {
  return jsonRequest.post("/_user/", {body: res})
}
SyncGateway.prototype.deleteUser = function(name) {
  return jsonRequest.delete(`/_user/${name}`)
}
SyncGateway.prototype.updateUser = function(name, res) {
  return jsonRequest.put(`/_user/${name}`, {body: res})
}


SyncGateway.prototype.purgeDb = function(docId) {
  console.log(docId)
  return jsonRequest.post({uri: '/_purge', json: true, body: JSON.stringify([docId]) }).catch(function(e) {if (e && e.statusCode && e.statusCode == 404) {} else throw new Error(e)})
}

SyncGateway.prototype.deleteDb = function() {
  return jsonRequest.delete({uri: '/'}).catch(function(e) {if (e && e.statusCode && e.statusCode == 404) {} else throw new Error(e)})
}

SyncGateway.prototype.createDb = function() {
  var specialRequest = jsonRequest.defaults({ body: "{}", json: false, resolveWithFullResponse: true})
  return specialRequest.put({uri: ''})
}

SyncGateway.prototype.updateDb = function() {
  var specialRequest = jsonRequest.defaults({ body: defaultConfig, json: true, resolveWithFullResponse: true})
  return specialRequest.put({uri: '_config'}).catch(function(e) {console.log(e)})
}

SyncGateway.prototype.resync = function() {
  var self = this;
  return jsonRequest.post({
    uri: '_offline'
  }).then(function() {
      return jsonRequest.post({
        uri: '_resync'
      })
  }).then(function() {
    return self.updateDb().then(function() {
      return jsonRequest.post({
        uri: '_online'
      })
    })
  }).catch(function(e) {
    console.log(e)
  })
};

module.exports = SyncGateway;
