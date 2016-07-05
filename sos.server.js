'use strict';

var domain = require('domain');
var net = require('net');
var http = require('http');
var io = require('socket.io');

process.on('uncaughtException', function (err) {
    console.log(err);
});

var server = http.createServer(function (req, res) {
    console.log('http ' + req.connection.remoteAddress);
});

server.listen(parseInt(process.argv[2], 10));

var netsock = {};

io(server).on('connect', function (isocket) {
    console.log('socket.io connect ' + isocket.conn.remoteAddress);

    isocket.on('open', function (data) {
        console.log('socks5 open ' + data.host + ':' + data.port);

        var id = data.id | 0;
        var nsocket = netsock[id] = new net.Socket();

        var d = domain.create();
        d.on('error', function (err) {
            console.log(err);

            delete netsock[id];
            d.dispose();
        });

        d.add(nsocket);
        d.run(function () {
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
        console.log('socket.io disconnect ' + isocket.conn.remoteAddress);
    });
});
