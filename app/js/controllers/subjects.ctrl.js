angular.module('app').controller('subjectsCtrl', ['Service', '$mdDialog', '$stateParams', function ViewCtrl(Service, $mdDialog, $stateParams, Subject) {
    var self = this;
    self.subjects = [];
    self.query = {
        filter: '',
        limit: '10',
        order: 'name',
        page: 1
    };

    this.selected = [];

    this.getSubjects = function () {
        Service.getSubjects(self.query).then(function (res) {
            self.subjects = res.data;
        });
    }

    this.cancel = function () {
        $mdDialog.cancel();
    };

    this.pick = function () {
        $mdDialog.hide(self.selected[0]);
    };

    this.getSubjects();

}]);