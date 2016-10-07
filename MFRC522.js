var SerialPort = require('serialport');
var Promise = require('promise');

var MFRC522 = function (device, baudRate) {
    var commands = [
        'open_card',
        'get_type',
        'get_uid',
        'read_year',
        'write_subject',
        'read_info',
        'write_info'
    ],
        port = null,
        callbacks = [],
        self = this;

    function receiveResponse(data) {
        //console.log('onData', data);
        var d = data.split(',');
        var callback = callbacks.shift();
        var success = parseInt(d.shift());
        var res = {
            status: success
        };
        if (d.length == 1) {
            res.data = d[0];
        } else if (d.length > 1) {
            res.data = d;
        }
        //console.log('onData', success, d, callback);
        if (success == MFRC522.StatusCode.STATUS_OK) {
            callback.fulfill.call(null, res);
        } else {
            callback.reject.call(null, res);
        }
    }

    function showPortOpen() {
        console.log('port open. Data rate: ' + port.options.baudRate);
    }

    function showPortClose() {
        console.log('port closed.');
    }

    function showError(error) {
        console.log('Serial port error: ' + error);
    }

    function init() {
        port = new SerialPort(device, {
            baudRate: (baudRate != null) ? baudRate : 9600,
            // look for return and newline at the end of each data packet:
            parser: SerialPort.parsers.readline('\r\n')
        });

        port.on('open', showPortOpen);
        port.on('data', receiveResponse);
        port.on('close', showPortClose);
        port.on('error', showError);
    }

    this.executeCommand = function (cmdName, arg) {
        var promise = new Promise(function (fulfill, reject) {
            callbacks.push({
                fulfill: fulfill,
                reject: reject
            });
        });
        var id = commands.indexOf(cmdName);
        var params = '';
        if (arg != null) {
            params = Array.prototype.slice.call(arg).join(',');
        }
        var cmd = id + ':' + params + ';';
        //console.log("CMD: ", cmd);
        port.write(cmd);
        return promise;
    }

    /*function pad(num, size) {
        var s = num+"";
        while (s.length < size) s = "0" + s;
        return s;
    }*/

    function parseData(data, bytes) {
        if (bytes == null) {
            bytes = [];
        }
        if (data instanceof Array) {
            Array.prototype.push.apply(bytes, data)
        } else if (typeof (data) == 'string') {
            for (var i = 0; i < data.length; i += 2) {
                bytes.push(parseInt(data.substring(i, i + 2), 16));
            }
        } else {
            throw 'Data must be string or array of bytes';
        }
        //console.log('parseData', bytes);
        return bytes;
    }

    this.open = function () {
        return self.executeCommand('open_card').then(function (res) {
            //console.log('openCard', res)
            var type = parseInt(res.data.shift())
            return {
                status: res.status,
                uid: res.data.map(function (r) {
                    return parseInt(r);
                }),
                type: type
            };
        }, function (err) {
            throw err;
        });
    }

    this.getUID = function () {
        return self.executeCommand('get_uid', arguments);
    }

    this.getType = function () {
        return self.executeCommand('get_type', arguments).then(function (res) {
            res.data = parseInt(res.data);
            return res;
        }, function (err) {
            throw err;
        });
    }

    this.readYear = function (year) {
        return self.executeCommand('read_year', [year]).then(function (res) {
            //console.log('read_year', res);
            if (res.data == null) {
                res.data = [];
            } else {
                if (!(res.data instanceof Array)) {
                    res.data = [res.data];
                }
                res.data = res.data.map(function (data) {
                    var d = data.split('.');
                    var subject = {}
                    subject.code = d.slice(0, 5).reduce(function (p, v) {
                        return p + String.fromCharCode(v);
                    }, '').match(/[0-9a-zA-Z]{3,5}/)[0];
                    subject.credits = parseInt(d[5]);
                    subject.mark = parseInt(d[6]);
                    subject.date = new Date(parseInt(d[9]), parseInt(d[8]), parseInt(d[7]));
                    return subject;
                });
            }
            //console.log('readYear subjects', year, res.data.length);
            return res;
        }, function (err) {
            throw err;
        });
    }

    this.writeSubject = function (year, index, subject) {
        if (year > 4 || year < 1) throw "Year must be 1 - 4";
        if (index > 14 || index < 0) throw "Year must be 0 - 14";
        var data = [
            year,
            index,
            subject.code.charCodeAt(0),
            subject.code.charCodeAt(1),
            subject.code.charCodeAt(2),
            subject.code.charCodeAt(3),
            subject.code.charCodeAt(4),
            Math.max(0, Math.min(100, subject.credits)),
            Math.max(5, Math.min(10, subject.mark)),
            subject.date.getDate(),
            subject.date.getMonth(),
            subject.date.getFullYear()
        ];
        return self.executeCommand('write_subject', data);
    }

    this.readStudentInfo = function () {
        return self.executeCommand('read_info').then(function (res) {
            var data = {
                firstname: res.data[0],
                lastname: res.data[1],
                faculty: res.data[2],
                city: res.data[3],
                number: parseInt(res.data[4]),
                startYear: parseInt(res.data[5]),
                course: res.data[6],
                JMBG: res.data[7]
            };
            //console.log(data);
            res.data = data;
            return res;
        }, function (err) {
            throw err;
        });
    }

    this.writeStudentInfo = function (info) {
        return self.executeCommand('write_info', [
            info.firstname,
            info.lastname,
            info.faculty,
            info.city,
            info.number,
            info.startYear,
            info.course,
            info.JMBG
        ]);
    }

    init();
}

MFRC522.PICC_Type = {
    UNKNOWN: 0,
    ISO_14443_4: 1, // PICC compliant with ISO/IEC 14443-4 
    ISO_18092: 2, // PICC compliant with ISO/IEC 18092 (NFC)
    MIFARE_MINI: 3, // MIFARE Classic protocol, 320 bytes
    MIFARE_1K: 4, // MIFARE Classic protocol, 1KB
    MIFARE_4K: 5, // MIFARE Classic protocol, 4KB
    MIFARE_UL: 6, // MIFARE Ultralight or Ultralight C
    MIFARE_PLUS: 7, // MIFARE Plus
    TNP3XXX: 8, // Only mentioned in NXP AN 10833 MIFARE Type Identification Procedure
    NOT_COMPLETE: 0xff // SAK indicates UID is not complete.
};

MFRC522.StatusCode = {
    STATUS_OK: 0, // Success
    STATUS_ERROR: 1, // Error in communication
    STATUS_COLLISION: 2, // Collission detected
    STATUS_TIMEOUT: 3, // Timeout in communication.
    STATUS_NO_ROOM: 4, // A buffer is not big enough.
    STATUS_INTERNAL_ERROR: 5, // Internal error in the code. Should not happen ;-)
    STATUS_INVALID: 6, // Invalid argument.
    STATUS_CRC_WRONG: 7, // The CRC_A does not match
    STATUS_MIFARE_NACK: 0xff // A MIFARE PICC responded with NAK.
};

exports.MFRC522 = MFRC522;