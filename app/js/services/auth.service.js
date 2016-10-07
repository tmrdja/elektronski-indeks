angular.module('app').service('AuthService', function ($q, $http) {
    var LOCAL_TOKEN_KEY = 'yourTokenKey';
    var isAuthenticated = false;
    var authToken;
    this.user = null;
    var self = this;

    function loadUserCredentials() {
        var token = window.sessionStorage.getItem(LOCAL_TOKEN_KEY);
        if (token) {
            var user = window.sessionStorage.getItem("user");
            self.user = JSON.parse(user);
            useCredentials(token);
        }
    }

    function storeUserCredentials(token) {
        window.sessionStorage.setItem(LOCAL_TOKEN_KEY, token);
        useCredentials(token);
    }

    function useCredentials(token) {
        isAuthenticated = true;
        authToken = token;

        // Set the token as header for your requests!
        $http.defaults.headers.common.Authorization = authToken;
    }

    function destroyUserCredentials() {
        authToken = undefined;
        isAuthenticated = false;
        $http.defaults.headers.common.Authorization = undefined;
        window.sessionStorage.removeItem(LOCAL_TOKEN_KEY);
        window.sessionStorage.removeItem('user');
    }

    this.login = function (username, password) {
        var data = {
            method: 'POST',
            url: 'login',
            data: {
                username: username,
                password: password
            }
        };
        return $http(data).then(function (res) {
            storeUserCredentials(res.data.token);
            self.user = res.data.user;
            window.sessionStorage.setItem('user', JSON.stringify(self.user));
            return res.data.user;
        }, function (res) {
            throw res.data.message;
        });
    }

    this.logout = function () {
        destroyUserCredentials();
        self.user = null;
    };

    loadUserCredentials();

    this.isAuthenticated = function () {
        return isAuthenticated;
    }
});