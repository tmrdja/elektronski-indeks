angular.module('app').controller('userCtrl', ['$scope', '$mdDialog', 'Service', 'user', function ($scope, $mdDialog, Service, user) {
    $scope.user = user;

    $scope.cancel = function () {
        $mdDialog.cancel();
    };

    $scope.save = function () {
        Service.saveUser(user).then(function () {
                $mdDialog.hide();
            },
            function (err) {
                $mdDialog.hide();
                if (user._id != null) {
                    Service.showAlert("Greška", "Greška pri dodavanju korisnika");
                } else {
                    Service.showAlert("Greška", "Greška pri izmeni korisnika");
                }
            });
    };

}]);