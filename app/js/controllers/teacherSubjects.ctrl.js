angular.module('app').controller('teacherSubjectsCtrl', ['Service', '$mdDialog', '$stateParams', 'teacher', 'listSubjects', function ViewCtrl(Service, $mdDialog, $stateParams, teacher, listSubjects) {
    var self = this;
    self.subjects = [];
    self.query = {
        filter: '',
        limit: '10',
        order: 'name',
        page: 1
    };
    self.teacher = teacher;

    this.selected = [];

    this.getSubjects = function () {

    }

    this.listSubjects = function () {
        Service.getTeacherSubjects(teacher).then(function (res) {
            self.subjects = res.data;
        });
    }

    this.cancel = function () {
        $mdDialog.cancel();
    };

    this.addSubject = function () {
        var previousDialog = $mdDialog;
        var d = $mdDialog.show({
                controller: 'subjectsCtrl',
                controllerAs: 'ctrl',
                locals: {
                    parentDialog: previousDialog
                },
                templateUrl: '/dialogs/subjects-picker.html',
                parent: angular.element(document.body),
                clickOutsideToClose: false
            })
            .then(function (subject) {
                Service.addTeacherSubject(teacher, subject).then(function () {
                    listSubjects(teacher);
                }, function (err) {
                    Service.showAlert('Greška', 'Greška pri dodavanju predmeta!').finally(function () {
                        listSubjects(teacher);
                    })
                })
            }, function () {
                //$scope.status = 'You cancelled the dialog.';
            });
    }

    this.deleteSubject = function (subject) {
        Service.deleteTeacherSubject(teacher, subject).then(function () {
            self.listSubjects();
        }, function (err) {
            Service.showAlert('Greška', 'Greška pri brisanju predmeta!');
        })
    }

    this.listSubjects();

}]);