angular.module('app').service('Service', ['$http', '$q', '$mdDialog', function($http, $q, $mdDialog) {
    var fake = false;

    this.open = function() {
        if (fake) {
            return $q(function(res, rej) {
                res({
                    data: {
                        type: 5,
                        uid: [255, 43, 12, 0]
                    }
                });
            })
        }
        return $http({
            method: 'POST',
            url: 'openCard'
        });
    }

    this.getUid = function() {
        return $http({
            method: 'POST',
            url: 'getUid'
        });
    }

    this.getType = function() {
        return $http({
            method: 'POST',
            url: 'getType'
        });
    }

    this.getYear = function(year) {
        if (fake) {
            return $q(function(res, rej) {
                res({
                    data: {
                        data: [0, 0, 0, 0, 0, 0, 255, 15, 0, 233, 255, 255, 255, 255, 255, 255],
                        isValueBlock: false,
                        value: 0
                    }
                });
            })
        }
        var data = {
            method: 'POST',
            url: 'getYear',
            data: {
                year: year
            }
        };
        return $http(data);
    }

    this.saveSubject = function(subject) {
        var data = {
            method: 'POST',
            url: 'saveSubject',
            data: {
                subject: subject
            }
        };
        return $http(data);
    }

    this.deleteSubject = function(subject) {
        var data = {
            method: 'POST',
            url: 'deleteSubject',
            data: {
                subject: subject
            }
        };
        return $http(data);
    }

    this.writeSubject = function(subject, key) {
        var data = {
            method: 'POST',
            url: 'writeSubject',
            data: {
                subject: subject,
                key: key
            }
        };
        return $http(data);
    }

    this.readStudentInfo = function() {
        var data = {
            method: 'POST',
            url: 'readStudentInfo'
        };
        return $http(data);
    }

    this.writeStudentInfo = function(info) {
        var data = {
            method: 'POST',
            url: 'writeStudentInfo',
            data: info
        };
        return $http(data);
    }

    this.getStudents = function(data) {
        var data = {
            method: 'POST',
            url: 'getStudents',
            data: data
        };
        return $http(data);
    }

    this.getTeachers = function(data) {
        var data = {
            method: 'POST',
            url: 'getTeachers',
            data: data
        };
        return $http(data);
    }

    this.getTeacherSubjects = function(teacher) {
        var data = {
            method: 'POST',
            url: 'getTeacherSubjects',
            data: teacher
        };
        return $http(data);
    }

    this.addTeacherSubjects = function(teacher, subjects) {
        var data = {
            method: 'POST',
            url: 'addTeacherSubject',
            data: {
                teacher: teacher,
                subjects: subjects
            }
        };
        return $http(data);
    }

    this.deleteTeacherSubject = function(teacher, subject) {
        var data = {
            method: 'POST',
            url: 'deleteTeacherSubject',
            data: {
                teacher: teacher,
                subject: subject
            }
        };
        return $http(data);
    }

    this.saveUser = function(user) {
        var data = {
            method: 'POST',
            url: 'saveUser',
            data: {
                user: user
            }
        };
        return $http(data);
    }

    this.deleteUser = function(user) {
        var data = {
            method: 'POST',
            url: 'deleteUser',
            data: {
                user: user
            }
        };
        return $http(data);
    }


    this.getSubjects = function(data) {
        var data = {
            method: 'POST',
            url: 'getSubjects',
            data: data
        };
        return $http(data);
    }

    this.getModules = function() {
        var data = {
            method: 'POST',
            url: 'getModules'
        };
        return $http(data);
    }

    this.writeModule = function(module, student) {
        var data = {
            method: 'POST',
            url: 'writeModule',
            data: {
                module: module,
                student: student
            }
        };
        return $http(data);
    }

    this.deleteModule = function(module) {
        var data = {
            method: 'POST',
            url: 'deleteModule',
            data: {
                module: module
            }
        };
        return $http(data);
    }

    this.editModule = function(module) {
        var data = {
            method: 'POST',
            url: 'editModule',
            data: {
                module: module
            }
        };
        return $http(data);
    }

    this.getModuleSubjects = function(module, year) {
        var data = {
            method: 'POST',
            url: 'getModuleSubjects',
            data: {
                module: module,
                year: year
            }
        };
        return $http(data);
    }

    this.addModuleSubjects = function(module, subjects, year) {
        var data = {
            method: 'POST',
            url: 'addModuleSubjects',
            data: {
                module: module,
                subjects: subjects,
                year: year
            }
        };
        return $http(data);
    }

    this.deleteModuleSubject = function(module, subject, year) {
        var data = {
            method: 'POST',
            url: 'deleteModuleSubject',
            data: {
                module: module,
                subject: subject,
                year: year
            }
        };
        return $http(data);
    }

    this.setSubjectKey = function(subject, key) {
        var data = {
            method: 'POST',
            url: 'setSubjectKey',
            data: {
                key: key,
                subject: subject
            }
        };
        return $http(data);
    }

    this.padWith = function(s, n, c) {
        if (c == null) c = '0';
        if (s.length == n) return s;
        for (var i = s.length; i < n; i++) {
            s = c + s;
        }
        return s;
    }

    this.invertByte = function(value) {
        var i = null;
        if (Number.isInteger(value)) {
            i = 255 - value;
        } else {
            i = (255 - parseInt(value, 16));
            i = ((i < 16) ? '0' : '') + i.toString(16);
        }
        return i;
    }

    this.PICC_Type = {
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

    this.ACCESS_CONDITIONS = {
        '000': {
            read: "Key A|B",
            write: "Key A|B",
            incr: "Key A|B",
            decr: "Key A|B"
        },
        '010': {
            read: "Key A|B",
            write: "Never",
            incr: "Never",
            decr: "Never"
        },
        '100': {
            read: "Key A|B",
            write: "Key B",
            incr: "Never",
            decr: "Never"
        },
        '110': {
            read: "Key A|B",
            write: "Key B",
            incr: "Key B",
            decr: "Key A|B"
        },
        '001': {
            read: "Key A|B",
            write: "Never",
            incr: "Never",
            decr: "Key A|B"
        },
        '011': {
            read: "Key B",
            write: "Key B",
            incr: "Never",
            decr: "Never"
        },
        '101': {
            read: "Key B",
            write: "Never",
            incr: "Never",
            decr: "Never"
        },
        '111': {
            read: "Never",
            write: "Never",
            incr: "Never",
            decr: "Never"
        }
    }

    this.ACCESS_CONDITIONS_TRAILER = {
        '000': {
            keyA: {
                read: "Never",
                write: "Key A"
            },
            access: {
                read: "Key A",
                write: "Never"
            },
            keyB: {
                read: "Key A",
                write: "Key A"
            }
        },
        '010': {
            keyA: {
                read: "Never",
                write: "Never"
            },
            access: {
                read: "Key A",
                write: "Never"
            },
            keyB: {
                read: "Key A",
                write: "Never"
            }
        },
        '100': {
            keyA: {
                read: "Never",
                write: "Key B"
            },
            access: {
                read: "Key A|B",
                write: "Never"
            },
            keyB: {
                read: "Never",
                write: "Key B"
            }
        },
        '110': {
            keyA: {
                read: "Never",
                write: "Never"
            },
            access: {
                read: "Key A|B",
                write: "Never"
            },
            keyB: {
                read: "Never",
                write: "Never"
            }
        },
        '001': {
            keyA: {
                read: "Never",
                write: "Key A"
            },
            access: {
                read: "Key A",
                write: "Key A"
            },
            keyB: {
                read: "Key A",
                write: "Key A"
            }
        },
        '011': {
            keyA: {
                read: "Never",
                write: "Key B"
            },
            access: {
                read: "Key A|B",
                write: "Key B"
            },
            keyB: {
                read: "Never",
                write: "Key B"
            }
        },
        '101': {
            keyA: {
                read: "Never",
                write: "Never"
            },
            access: {
                read: "Key A|B",
                write: "Key B"
            },
            keyB: {
                read: "Never",
                write: "Never"
            }
        },
        '111': {
            keyA: {
                read: "Never",
                write: "Never"
            },
            access: {
                read: "Key A|B",
                write: "Never"
            },
            keyB: {
                read: "Never",
                write: "Never"
            }
        }
    }

    this.showAlert = function(title, msg) {
        var alert = $mdDialog.alert({
            title: title,
            textContent: msg,
            ok: 'Close'
        });
        return $mdDialog
            .show(alert);
    }

    this.MODULE_TYPE = {
        0: "Osnovne akademske studije",
        1: "Master akademske studije",
        2: "Specijalističke akademske studije",
        3: "Doktorske akademske studije",
        4: "Strukovne studije"
    };

    this.MODULE_DEGREE = {
        0: "Prvi",
        1: "Drugi",
        2: "Treći"
    };

}]);
