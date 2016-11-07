angular.module('app').controller('yearCtrl', ['Service', '$mdDialog', '$stateParams', 'Subject', '$mdToast', 'AuthService', function ViewCtrl(Service, $mdDialog, $stateParams, Subject, $mdToast, AuthService) {
    var self = this;
    self.year = $stateParams.year;
    self.subjects = [];
    self.role = AuthService.user.role;
    if (self.year == 0 && self.role != 0) self.year = 0;

    self.years = ['I', 'II', 'III', 'IV'];

    self.MODULE_TYPE = Service.MODULE_TYPE;
    self.MODULE_DEGREE = Service.MODULE_DEGREE;

    this.editSubject = function(index, subject) {
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
                .then(function(newSubject) {
                    $mdDialog.show({
                            controller: function($scope) {

                                $scope.cancel = function() {
                                    $mdDialog.cancel();
                                };

                                $scope.save = function() {
                                    $mdDialog.hide($scope.key);
                                };

                            },
                            templateUrl: '/dialogs/edit-key.html',
                            parent: angular.element(document.body),
                            clickOutsideToClose: false
                        })
                        .then(function(key) {
                            Service.writeSubject(newSubject, key)
                                .then(function() {
                                    self.subjects[index] = newSubject;
                                }, function(err) {
                                    console.log(err);
                                    if (err.data.data == 'auth') {
                                        Service.showAlert('Greška', 'Pogrešan ključ!');
                                    } else {
                                        Service.showAlert('Greška', 'Greška pri upisu podataka!');
                                    }
                                })
                        }, function() {

                        });

                }, function() {
                    //$scope.status = 'You cancelled the dialog.';
                });
        }
    }

    this.getUid = function() {
        return Service.getUid().then(function(res) {
            if (res.data instanceof Array) {
                self.uid = res.data.reduce(function(prev, v) {
                    v = parseInt(v);
                    return prev + ((v < 16) ? '0' : '') + v.toString(16);
                }, '');
            } else {
                self.uid = '';
            }
            return res;
        });
    }

    this.getType = function() {
        Service.getType().then(function(res) {
            self.type = res.data;
        });
    }

    this.typeName = function(type) {
        for (var key in Service.PICC_Type) {
            if (Service.PICC_Type[key] == type) return key;
        }
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


    this.getYear = function() {
        self.promise = Service.getYear($stateParams.year).then(function(res) {
            self.subjects = res.data;
        }, function() {
            $mdToast.show(
                $mdToast.simple()
                .textContent('Greška prilikom čitanja podataka! Proverite da li je kartica na čitaču.')
                .position('left bottom')
                .hideDelay(3000)
            );
            //Service.showAlert('Greška', 'Greška prilikom čitanja podataka! Proverite da li je kartica na čitaču.');
        });
    }

    this.getStudentInfo = function() {
        return Service.readStudentInfo().then(function(res) {
            self.info = res.data
            return res; //console.log(res.data);
        })
    }

    this.subjectCreditsSum = function(subject) {
        var c = 0;
        for (var i = 0; i < subject.credits.length; i++) {
            c += subject.credits[i];
        }
        return Math.max(0, Math.min(100, c));
    }

    self.getUid().then(function() {
        self.getStudentInfo().then(function() {
            self.getYear();
        })
    });

}]);
