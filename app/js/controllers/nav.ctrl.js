angular.module('app').controller('navCtrl', ['$scope', 'Service', 'AuthService', '$state', '$rootScope', function ViewCtrl($scope, Service, AuthService, $state, $rootScope) {
    var self = this;
    console.log('state', $state)

    this.getUser = function () {
        return AuthService.user;
    }

    $scope.$watch(function () {
        return $state.$current.name
    }, function (newVal, oldVal) {
        self.selectedTab = newVal;
    })

    this.logout = function () {
        AuthService.logout();
        $state.go('login');
    }

}]);