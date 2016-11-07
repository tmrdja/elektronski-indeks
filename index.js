var express = require('express');
var bodyParser = require('body-parser');
var MFRC522 = require('./MFRC522.js').MFRC522;
var keyA = 'ffffffffffff';
var Database = require('./Database.js').Database;
var db = new Database();
var passport = require('passport');
var config = require('./config.js').config;
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var jwt = require('jwt-simple');
var Promise = require('promise');
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'd6F3Efeq';

function encrypt(text) {
    var cipher = crypto.createCipher(algorithm, password)
    var crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text) {
    var decipher = crypto.createDecipher(algorithm, password)
    var dec = decipher.update(text, 'hex', 'utf8')
    dec += decipher.final('utf8');
    return dec;
}

function Subject(s) {
    this.index = s.index;
    this.code = s.code;
    this.mark = s.mark;
    this.credits = [];
    for (var i = 0; s.credits != null && i < 5; i++) {
        this.credits[i] = parseInt(s.credits[i]);
    }
    if (s.date != null) {
        this.date = new Date(s.date);
    }
    this.name = s.name;
    this.teacherName = s.teacherName;
    this.espb = s.espb;
    this.semester = s.semester;
    this.signed = s.signed;
}

exports.startServer = function(port, path, callback) {
    //console.log(port, path, callback);
    var app = express();

    app.use(express.static('public'));
    app.use(bodyParser.json());

    app.use(passport.initialize());

    passport.use(new JwtStrategy({
        secretOrKey: config.database.secret,
        jwtFromRequest: ExtractJwt.fromAuthHeader()
    }, function(jwt_payload, done) {
        db.findUser(jwt_payload._id, function(user) {
            if (user) {
                done(null, user);
            } else {
                done(null, false);
            }
        });
    }));

    function handleError(err) {
        console.error("greska", err);
        throw err;
    }

    var mfrc522 = new MFRC522(config.server.serialport);

    app.post('/openCard', function(req, res) {
        mfrc522.open().then(function(r) {
            //console.log('openCard', r);
            res.send(r);
        }, function(err) {
            res.status(500);
            //console.log('err', err);
            res.send(err);
        });
    });

    app.post('/getUid', function(req, res) {
        mfrc522.getUID().then(function(r) {
            //console.log('getUid', r);
            res.send(r.data);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/getType', function(req, res) {
        mfrc522.getType().then(function(r) {
            //console.log('getType', r);
            res.send(r.data);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    function getYear(year, user) {
        return mfrc522.readYear(year).then(function(r) {
                return r.data;
            },
            function(err) {
                throw err;
            });
    }

    app.post('/getYear', function(req, res) {
        var token = req.headers.authorization;
        var user = jwt.decode(token, config.database.secret);
        getYear(req.body.year, user).then(function(r) {
                //console.log('getYear', r);
                res.send(r);
            },
            function(err) {
                res.status(500);
                res.send(err);
            });
    });

    app.post('/writeSubject', function(req, res) {
        mfrc522.writeSubject(new Subject(req.body.subject), req.body.key).then(function(r) {
                //console.log('Success write', r);
                res.send(r.data);
            },
            function(err) {
                res.status(500);
                res.send(err);
            });
    });

    app.post('/readStudentInfo', function(req, res) {
        mfrc522.readStudentInfo().then(function(r) {
                //console.log('Success read info', r);
                res.send(r.data);
            },
            function(err) {
                res.status(500);
                res.send(err);
            });
    });
    app.post('/writeStudentInfo', function(req, res) {
        mfrc522.writeStudentInfo(req.body).then(function(r) {
                //console.log('Success write info', r);
                res.send(r.data);
            },
            function(err) {
                res.status(500);
                res.send(err);
            });
    });


    app.post('/getStudents', function(req, res) {
        db.getUsers(db.UserRole.Student, req.body).then(function(users) {
            res.send(users);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/getTeachers', function(req, res) {
        db.getUsers(db.UserRole.Teacher, req.body).then(function(users) {
            res.send(users);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/getSubjects', function(req, res) {
        db.getSubjects(req.body).then(function(r) {
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/getTeacherSubjects', function(req, res) {
        var user = req.body;
        if (user == null || user._id == null) {
            var token = req.headers.authorization;
            user = jwt.decode(token, config.database.secret);
        }
        //console.log('getTeacherSubjects', req.body, user)
        db.getTeacherSubjects(user._id).then(function(r) {
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/addTeacherSubject', function(req, res) {
        db.addTeacherSubjects(req.body.teacher, req.body.subjects).then(function(r) {
            res.send(r);
        }, function(err) {
            console.error('teacher subject add error', err);
            res.status(500);
            res.send(err);
        });
    });

    app.post('/deleteTeacherSubject', function(req, res) {
        db.deleteTeacherSubject(req.body.teacher._id, req.body.subject._id).then(function(r) {
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/deleteUser', function(req, res) {
        db.deleteUser(req.body.user._id).then(function(r) {
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/saveUser', function(req, res) {
        if (req.body.user._id != null) {
            db.editUser(req.body.user).then(function(r) {
                res.send(r);
            }, function(err) {
                res.status(500);
                res.send(err);
            });
        } else {
            db.addUser(req.body.user).then(function(r) {
                res.send(r);
            }, function(err) {
                res.status(500);
                res.send(err);
            });
        }
    });

    function joinSubjectName(sub, codes) {
        //console.log(sub, codes);
        return db.getSubjectsByCodes(codes, {
                role: 2
            })
            .then(function(subjects) {
                    //console.log(subjects);
                    sub.forEach(function(s) {
                        if (subjects[s.code] != null) {
                            s.name = subjects[s.code].name;
                            s.editable = subjects[s.code].editable;
                        }
                    });
                    //console.log(r.data)
                    return sub;
                },
                function(err) {
                    throw err;
                })
    }

    app.post('/getModules', function(req, res) {
        db.getModules().then(function(r) {
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/getModuleSubjects', function(req, res) {
        db.getModuleSubjects(req.body.module._id, req.body.year).then(function(r) {
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/deleteModule', function(req, res) {
        //console.log('delete module', req.body.module)
        db.deleteModule(req.body.module).then(function(r) {
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    function getYears(years, index) {
        //console.log('getYears', years.length, index);
        return mfrc522.readYear(index).then(function(data) {
            years[index - 1] = data.data;
            //console.log('getYears success', years.length);
            index++;
            if (index < 5) {
                return getYears(years, index);
            } else {
                return new Promise(function(fufill, reject) {
                    fufill(years);
                });
            }
        }, function(err) {
            throw err;
        })
    }

    app.post('/editModule', function(req, res) {
        //console.log('addModule', req.body.module)
        db.editModule(req.body.module).then(function(r) {
            //console.log('added', req.body.module);
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });

    });

    app.post('/addModuleSubjects', function(req, res) {
        db.addModuleSubjects(req.body.module, req.body.subjects, req.body.year).then(function(r) {
            //console.log('added');
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/deleteModuleSubject', function(req, res) {
        db.deleteModuleSubject(req.body.module._id, req.body.subject._id, req.body.year).then(function(r) {
            //console.log('added');
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/saveSubject', function(req, res) {
        db.saveSubject(req.body.subject).then(function(r) {
            //console.log('saved');
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/deleteSubject', function(req, res) {
        db.deleteSubject(req.body.subject).then(function(r) {
            //console.log('deleted');
            res.send(r);
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    function initSubject(subjects, index) {
        //console.log('initSubject', index, subjects[index]);
        return mfrc522.initSubject(index, subjects[index]).then(function(r) {
            index++;
            if (index < subjects.length) {
                return initSubject(subjects, index);
            } else {
                return new Promise(function(fulfill, reject) {
                    fulfill("Success");
                });
            }
        }, function(err) {
            throw err;
        });
    }

    function getModuleSubjects(id) {
        return db.getModuleSubjects(id).then(function(r) {
            if (r.data.length > 40) {
                throw {
                    type: 'length'
                };
            }
            var subjects = r.data.map(function(s) {
                if (s.rfidKey == null) {
                    throw {
                        type: 'rfidKey',
                        message: s.name
                    };
                }
                s.rfidKey = decrypt(s.rfidKey);
                return s;
            });
            return subjects;
        })
    }

    app.post('/writeModule', function(req, res) {
        //console.log('write module', req.body.module);
        var info = req.body.student;
        info.faculty = "PMF";
        info.city = "Kragujevac";
        info.course = req.body.module.name;
        info.type = req.body.module.type;
        info.degree = req.body.module.degree;
        //console.log('writeInfo', info);
        return mfrc522.writeStudentInfo(info).then(function(r2) {
                return getModuleSubjects(req.body.module._id).then(function(subjects) {
                    //console.log(subjects);
                    return initSubject(subjects, 0);
                }).then(function() {
                        //console.log('info writed');
                        res.send(r2);
                    },
                    function(err) {
                        res.status(500);
                        res.send(err);
                    });
            },
            function(err) {
                res.status(500);
                res.send(err);
            });
    });

    app.post('/setSubjectKey', function(req, res) {
        //console.log('write module', req.body.module)
        db.setSubjectKey(req.body.subject._id, encrypt(req.body.key)).then(function(r) {
            res.send({
                status: r
            });
        }, function(err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/login', function(req, res) {
        db.loginUser(req.body.username, req.body.password).then(function(user) {
            //console.log('loginUser', req.body, user);
            if (user != null) {
                var token = jwt.encode(user, config.database.secret);
                // return the information including token as JSON
                res.json({
                    success: true,
                    token: token,
                    user: {
                        username: user.username,
                        role: user.role,
                        firstname: user.firstname,
                        lastname: user.lastname
                    }
                });
            } else {
                res.status(403);
                res.json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }
        }, function(err) {
            //console.log(err);
            res.status(403);
            res.send(err);
        });
    });
    app.listen(port, function() {
        console.log('Example app listening on port ' + port + '!', path);
    });

    callback();
}
