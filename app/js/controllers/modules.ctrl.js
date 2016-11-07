angular.module('app').controller('modulesCtrl', ['Service', '$mdDialog', '$stateParams', 'Subject', '$mdToast', 'AuthService', function ViewCtrl(Service, $mdDialog, $stateParams, Subject, $mdToast, AuthService) {
    var self = this;
    self.subjects = [];
    self.role = AuthService.user.role;
    self.selectedYear = 0;

    self.years = ['I', 'II', 'III', 'IV'];


    this.deleteSubject = function(subject) {
        Service.deleteModuleSubject(self.selectedModule, subject, parseInt(self.selectedYear)).then(function() {
            self.changeModule();
        }, function() {
            Service.showAlert('Greška', 'Greška prilikom dodavanja predmeta.');
        });
    }


    this.openCard = function() {
        Service.open().then(function(res) {
            self.uid = res.data.uid.reduce(function(prev, v) {
                v = parseInt(v);
                return prev + ((v < 16) ? '0' : '') + v.toString(16);
            }, '');
            if (self.type == res.data.type) return;
            self.type = res.data.type;
            if (self.year > 0) {
                self.getYear();
            }
            self.getStudentInfo();

        }, function(err) {
            Service.showAlert('Error', 'Error opening card');
            if (self.year > 0) {
                self.getYear();
            }
            self.getStudentInfo();
        });
    }

    this.editModule = function(module) {
        var d = $mdDialog.show({
                controller: function($scope) {
                    $scope.module = (module == null) ? {} : module;
                    $scope.types = Service.MODULE_TYPE;
                    $scope.degrees = Service.MODULE_DEGREE;

                    $scope.cancel = function() {
                        $mdDialog.cancel();
                    };

                    $scope.save = function() {
                        $mdDialog.hide($scope.module);
                    };
                },
                templateUrl: '/dialogs/module-edit.html',
                parent: angular.element(document.body),
                clickOutsideToClose: false
            })
            .then(function(module) {
                Service.editModule(module).then(function(res) {
                        self.getModules();
                        console.log('added module', res);
                        self.selectedModule = null;
                        self.subjects = [];
                        if (module._id == null) {
                            Service.showAlert('Uspešno', 'Uspešno dodat modul.');
                        } else {
                            Service.showAlert('Uspešno', 'Uspešno izmenjen modul.');
                        }
                    },
                    function(err) {
                        if (module._id == null) {
                            Service.showAlert('Greška', 'Greška prilikom pravljenja modula.');
                        } else {
                            Service.showAlert('Greška', 'Greška prilikom izmene modula.');
                        }
                    });
            }, function() {
                //$scope.status = 'You cancelled the dialog.';
            });
    }

    this.getModules = function() {
        Service.getModules().then(function(res) {
            self.modules = res.data;
        }, function(err) {
            Service.showAlert('Greška', 'Greška prilikom učitavanja modula.');
        });
    }

    this.addModuleSubject = function() {
        var d = $mdDialog.show({
                controller: 'subjectsCtrl',
                controllerAs: 'ctrl',
                locals: {
                    subject: null,
                    multiple: true
                },
                templateUrl: '/dialogs/subjects-picker.html',
                parent: angular.element(document.body),
                clickOutsideToClose: false
            })
            .then(function(subjects) {
                Service.addModuleSubjects(self.selectedModule, subjects, parseInt(self.selectedYear)).then(function() {
                        self.changeModule();
                    }, function() {
                        Service.showAlert('Greška', 'Greška prilikom dodavanja predmeta.');
                    })
                    //console.log(subjects);
            }, function() {
                //$scope.status = 'You cancelled the dialog.';
            });
    }

    this.changeModule = function() {
        if (self.selectedYear == null) {
            self.selectedYear = 0;
        }
        if (self.selectedModule != null) {
            self.promise = Service.getModuleSubjects(self.selectedModule, parseInt(self.selectedYear)).then(function(s) {
                self.subjects = s.data.data;
                return res;
            })
        }
    }


    this.deleteModule = function() {
        Service.deleteModule(self.selectedModule).then(function() {
                self.getModules();
                self.selectedModule = null;
                self.subjects = [];
            },
            function(err) {
                Service.showAlert('Greška', 'Greška prilikom pravljenja modula.');
            });
    }

    this.pickStudent = function() {
        var d = $mdDialog.show({
                controller: 'studentsCtrl',
                controllerAs: 'ctrl',
                templateUrl: '/dialogs/student-picker.html',
                parent: angular.element(document.body),
                clickOutsideToClose: false
            })
            .then(function(student) {
                self.writeModule(student);
            }, function() {
                //$scope.status = 'You cancelled the dialog.';
            });
    }

    this.writeModule = function(student) {
        /*var student = {
            "JMBG": "1234567890123",
            "birthCity": "Cuprija",
            "birthCountry": "Srbija",
            "birthCounty": "Cuprija",
            "citizenship": "Srpsko",
            "firstname": "Tomislav",
            "lastname": "Mrdja",
            "middlename": "Miodrag",
            "number": 55,
            "startYear": 2010
        }*/
        Service.writeModule(self.selectedModule, student).then(function() {
                Service.showAlert('Uspešno', 'Uspešno upisani predmeti iz modula na karticu.');
            },
            function(err) {
                if (err.data != null && err.data.type == 'rfidKey') {
                    Service.showAlert('Greška', 'Nije definisan ključ za predmet ' + err.data.message + '.');
                } else {
                    Service.showAlert('Greška', 'Greška prilikom pravljenja modula.');
                }

            });
    }

    this.getModules();

}]);
