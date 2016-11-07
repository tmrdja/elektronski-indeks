angular.module('app').controller('SubjectCtrl', ['$scope', '$mdDialog', 'subject', 'index', 'editSubject', 'AuthService', function($scope, $mdDialog, subject, index, editSubject, AuthService) {
    $scope.subject = subject;
    $scope.role = AuthService.user.role;
    $scope.subject.date = new Date($scope.subject.date);
    try {
        $scope.subject.code = $scope.subject.code.match(/[0-9a-zA-z]{3,5}/)[0];
    } catch (e) {};

    $scope.cancel = function() {
        $mdDialog.cancel();
    };

    $scope.save = function() {
        $mdDialog.hide($scope.subject);
    };

    /*$scope.pickSubject = function() {
        console.log($mdDialog);
        var previousDialog = $mdDialog;

        var d = $mdDialog.show({
                controller: 'subjectsCtrl',
                controllerAs: 'ctrl',
                locals: {
                    subject: $scope.subject
                },
                templateUrl: '/dialogs/subjects-picker.html',
                parent: angular.element(document.body),
                clickOutsideToClose: false
            })
            .then(function(subject) {
                $scope.subject.code = subject.code;
                $scope.subject.name = subject.name;
                console.log(previousDialog, d);
                editSubject(index, $scope.subject);
            }, function() {
                //$scope.status = 'You cancelled the dialog.';
            });
    }*/

}]);
