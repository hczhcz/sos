'use strict';

var domain = require('domain');
var socks = require('socksv5');
var io = require('socket.io-client');

process.on('uncaughtException', function (err) {
    console.log(err);
});

var isocket = io.connect(process.argv[3]);

var netsock = {};

var server = socks.createServer(function (info, accept, deny) {
    console.log('socks5 open ' + info.dstAddr + ':' + info.dstPort);
    if (
        info.srcAddr !== '127.0.0.1'
        && info.srcAddr !== '::ffff:127.0.0.1'
        && info.srcAddr !== '::1'
    ) {
        console.log('from ' + info.srcAddr + ':' + info.srcPort);
    }

    var id = Math.random() * 1048576 | 0;
    var nsocket = netsock[id] = accept(true);

    var d = domain.create();
    d.on('error', function (err) {
        console.log(err);

        delete netsock[id];
        d.dispose();
    });

    d.add(nsocket);
    d.run(function () {
        isocket.emit('open', {
            id: id,
            host: info.dstAddr,
            port: info.dstPort,
        });

        nsocket.on('data', function (buffer) {
            isocket.emit('data', {
                id: id,
                buffer: buffer,
            });
        });

        nsocket.on('end', function () {
            isocket.emit('end', {
                id: id,
            });
        });

        nsocket.on('close', function () {
            isocket.emit('close', {
                id: id,
            });
        });
    });
});

isocket.on('connect', function () {
    console.log('socket.io connect');
});

isocket.on('data', function (data) {
    if (netsock[data.id | 0]) {
        netsock[data.id | 0].write(data.buffer);
    }
});

isocket.on('end', function (data) {
    if (netsock[data.id | 0]) {
        netsock[data.id | 0].end();
    }
});

isocket.on('close', function (data) {
    if (netsock[data.id | 0]) {
        delete netsock[data.id | 0];
    }
});

isocket.on('disconnect', function () {
    console.log('socket.io disconnect');
});

server.listen(parseInt(process.argv[2], 10), 'localhost', function () {
    //
});

server.useAuth(socks.auth.None());
