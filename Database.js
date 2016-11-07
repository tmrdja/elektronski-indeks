var config = require('./config.js').config;

var Database = function() {
    var Database = require('arangojs').Database;

    var db = new Database(config.database.url);
    var a = db.useDatabase(config.database.name);
    var usersCollection = db.collection('users');
    var subjectsCollection = db.collection('subjects');
    var teacherSubjectsCollection = db.edgeCollection('teacherSubjects');
    var modulesCollection = db.collection('modules');
    var moduleSubjectsCollection = db.edgeCollection('moduleSubjects');

    this.UserRole = {
        Admin: 0,
        Teacher: 1,
        Student: 2
    }

    var self = this;

    this.addUser = function(user) {
        return usersCollection.save(user);
    }

    this.updateUser = function(user) {
        return usersCollection.update(user._key, user);
    }

    this.addUsers = function(users) {
        return usersCollection.import(users);
    }

    this.getUser = function(id) {
        return usersCollection.firstExample({
            _id: id
        }).then(function(res) {
            delete res._key;
            delete res._rev;
            delete res.password;
            return res;
        }, function(err) {
            return null;
        })
    }

    /*this.getUsers = function (role) {
        return usersCollection.byExample({
            role: role
        }).then(function (res) {
            return res._result.map(function (u) {
                delete u._key;
                delete u._rev;
                delete u.password;
                return u;
            });
        }, function (err) {
            throw err.ArangoError;
        })
    }*/

    this.loginUser = function(username, password) {
        return usersCollection.firstExample({
            username: username,
            password: password
        }).then(function(res) {
            delete res._key;
            delete res._rev;
            delete res.password;
            return res;
        }, function(err) {
            return null;
        });
    }

    this.getUsers = function(role, query) {
        var order = "ASC";
        if (query.order[0] == '-') {
            query.order = query.order.substr(1, query.order.length - 1);
            order = "DESC";
        }
        query.filter = query.filter.toLowerCase();
        var aql = 'FOR s IN users FILTER s.role == ' + role;
        if (query.filter.length > 0) {
            aql += ' && (LOWER(s.firstname) LIKE "%' + query.filter + '%"' +
                ' || LOWER(s.lastname) LIKE "%' + query.filter + '%"' +
                ' || LOWER(s.username) LIKE "%' + query.filter + '%")' +
                ' || LOWER(s.number) LIKE "%' + query.filter + '%"' +
                ' || LOWER(s.startYear) LIKE "%' + query.filter + '%"';
        }
        aql += ' SORT s.' + query.order + ' ' + order + /*' LIMIT ' + ((query.page - 1) * query.limit) + ',' + query.limit +*/ ' RETURN s';
        //console.log(query, aql);
        return db.query(aql, {}, {
                count: true
            })
            .then(function(cursor) {
                    return cursor.all().then(function(data) {
                        //console.log(data);
                        return {
                            data: data.slice((query.page - 1) * query.limit, (query.page) * query.limit),
                            count: cursor.count
                        };
                    });
                },
                function(err) {
                    throw err;
                });
    }

    this.getTeacherSubjects = function(id) {
        var aql = 'FOR s IN subjects ' +
            ' FILTER s.teacherId == "' + id + '" SORT s.name ASC RETURN s';
        return db.query(aql)
            .then(function(cursor) {
                //console.log(cursor);
                return cursor.all();
            })
            .then(function(data) {
                    //console.log('All keys:', data.join(', '));
                    return {
                        data: data,
                        count: 100
                    }
                },
                function(err) {
                    console.error('Failed to execute query:', err);
                });
    }

    this.addTeacherSubjects = function(teacher, subjects) {
        /*return teacherSubjectsCollection.save({
            _from: teacherId,
            _to: subjectId
        });
        */
        var data = subjects.map(function(s) {
            return {
                '_id': s._id,
                _rev: s._rev,
                _key: s._key,
                'teacherId': teacher._id
            };
        });
        return subjectsCollection.bulkUpdate(data);
    }

    this.deleteTeacherSubject = function(teacherId, subjectId) {
        /*return teacherSubjectsCollection.removeByExample({
            _from: teacherId,
            _to: subjectId
        });*/
        return subjectsCollection.updateByExample({
            _id: subjectId
        }, {
            teacherId: null
        });
    }

    this.editUser = function(user) {
        return usersCollection.update(user._id, user)
    }

    this.deleteUser = function(userId) {
        return usersCollection.remove(userId);
    }

    this.saveSubject = function(subject) {
        var id = subject._id;
        delete subject._id;
        delete subject._key;
        delete subject._rev;
        if (id == null) {
            return subjectsCollection.save(subject);
        } else {
            return subjectsCollection.updateByExample({
                _id: id
            }, subject);
        }
    }

    this.deleteSubject = function(subject) {
        return moduleSubjectsCollection.removeByExample({
            _to: subject._id
        }).then(function() {
            return subjectsCollection.remove(subject._id);
        })
    }

    this.getSubjects = function(query) {
        var order = "ASC";
        if (query.order[0] == '-') {
            query.order = query.order.substr(1, query.order.length - 1);
            order = "DESC";
        }
        query.filter = query.filter.toLowerCase();
        var aql = 'FOR s IN subjects ';
        if (query.filter.length > 0) {
            aql += 'FILTER LOWER(s.name) LIKE "%' + query.filter + '%" || LOWER(s.code) LIKE "%' + query.filter + '%" ';
        }
        aql += 'SORT s.' + query.order + ' ' + order /*+ ' LIMIT ' + ((query.page - 1) * query.limit) + ',' + query.limit*/ + ' RETURN s';
        //console.log(query, aql);
        return db.query(aql, {}, {
                count: true
            })
            .then(function(cursor) {
                    return cursor.all().then(function(data) {
                        //console.log(data);
                        return {
                            data: data.slice((query.page - 1) * query.limit, (query.page) * query.limit),
                            count: cursor.count
                        };
                    });
                },
                function(err) {
                    throw err;
                });
    }



    this.getSubjectsByCodes = function(codes, user) {
        codes = codes.map(function(c) {
            return '"' + c + '"';
        });
        //console.log(codes, user)
        var aql = 'FOR s IN subjects FILTER s.code IN [' + codes.join(',') + '] ';
        if (user.role == self.UserRole.Teacher) {
            aql += 'LET j = (FOR ts IN teacherSubjects ' +
                'FILTER ts._from == "' + user._id + '" && ts._to == s._id ' +
                'RETURN ts ) ' +
                'RETURN {code: s.code, name: s.name,espb: s.espb,required: s.required,editable: LENGTH(j) > 0}';
        } else {
            aql += 'RETURN {code: s.code, name: s.name,espb: s.espb,required: s.required,editable: ' + (user.role == self.UserRole.Admin) + '}';
        }
        //console.log(aql);
        return db.query(aql)
            .then(function(cursor) {
                return cursor.all();
            })
            .then(function(data) {
                    //console.log('All keys:', data.join(', '));
                    var res = {};
                    for (var i = 0; i < data.length; i++) {
                        res[data[i].code] = data[i];
                    }
                    return res;
                },
                function(err) {
                    console.error('Failed to execute query:', err);
                });
    }

    this.getModules = function() {
        return modulesCollection.all().then(function(r) {
            return r.all()
        }, function(err) {
            throw err;
        });
    }

    this.editModule = function(module) {
        var id = module._id;
        delete module._id;
        delete module._key;
        delete module._rev;
        //console.log('addModule', module);
        if (id == null) {
            return modulesCollection.save(module);
        } else {
            return modulesCollection.updateByExample({
                _id: id
            }, module);
        }
    }

    this.addModuleSubjects = function(module, subjects, year) {
        var data = subjects.map(function(s) {
            return {
                _from: module._id,
                _to: s._id,
                year: year
            };
        })
        return moduleSubjectsCollection.import(data);
    }

    this.deleteModule = function(module) {
        return moduleSubjectsCollection.removeByExample({
            _from: module._id
        }).then(function() {
            return modulesCollection.remove(module._id);
        });
    }

    this.deleteModuleSubject = function(moduleId, subjectId, year) {
        return moduleSubjectsCollection.removeByExample({
            _from: moduleId,
            _to: subjectId,
            year: year
        });
    }

    this.getModuleSubjects = function(id, year) {
        var aql = null;
        if (year == null) {
            aql =
                'FOR ms IN moduleSubjects FOR s IN subjects LET teacher = (' +
                '   FOR t IN users ' +
                '   FILTER t._id == s.teacherId && t.role == 1 ' +
                "   RETURN CONCAT(t.firstname, ' ', t.lastname) " +
                ') ' +
                'FILTER ms._from == "' + id + '" && s._id == ms._to SORT ms.year ASC ' +
                '   RETURN {' +
                '       code: s.code,' +
                '       name: s.name,' +
                '       espb: s.espb,' +
                '       rfidKey: s.rfidKey,' +
                '       required: s.required,' +
                '       semester: ms.year+1,' +
                '       teacherName: teacher[0]' +
                '   }';
        } else {
            aql = 'FOR ms IN moduleSubjects ' +
                'FOR s IN subjects ' +
                ' FILTER ms._from == "' + id + '" && s._id == ms._to && ms.year == ' + year + 'SORT s.name ASC RETURN s ';
        }
        //console.log(aql);
        return db.query(aql)
            .then(function(cursor) {
                //console.log(cursor);
                return cursor.all();
            })
            .then(function(data) {
                    //console.log('All keys:', data.join(', '));
                    return {
                        data: data
                    }
                },
                function(err) {
                    console.error('Failed to execute query:', err);
                });
    }

    this.setSubjectKey = function(subjectId, key) {
        return subjectsCollection.updateByExample({
            _id: subjectId
        }, {
            rfidKey: key
        });
    }

    this.install = function() {
        console.log('install');
        var dbData = require('./db-data.js');

        db.useDatabase('_system');
        db.createDatabase(config.database.name).then(
            function() {
                console.log('Database created');
                db.useDatabase(config.database.name);
                usersCollection = db.collection('users');
                subjectsCollection = db.collection('subjects');
                teacherSubjectsCollection = db.edgeCollection('teacherSubjects');
                moduleSubjectsCollection = db.edgeCollection('moduleSubjects');
                modulesCollection = db.collection('modules');

                usersCollection.create().then(function() {
                        console.log('Collection users created');
                        var users = dbData.students.concat(dbData.teachers).concat(dbData.admins);
                        self.addUsers(users).then(function() {
                            console.log('Added users to user collection');
                        }, function(err) {
                            console.error('Failed to add students to user collection:', err);
                        });
                    },
                    function(err) {
                        console.error('Failed to create users collection:', err);
                    }
                );

                subjectsCollection.create().then(
                    function() {
                        console.log('Collection subjects created');

                        subjectsCollection.import(dbData.subjects).then(function() {
                            console.log('Added subjects to collection');
                        }, function(err) {
                            console.error('Failed to add subjects to collection:', err);
                        });
                    },
                    function(err) {
                        console.error('Failed to create subjects collection:', err);
                    }
                );
                teacherSubjectsCollection.create().then(
                    function() {
                        console.log('Collection teacher subjects created');
                    },
                    function(err) {
                        console.error('Failed to create teacher subjects collection:', err);
                    }
                );

                moduleSubjectsCollection.create().then(
                    function() {
                        console.log('Collection module subjects created');
                    },
                    function(err) {
                        console.error('Failed to create module subjects collection:', err);
                    }
                );

                modulesCollection.create().then(
                    function() {
                        console.log('Collection modules subjects created');
                    },
                    function(err) {
                        console.error('Failed to create modules collection:', err);
                    }
                );
            },
            function(err) {
                console.error('Failed to create database:', err.ArangoError);
            }
        );

    }

}

if (require.main === module) {
    console.log('Creating db ' + config.database.name);
    var db = new Database();
    db.install();
} else {
    //console.log('required as a module');
}

exports.Database = Database;
