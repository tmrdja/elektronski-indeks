angular.module('app').controller('yearCtrl', ['Service', '$mdDialog', '$stateParams', 'Subject', '$mdToast', 'AuthService', function ViewCtrl(Service, $mdDialog, $stateParams, Subject, $mdToast, AuthService) {
    var self = this;
    self.year = $stateParams.year;
    self.subjects = [];
    self.role = AuthService.user.role;
    if (self.year == 0 && self.role != 0) self.year = 0;

    self.years = ['I', 'II', 'III', 'IV'];

    this.editSubject = function (index, subject) {
        if (index == null) {
            index = self.subjects.length;
        }
        if (index >= 15) {
            Service.showAlert('Error', 'No more space for subject. Limit is 15 subjects per year.');
        } else {
            $mdDialog.show({
                    controller: 'SubjectCtrl',
                    locals: {
                        subject: (subject) ? angular.copy(subject) : new Subject(),
                        index: index,
                        editSubject: self.editSubject
                    },
                    templateUrl: '/dialogs/edit-subject.html',
                    parent: angular.element(document.body),
                    //targetEvent: ev,
                    clickOutsideToClose: false
                        //fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
                })
                .then(function (newSubject) {
                    Service.writeSubject($stateParams.year, index, newSubject)
                        .then(function () {
                            //Service.showAlert('Success', 'Success write.');
                            if (newSubject.editable == null) {
                                newSubject.editable = true;
                            }
                            self.subjects[index] = newSubject;
                        }, function (err) {
                            Service.showAlert('Error', 'Error writing subject!');
                        })
                }, function () {
                    //$scope.status = 'You cancelled the dialog.';
                });
        }
    }

    this.deleteSubject = function (index, subject) {
        if (index < self.subjects.length - 1) {
            Service.writeSubject($stateParams.year, index, self.subjects[self.subjects.length - 1])
                .then(function (subject) {
                    self.subjects[index] = self.subjects[self.subjects.length - 1];
                    self.writeEmptySubject(self.subjects.length - 1);
                }, function (err) {
                    Service.showAlert('Error', 'Error writing subject!');
                });
        } else {
            self.writeEmptySubject(self.subjects.length - 1);
        }
    }

    this.writeEmptySubject = function (index) {
        var empty = new Subject();
        for (var i = 0; i < 5; i++) {
            empty.code += String.fromCharCode(0);
        }
        return Service.writeSubject($stateParams.year, index, empty)
            .then(function () {
                self.subjects.pop();
            }, function (err) {
                Service.showAlert('Error', 'Error writing subject!');
            });
    }

    this.openMenu = function ($mdOpenMenu, ev) {
        originatorEv = ev;
        $mdOpenMenu(ev);
    };

    this.getUid = function () {
        Service.getUid().then(function (res) {
            if (res.data instanceof Array) {
                self.uid = res.data.reduce(function (prev, v) {
                    v = parseInt(v);
                    return prev + ((v < 16) ? '0' : '') + v.toString(16);
                }, '');
            } else {
                self.uid = '';
            }
        });
    }

    this.getType = function () {
        Service.getType().then(function (res) {
            self.type = res.data;
        });
    }

    this.typeName = function (type) {
        for (var key in Service.PICC_Type) {
            if (Service.PICC_Type[key] == type) return key;
        }
    }

    this.openCard = function () {
        Service.open().then(function (res) {
            self.uid = res.data.uid.reduce(function (prev, v) {
                v = parseInt(v);
                return prev + ((v < 16) ? '0' : '') + v.toString(16);
            }, '');
            if (self.type == res.data.type) return;
            self.type = res.data.type;
            if (self.year > 0) {
                self.getYear();
            }
            self.getStudentInfo();

        }, function (err) {
            Service.showAlert('Error', 'Error opening card');
            if (self.year > 0) {
                self.getYear();
            }
            self.getStudentInfo();
        });
    }


    this.getYear = function () {
        Service.getYear($stateParams.year).then(function (res) {
            self.subjects = res.data;
        }, function () {
            $mdToast.show(
                $mdToast.simple()
                .textContent('Greška prilikom čitanja podataka! Proverite da li je kartica na čitaču.')
                .position('left bottom')
                .hideDelay(3000)
            );
            //Service.showAlert('Greška', 'Greška prilikom čitanja podataka! Proverite da li je kartica na čitaču.');
        });
    }

    this.getStudentInfo = function () {
        Service.readStudentInfo().then(function (res) {
            self.info = res.data
                //console.log(res.data);
        })
    }

    this.editSudentInfo = function () {
        $mdDialog.show({
                controller: 'infoCtrl',
                locals: {
                    student: self.info
                },
                templateUrl: '/dialogs/student-info.html',
                parent: angular.element(document.body),
                clickOutsideToClose: false
            })
            .then(function (info) {
                Service.writeStudentInfo(info).then(function () {
                    self.getStudentInfo();
                }, function () {
                    Service.showAlert('Greška', 'Greška prilikom upisivanja podataka o studentu.');
                })
            }, function () {

            });
    }

    this.getModules = function () {
        Service.getModules().then(function (res) {
            self.modules = res.data;
        }, function (err) {
            Service.showAlert('Greška', 'Greška prilikom učitavanja modula.');
        });
    }

    this.changeModule = function () {
        if (self.selectedYear == null) {
            self.selectedYear = 0;
        }
        if (self.selectedModule != null) {
            self.subjects = self.selectedModule.years[self.selectedYear];
        }
    }

    this.addModule = function () {
        Service.addModule(self.newModule).then(function (res) {
                self.getModules();
                console.log('added module', res);
                self.selectedModule = null;
                self.subjects = [];
                Service.showAlert('Greška', 'Uspešno dodat modul.');
            },
            function (err) {
                Service.showAlert('Greška', 'Greška prilikom pravljenja modula.');
            });
    }

    this.deleteModule = function () {
        Service.deleteModule(self.selectedModule).then(function () {
                self.getModules();
                self.selectedModule = null;
                self.subjects = [];
            },
            function (err) {
                Service.showAlert('Greška', 'Greška prilikom pravljenja modula.');
            });
    }

    this.writeModule = function () {
        Service.writeModule(self.selectedModule).then(function () {
                Service.showAlert('Uspešno', 'Uspešno upisani predmeti iz modula na karticu.');
            },
            function (err) {
                Service.showAlert('Greška', 'Greška prilikom pravljenja modula.');
            });
    }

    if (this.year > 0) {
        this.getYear();
    } else {
        self.getModules();
    }
    this.getUid();
    this.getStudentInfo();

}]);