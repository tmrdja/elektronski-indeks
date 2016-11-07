// Declare app level module which depends on filters, and services
angular.module('app', ['ngSanitize', 'ngResource', 'ui.router', 'ngMaterial', 'md.data.table'])
    .constant('VERSION', '0.0.1')
    .constant('AUTH_EVENTS', {
        notAuthenticated: 'auth-not-authenticated'
    })
    .constant('API_ENDPOINT', {
        url: window.location.origin
    })
    .value('multiple', false)
    .config(function appConfig($stateProvider, $locationProvider, $urlRouterProvider, $httpProvider) {
        //$locationProvider.hashPrefix('#');
        $httpProvider.interceptors.push('AuthInterceptor');

        $stateProvider
            .state('login', {
                url: "/login", // root route
                views: {
                    "mainView": {
                        templateUrl: "partials/login.html",
                        controller: 'loginCtrl',
                        controllerAs: 'ctrl'
                    }
                }
            })
            .state('year', {
                url: "/year/{year:[1-4]}",
                views: {
                    "mainView": {
                        templateUrl: "partials/year.html",
                        controller: 'yearCtrl',
                        controllerAs: 'ctrl'
                    }
                }
            })
            .state('modules', {
                url: "/modules",
                views: {
                    "mainView": {
                        templateUrl: "partials/modules.html",
                        controller: 'modulesCtrl',
                        controllerAs: 'ctrl'
                    }
                }
            })
            .state('subjects', {
                url: "/subjects",
                views: {
                    "mainView": {
                        templateUrl: "partials/subjects.html",
                        controller: 'subjectsCtrl',
                        controllerAs: 'ctrl'
                    }
                }
            })
            .state('students', {
                url: "/students",
                views: {
                    "mainView": {
                        templateUrl: "partials/students.html",
                        controller: 'studentsCtrl',
                        controllerAs: 'ctrl'
                    }
                }
            })
            .state('teachers', {
                url: "/teachers",
                views: {
                    "mainView": {
                        templateUrl: "partials/teachers.html",
                        controller: 'teachersCtrl',
                        controllerAs: 'ctrl'
                    }
                }
            });

        $urlRouterProvider.otherwise("/year/1");
        // /!\ Without server side support html5 must be disabled.

        return $locationProvider.html5Mode(false);
    })
    .config(function($mdThemingProvider, $mdDateLocaleProvider) {
        $mdThemingProvider.theme('altTheme')
            .primaryPalette('cyan') // specify primary color, all
            // other color intentions will be inherited
            // from default
            .accentPalette('orange');
        $mdThemingProvider.setDefaultTheme('altTheme');

        $mdDateLocaleProvider.formatDate = function(date) {
            return moment(date).format('DD.MM.YYYY');
        };

        $mdDateLocaleProvider.parseDate = function(dateString) {
            var m = moment(dateString, 'DD.MM.YYYY', true);
            return m.isValid() ? m.toDate() : new Date(NaN);
        };
    })
    .run(function($rootScope, $state, AuthService, AUTH_EVENTS) {
        $rootScope.$on('$stateChangeStart', function(event, next, nextParams, fromState) {
            if (!AuthService.isAuthenticated()) {
                console.log(next.name);
                if (next.name !== 'login') {
                    event.preventDefault();
                    $state.go('login');
                }
            }
        });
    });
