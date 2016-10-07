angular.module('app').controller('navCtrl', ['$scope', 'Service', 'AuthService', '$state', function ViewCtrl($scope, Service, AuthService, $state) {
    var self = this;
    this.state = $state;
    console.log('state', $state)

    this.getUser = function () {
        return AuthService.user;
    }

    $scope.$watch('state.current.name', function (val) {
        this.selectedTab = val;
    });

    this.logout = function () {
        AuthService.logout();
        $state.go('login');
    }

}]);