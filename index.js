#!/usr/bin/env node

var Promise = require('bluebird');
var cp = Promise.promisifyAll(require('child_process'));
var process = require('process');
var path = require('path');
var uuid = require('node-uuid');
var Stopwatch = require("node-stopwatch").Stopwatch;
var _ = require('lodash');
var argv = require('commander');

argv
  .option('-n, --num-requests <num_requests>', 'Number of requests to make concurrently', parseInt)
  .option('--ntlm', 'use NTLM auth')
  .option('--cred [user:pass]', 'credential')
  .arguments('<url>')
  .action(url => requestUrl = url)
  .parse(process.argv);

var NUM_REQUESTS = argv.numRequests;

var start = Date.now();

var requests = _.range(NUM_REQUESTS)
                .map(i => cp.execFileAsync(
                    'curl.exe', ['-sS', '-w', '%{http_code}', '-L',
                    argv.ntlm ? '--ntlm' : undefined, '-u', argv.cred,
                    requestUrl,
                    '-o', path.join(process.env.TEMP, uuid.v4())])
                  .then(res => {
                    console.log(`{ ${i},${Date.now()},${res} }`);
                    if (res !== '200') return Promise.reject({error: 'request failed: ' + res});
                  }));

console.log("Waiting for all to finish: " + requests.length);
Promise.all(requests).then(() => {
  console.log("All finished");
  var delta = Date.now() - start;
  console.log(
`
Requests: ${NUM_REQUESTS},
Duration: ${delta} ms,
ave. ${delta/NUM_REQUESTS} ms
req/sec: ${1000 * NUM_REQUESTS/delta}`);
}).catch(err => {
  console.log('REQUESTS FAILED:');
  console.log(err);
});
