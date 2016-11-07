angular.module('app').constant('disableUsed', false).controller('subjectsCtrl', ['Service', '$mdDialog', '$stateParams', 'disableUsed', 'AuthService', 'multiple', function ViewCtrl(Service, $mdDialog, $stateParams, disableUsed, AuthService, multiple) {
    var self = this;
    self.subjects = [];
    self.query = {
        filter: '',
        limit: '10',
        order: 'name',
        page: 1
    };
    self.multiple = multiple == true;
    self.role = AuthService.user.role;
    self.disableUsed = disableUsed;

    this.selected = [];

    this.getSubjects = function() {
        if (self.role == 0) {
            self.promise = Service.getSubjects(self.query).then(function(res) {
                self.subjects = res.data;
            });
        }
        if (self.role == 1) {
            self.promise = Service.getTeacherSubjects().then(function(res) {
                self.subjects = res.data;
            });
        }
    }

    this.cancel = function() {
        $mdDialog.cancel();
    };

    this.pick = function() {
        if (self.multiple) {
            $mdDialog.hide(self.selected);
        } else {
            $mdDialog.hide(self.selected[0]);
        }
    };

    this.getSubjects();

    this.setKey = function(subject) {
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
            .then(function(result) {
                Service.setSubjectKey(subject, result).then(function(res) {
                        Service.showAlert('Uspešno', 'Uspešno sačuvan ključ predmeta.');
                    },
                    function(err) {
                        Service.showAlert('Greška', 'Greška prilikom čuvanja ključa.');
                    });
            }, function() {

            });
    }

    this.editSubject = function(subject) {
        $mdDialog.show({
            controller: function($scope) {
                $scope.subject = (subject) ? angular.copy(subject) : {
                    required: true,
                    espb: 7
                };

                $scope.cancel = function() {
                    $mdDialog.cancel();
                };

                $scope.save = function() {
                    $mdDialog.hide($scope.subject);
                };
            },
            templateUrl: '/dialogs/new-subject.html',
            parent: angular.element(document.body),
            clickOutsideToClose: false
        }).then(function(newSubject) {
            Service.saveSubject(newSubject).then(function(res) {
                    self.getSubjects();
                    Service.showAlert('Uspešno', 'Uspešno sačuvan predmet.');
                },
                function(err) {
                    Service.showAlert('Greška', 'Greška prilikom čuvanja predmeta.');
                });
        })
    }

    this.deleteSubject = function(subject) {
        Service.deleteSubject(subject).then(function(res) {
                self.getSubjects();
            },
            function(err) {
                Service.showAlert('Greška', 'Greška prilikom brisanja predmeta.');
            });
    }

}]);
