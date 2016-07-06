'use strict';

var domain = require('domain');
var socks = require('socksv5');
var ws = require('ws');

process.on('uncaughtException', function (err) {
    console.log(err.stack);
});

var server = socks.createServer(function (info, accept, deny) {
    if (
        info.srcAddr !== '127.0.0.1'
        && info.srcAddr !== '::ffff:127.0.0.1'
        && info.srcAddr !== '::1'
    ) {
        console.log('from ' + info.srcAddr + ':' + info.srcPort);
    }
    console.log('open ' + info.dstAddr + ':' + info.dstPort);

    var d = domain.create();

    d.on('error', function (err) {
        console.log(err.stack);
        d.dispose();
    });

    d.run(function () {
        var wsocket = new ws(process.argv[3]);

        wsocket.onopen = function () {
            wsocket.send(JSON.stringify({
                host: info.dstAddr,
                port: info.dstPort,
            }), {binary: false});

            var nsocket = accept(true);

            nsocket.on('data', function (data) {
                wsocket.send(data, {binary: true, compress: true});
            });

            nsocket.on('close', function () {
                d.dispose();
            });

            wsocket.onmessage = function (message) {
                nsocket.write(message.data);
            };
        };
    });
});

server.useAuth(socks.auth.None());

server.listen(parseInt(process.argv[2], 10));
