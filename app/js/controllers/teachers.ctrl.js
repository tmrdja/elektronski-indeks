angular.module('app').controller('teachersCtrl', ['Service', '$mdDialog', '$stateParams', function ViewCtrl(Service, $mdDialog, $stateParams) {
    var self = this;
    self.teachers = [];
    self.query = {
        filter: '',
        limit: '10',
        order: 'username',
        page: 1
    };

    this.selected = [];

    this.getTeachers = function() {
        self.promise = Service.getTeachers(self.query).then(function(res) {
            self.teachers = res.data;
        });
    }

    this.cancel = function() {
        $mdDialog.cancel();
    };

    this.pick = function() {
        $mdDialog.hide(self.selected[0]);
    };

    this.listSubjects = function(teacher) {
        var previousDialog = $mdDialog;
        var d = $mdDialog.show({
                controller: 'teacherSubjectsCtrl',
                controllerAs: 'ctrl',
                locals: {
                    teacher: teacher,
                    listSubjects: self.listSubjects
                },
                templateUrl: '/dialogs/teacher-subjects.html',
                parent: angular.element(document.body),
                clickOutsideToClose: false
            })
            .then(function(subject) {

            }, function() {
                //$scope.status = 'You cancelled the dialog.';
            });
    }

    this.deleteTeacher = function(teacher) {
        Service.deleteUser(teacher).then(function() {
            self.getTeachers();
        }, function() {
            Service.showAlert("Greška", "Greška pri brisanju korisnika");
        })
    }

    this.editTeacher = function(teacher) {
        $mdDialog.show({
            controller: 'userCtrl',
            locals: {
                user: (teacher) ? angular.copy(teacher) : {
                    role: 1,
                    firstname: '',
                    lastname: '',
                    username: '',
                    password: ''
                }
            },
            templateUrl: '/dialogs/edit-user.html',
            parent: angular.element(document.body),
            //targetEvent: ev,
            clickOutsideToClose: false
                //fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
        }).then(function() {
            self.getTeachers();
        })
    }

    this.getTeachers();

}]);
