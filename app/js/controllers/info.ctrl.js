angular.module('app').controller('infoCtrl', ['$scope', '$mdDialog', 'Service', 'student', function ($scope, $mdDialog, Service, student) {
    $scope.student = student;

    $scope.default = {
        firstname: 24,
        lastname: 24,
        faculty: 32,
        city: 12,
        course: 19
    }

    $scope.max = {
        firstname: 24,
        lastname: 24,
        faculty: 32,
        city: 12,
        course: 19
    }

    $scope.cancel = function () {
        $mdDialog.cancel();
    };

    $scope.save = function () {
        $mdDialog.hide($scope.student);
    };

    $scope.change = function (name) {
        var c = 0;
        if ($scope.student[name] != null) {
            c = $scope.default[name];
            for (var i = 0; i < $scope.student[name].length; i++) {
                c -= ($scope.student[name].charCodeAt(i) <= 255) ? 0 : 1;
            }
            $scope.max[name] = Math.max(0, c);
        }
        return $scope.max[name];
    }

}]);