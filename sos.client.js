'use strict';

var socks = require('socksv5');
var io = require('socket.io-client');

var isocket = io('http://127.0.0.1:2345');

var netsock = {};

isocket.on('data', function (data) {
    netsock[data.id | 0].write(data.buffer);
});

isocket.on('end', function (data) {
    netsock[data.id | 0].end();
});

isocket.on('close', function (data) {
    delete netsock[data.id | 0];
});

var server = socks.createServer(function (info, accept, deny) {
    console.log('accept ' + info.dstAddr + ':' + info.dstPort);
    if (
        info.srcAddr !== '127.0.0.1'
        && info.srcAddr !== '::ffff:127.0.0.1'
        && info.srcAddr !== '::1'
    ) {
        console.log('from ' + info.srcAddr + ':' + info.srcPort);
    }

    var id = Math.random() * 1048576 | 0;
    var nsocket = netsock[id] = accept(true);

    isocket.emit('begin', {
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

server.listen(2333, 'localhost', function () {
    //
});

server.useAuth(socks.auth.None());
