angular.module('app').factory('Subject', [function () {
    var Subject = function () {
        this.code = '';
        this.credits = 0;
        this.mark = 5;
        this.date = new Date();
    };

    return Subject;
}]);