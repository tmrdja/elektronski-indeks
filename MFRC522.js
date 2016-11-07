var SerialPort = require('serialport');
var Promise = require('promise');

var MFRC522 = function(device, baudRate) {
    var commands = [
            'open_card',
            'get_type',
            'get_uid',
            'read_year',
            'write_subject',
            'read_info',
            'write_info',
            'init_subject'
        ],
        port = null,
        callbacks = [],
        self = this;

    function receiveResponse(data) {
        //console.log('onData', data);
        data = new Buffer(data.slice(0, data.length - 2), 'utf8').toString();
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
        //
        if (success == MFRC522.StatusCode.STATUS_OK) {
            callback.fulfill.call(null, res);
        } else {
            console.log('on data Error', success, d);
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
            //parser: SerialPort.parsers.readline('\r\n')
            parser: SerialPort.parsers.byteDelimiter([13, 10])
        });

        port.on('open', showPortOpen);
        port.on('data', receiveResponse);
        port.on('close', showPortClose);
        port.on('error', showError);
    }

    this.executeCommand = function(cmdName, arg) {
        var promise = new Promise(function(fulfill, reject) {
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
        //console.log("CMD:", cmd);
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
        } else if (typeof(data) == 'string') {
            for (var i = 0; i < data.length; i += 2) {
                bytes.push(parseInt(data.substring(i, i + 2), 16));
            }
        } else {
            throw 'Data must be string or array of bytes';
        }
        //console.log('parseData', bytes);
        return bytes;
    }

    this.open = function() {
        return self.executeCommand('open_card').then(function(res) {
            //console.log('openCard', res)
            var type = parseInt(res.data.shift())
            return {
                status: res.status,
                uid: res.data.map(function(r) {
                    return parseInt(r);
                }),
                type: type
            };
        }, function(err) {
            throw err;
        });
    }

    this.getUID = function() {
        return self.executeCommand('get_uid', arguments);
    }

    this.getType = function() {
        return self.executeCommand('get_type', arguments).then(function(res) {
            res.data = parseInt(res.data);
            return res;
        }, function(err) {
            throw err;
        });
    }

    this.readYear = function(year) {
        return self.executeCommand('read_year', [year]).then(function(res) {
            //console.log('read_year', res);
            if (res.data == null) {
                res.data = [];
            } else {
                if (!(res.data instanceof Array)) {
                    res.data = [res.data];
                }
                res.data = res.data.map(function(data) {
                    var d = data.split('.');
                    //console.log(d);
                    var subject = {};
                    subject.index = parseInt(d[0]);
                    subject.semester = parseInt(d[1]);
                    subject.required = parseInt(d[2]) == 1;
                    subject.espb = parseInt(d[3]);
                    subject.signed = parseInt(d[4]) == 1;
                    subject.credits = [];
                    for (var i = 5; i < 10; i++) {
                        subject.credits.push(parseInt(d[i]));
                    }
                    subject.mark = parseInt(d[10]);
                    subject.date = new Date(parseInt(d[13]), parseInt(d[12]), parseInt(d[11]));
                    subject.code = d[14];
                    subject.name = d[15];
                    subject.teacherName = d[16];
                    /*subject.code = d.slice(0, 5).reduce(function (p, v) {
                        return p + String.fromCharCode(v);
                    }, '').match(/[0-9a-zA-Z]{3,5}/)[0];*/
                    return subject;
                });
            }
            //console.log('readYear subjects', year, res.data);
            return res;
        }, function(err) {
            throw err;
        });
    }

    this.writeSubject = function(subject, key) {
        if (subject.index > 40 || subject.index < 0) throw "Index must be 0 - 40";
        /*key = '';
        for (var i = 0; i < 6; i++) {
            key += String.fromCharCode(255);
            //console.log(key.charCodeAt(i), key.charAt(i));
        }*/
        var data = [
            subject.index,
            key.charCodeAt(0),
            key.charCodeAt(1),
            key.charCodeAt(2),
            key.charCodeAt(3),
            key.charCodeAt(4),
            key.charCodeAt(5),
            (subject.signed) ? 1 : 0,
            subject.credits[0],
            subject.credits[1],
            subject.credits[2],
            subject.credits[3],
            subject.credits[4],
            Math.max(5, Math.min(10, subject.mark)),
            subject.date.getDate(),
            subject.date.getMonth(),
            subject.date.getFullYear()
        ];
        return self.executeCommand('write_subject', data);
    }

    this.initSubject = function(index, subject) {
        if (index > 39 || index < 0) throw "Index must be 0 - 39";
        var data = [
            index,
            subject.rfidKey.charCodeAt(0),
            subject.rfidKey.charCodeAt(1),
            subject.rfidKey.charCodeAt(2),
            subject.rfidKey.charCodeAt(3),
            subject.rfidKey.charCodeAt(4),
            subject.rfidKey.charCodeAt(5),
            subject.semester,
            (subject.required) ? 1 : 0,
            subject.espb,
            (typeof subject.code === 'string') ? subject.code.substr(0, 5) : '',
            (typeof subject.name === 'string') ? subject.name.substr(0, 34).replace(/[,;]/g, ' ') : '',
            (typeof subject.teacherName === 'string') ? subject.teacherName.substr(0, 32).replace(/[,;]/g, ' ') : ''
        ];
        return self.executeCommand('init_subject', data);
    }

    this.readStudentInfo = function() {
        return self.executeCommand('read_info').then(function(res) {
            //console.log('info', res.data);
            var data = {
                firstname: res.data[0],
                lastname: res.data[1],
                middlename: res.data[2],
                faculty: res.data[3],
                city: res.data[4],
                number: parseInt(res.data[5]),
                startYear: parseInt(res.data[6]),
                course: res.data[7],
                type: parseInt(res.data[8]),
                degree: parseInt(res.data[9]),
                JMBG: res.data[10],
                birthCity: res.data[11],
                birthCountry: res.data[12],
                birthCountry: res.data[13],
                citizenship: res.data[14]
            };
            //console.log(data);
            res.data = data;
            return res;
        }, function(err) {
            throw err;
        });
    }

    this.writeStudentInfo = function(info) {
        var arg = [
            (typeof info.firstname === 'string') ? info.firstname.substr(0, 25) : '',
            (typeof info.lastname === 'string') ? info.lastname.substr(0, 25) : '',
            (typeof info.middlename === 'string') ? info.middlename.substr(0, 25) : '',
            (typeof info.faculty === 'string') ? info.faculty.substr(0, 32) : '',
            (typeof info.city === 'string') ? info.city.substr(0, 17) : '',
            info.number,
            info.startYear,
            (typeof info.course === 'string') ? info.course.substr(0, 25) : '',
            info.type,
            info.degree,
            (typeof info.JMBG === 'string') ? info.JMBG.substr(0, 13) : '',
            (typeof info.birthCity === 'string') ? info.birthCity.substr(0, 17) : '',
            (typeof info.birthCounty === 'string') ? info.birthCounty.substr(0, 17) : '',
            (typeof info.birthCountry === 'string') ? info.birthCountry.substr(0, 17) : '',
            (typeof info.citizenship === 'string') ? info.citizenship.substr(0, 17) : ''
        ];
        return self.executeCommand('write_info', arg);
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
