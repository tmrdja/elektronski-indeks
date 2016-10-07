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

function Subject(s) {
    this.code = s.code;
    this.mark = s.mark;
    this.credits = s.credits;
    this.date = new Date(s.date);
}

exports.startServer = function (port, path, callback) {
    //console.log(port, path, callback);
    var app = express();

    app.use(express.static('public'));
    app.use(bodyParser.json());

    app.use(passport.initialize());

    passport.use(new JwtStrategy({
        secretOrKey: config.database.secret,
        jwtFromRequest: ExtractJwt.fromAuthHeader()
    }, function (jwt_payload, done) {
        db.findUser(jwt_payload._id, function (user) {
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

    app.post('/openCard', function (req, res) {
        mfrc522.open().then(function (r) {
            //console.log('openCard', r);
            res.send(r);
        }, function (err) {
            res.status(500);
            //console.log('err', err);
            res.send(err);
        });
    });

    app.post('/getUid', function (req, res) {
        mfrc522.getUID().then(function (r) {
            //console.log('getUid', r);
            res.send(r.data);
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/getType', function (req, res) {
        mfrc522.getType().then(function (r) {
            //console.log('getType', r);
            res.send(r.data);
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    function getYear(year, user) {
        return mfrc522.readYear(year).then(function (r) {
                var codes = r.data.map(function (s) {
                    return s.code.match(/[0-9a-zA-Z]{3,5}/)[0];
                });
                //console.log('getYear', user, codes);
                return db.getSubjectsByCodes(codes, user)
                    .then(function (subjects) {
                            //console.log(subjects, r.data);
                            r.data.forEach(function (s) {
                                if (subjects[s.code] != null) {
                                    s.name = subjects[s.code].name;
                                    s.editable = subjects[s.code].editable;
                                }
                            });
                            //console.log(r.data)
                            return r.data;
                        },
                        function (err) {
                            throw err;
                        })
            },
            function (err) {
                throw err;
            });
    }

    app.post('/getYear', function (req, res) {
        var token = req.headers.authorization;
        var user = jwt.decode(token, config.database.secret);
        getYear(req.body.year, user).then(function (r) {
                //console.log('getYear', r);
                res.send(r);
            },
            function (err) {
                res.status(500);
                res.send(err);
            });
    });

    app.post('/writeSubject', function (req, res) {

        mfrc522.writeSubject(req.body.year, req.body.index, new Subject(req.body.subject)).then(function (r) {
                //console.log('Success write', r);
                res.send(r.data);
            },
            function (err) {
                res.status(500);
                res.send(err);
            });
    });

    app.post('/readStudentInfo', function (req, res) {
        mfrc522.readStudentInfo().then(function (r) {
                //console.log('Success read info', r);
                res.send(r.data);
            },
            function (err) {
                res.status(500);
                res.send(err);
            });
    });
    app.post('/writeStudentInfo', function (req, res) {
        mfrc522.writeStudentInfo(req.body).then(function (r) {
                //console.log('Success write info', r);
                res.send(r.data);
            },
            function (err) {
                res.status(500);
                res.send(err);
            });
    });


    app.post('/getStudents', function (req, res) {
        db.getUsers(db.UserRole.Student, req.body).then(function (users) {
            res.send(users);
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/getTeachers', function (req, res) {
        db.getUsers(db.UserRole.Teacher, req.body).then(function (users) {
            res.send(users);
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/getSubjects', function (req, res) {
        db.getSubjects(req.body).then(function (r) {
            res.send(r);
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/getTeacherSubjects', function (req, res) {
        db.getTeacherSubjects(req.body._id).then(function (r) {
            res.send(r);
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/addTeacherSubject', function (req, res) {
        db.addTeacherSubject(req.body.teacher._id, req.body.subject._id).then(function (r) {
            res.send(r);
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/deleteTeacherSubject', function (req, res) {
        db.deleteTeacherSubject(req.body.teacher._id, req.body.subject._id).then(function (r) {
            res.send(r);
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/deleteUser', function (req, res) {
        db.deleteUser(req.body.user._id).then(function (r) {
            res.send(r);
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/saveUser', function (req, res) {
        if (req.body.user._id != null) {
            db.editUser(req.body.user).then(function (r) {
                res.send(r);
            }, function (err) {
                res.status(500);
                res.send(err);
            });
        } else {
            db.addUser(req.body.user).then(function (r) {
                res.send(r);
            }, function (err) {
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
            .then(function (subjects) {
                    console.log(subjects);
                    sub.forEach(function (s) {
                        if (subjects[s.code] != null) {
                            s.name = subjects[s.code].name;
                            s.editable = subjects[s.code].editable;
                        }
                    });
                    //console.log(r.data)
                    return sub;
                },
                function (err) {
                    throw err;
                })
    }

    app.post('/getModules', function (req, res) {
        db.getModules().then(function (r) {
            var p = [];
            //console.log(r);
            for (var i = 0; i < r.length; i++) {
                for (var y = 0; y < 4; y++) {
                    var sub = r[i].years[y];
                    var codes = sub.map(function (s) {
                        return s.code.match(/[0-9a-zA-Z]{3,5}/)[0];
                    });
                    //console.log('getYear', user, codes);
                    p[i * 4 + y] = joinSubjectName(sub, codes);
                }
            }
            //console.log(p);
            Promise.all(p).then(function (re) {
                //console.log(r);
                res.send(r);
            })
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/deleteModule', function (req, res) {
        console.log('delete module', req.body.module)
        db.deleteModule(req.body.module).then(function (r) {
            res.send(r);
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    function getYears(years, index) {
        console.log('getYears', years.length, index);
        return mfrc522.readYear(index).then(function (data) {
            years[index - 1] = data.data;
            console.log('getYears success', years.length);
            index++;
            if (index < 5) {
                return getYears(years, index);
            } else {
                return new Promise(function (fufill, reject) {
                    fufill(years);
                });
            }
        }, function (err) {
            throw err;
        })
    }

    app.post('/addModule', function (req, res) {
        getYears([], 1).then(function (years) {
            var module = {
                name: req.body.name,
                years: years
            };
            //console.log('addModule', module.years[0][0])
            db.addModule(module).then(function (r) {
                console.log('added');
                res.send(r);
            }, function (err) {
                res.status(500);
                res.send(err);
            });
        }, function (err) {
            console.log("err", err);
            res.status(500);
            res.send(err);
        })


    });

    function writeModule(module, year, index) {
        var s = new Subject(module.years[year - 1][index]);
        return mfrc522.writeSubject(year, index, s).then(function () {
            index++;
            if (index < module.years[year - 1].length) {
                return writeModule(module, year, index);
            } else {
                index = 0;
                year++;
                if (year < 5) {
                    return writeModule(module, year, index);
                } else {
                    return new Promise(function (fulfill, reject) {
                        fulfill("Success");
                    });
                }
            }
        }, function (err) {
            throw err;
        });
    }

    app.post('/writeModule', function (req, res) {
        //console.log('write module', req.body.module)
        writeModule(req.body.module, 1, 0).then(function (r) {
            res.send({
                status: r
            });
        }, function (err) {
            res.status(500);
            res.send(err);
        });
    });

    app.post('/login', function (req, res) {
        db.loginUser(req.body.username, req.body.password).then(function (user) {
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
        }, function (err) {
            //console.log(err);
            res.status(403);
            res.send(err);
        });
    });
    app.listen(port, function () {
        console.log('Example app listening on port ' + port + '!', path);
    });

    callback();
}