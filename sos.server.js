'use strict';

var net = require('net');
var http = require('http');
var io = require('socket.io');

var server = http.createServer(function (req, res) {
    console.log('http ' + req.connection.remoteAddress);
});

server.listen(2345);

io(server).on('connect', function (isocket) {
    console.log('socket.io connect ' + isocket.conn.remoteAddress);

    var netsock = {};

    isocket.on('open', function (data) {
        console.log('socks5 open ' + data.host + ':' + data.port);

        var id = data.id | 0;
        var nsocket = netsock[id] = new net.Socket();

        nsocket.connect({
            host: data.host,
            port: data.port,
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

    isocket.on('data', function (data) {
        netsock[data.id | 0].write(data.buffer);
    });

    isocket.on('end', function (data) {
        netsock[data.id | 0].end();
    });

    isocket.on('close', function (data) {
        delete netsock[data.id | 0];
    });

    isocket.on('disconnect', function () {
        console.log('socket.io disconnect ' + isocket.conn.remoteAddress);
    });
});
