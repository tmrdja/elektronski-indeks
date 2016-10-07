angular.module('app').controller('loginCtrl', ['AuthService', '$mdDialog', '$state', 'Service', function ViewCtrl(AuthService, $mdDialog, $state, Service) {
    var self = this;

    this.user = {
        username: 'student',
        password: 'pass'
    }

    this.login = function (index, subject) {
        AuthService.login(self.user.username, self.user.password).then(function (res) {
            $state.go('year', {
                year: 1
            });
        }, function (err) {
            Service.showAlert('Greška', 'Korisničko ime ili šifra su pogrešni!');
        });
    }

}]);