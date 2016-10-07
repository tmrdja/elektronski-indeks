angular.module('app').directive('subjects', function appVersion() {
    return {
        restrict: 'E',
        templateUrl: 'partials/subjects.html',
        controller: 'subjectsCtrl',
        controllerAs: 'ctrl'

    };
});