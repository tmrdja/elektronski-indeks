angular.module('app').controller('studentsCtrl', ['Service', '$mdDialog', '$stateParams', function ViewCtrl(Service, $mdDialog, $stateParams, Student) {
    var self = this;
    self.students = [];
    self.query = {
        filter: '',
        limit: '10',
        order: 'username',
        page: 1
    };

    this.selected = [];

    this.getStudents = function() {
        self.promise = Service.getStudents(self.query).then(function(res) {
            self.students = res.data;
        });
    }

    this.cancel = function() {
        $mdDialog.cancel();
    };

    this.pick = function() {
        $mdDialog.hide(self.selected[0]);
    };

    this.deleteStudent = function(student) {
        Service.deleteUser(student).then(function() {
            self.getStudents();
        }, function() {
            Service.showAlert("Greška", "Greška pri brisanju korisnika");
        })
    }

    this.editStudent = function(student) {
        $mdDialog.show({
            controller: 'userCtrl',
            locals: {
                user: (student) ? angular.copy(student) : {
                    role: 2,
                    firstname: '',
                    lastname: '',
                    username: '',
                    password: '',
                    number: 1,
                    startYear: new Date().getFullYear()
                }
            },
            templateUrl: '/dialogs/edit-user.html',
            parent: angular.element(document.body),
            //targetEvent: ev,
            clickOutsideToClose: false
                //fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
        }).then(function() {
            self.getStudents();
        })
    }

    this.getStudents();

}]);
