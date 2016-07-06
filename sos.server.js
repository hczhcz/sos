'use strict';

var domain = require('domain');
var net = require('net');
var ws = require('ws');

process.on('uncaughtException', function (err) {
    console.log(err.stack);
});

var server = ws.Server({
    port: parseInt(process.argv[2], 10)
});

server.on('connection', function (wsocket) {
    // console.log('from ' + wsocket.???.remoteAddress);

    var d = domain.create();

    d.add(wsocket);
    d.on('error', function (err) {
        console.log(err.stack);
        d.dispose();
    });

    d.run(function () {
        var nsocket = new net.Socket();

        wsocket.onmessage = function (message) {
            var info = JSON.parse(message.data);

            console.log('open ' + info.host + ':' + info.port);

            nsocket.connect({
                host: info.host,
                port: info.port,
            });

            nsocket.on('data', function (data) {
                wsocket.send(data, {binary: true, compress: true});
            });

            nsocket.on('close', function () {
                // wsocket.close();
            });

            wsocket.onmessage = function (message) {
                nsocket.write(message.data);
            };
        };
    });
});
