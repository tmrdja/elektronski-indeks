var path = require('path');

exports.config = {
    modules: {
        definition: false,
        wrapper: false
    },

    paths: {
        "public": 'public',
        "watched": ['app', 'vendor', 'index.js']
    },
    npm: {
        enabled: false
    },
    files: {
        javascripts: {
            joinTo: {
                'js/app.js': /^app/,
                'js/vendor.js': [
                    'bower_components/jquery/dist/jquery.js',
					'bower_components/angular/angular.js',
					'bower_components/moment/min/moment-with-locales.min.js',
					'bower_components/angular-resource/angular-resource.js',
					'bower_components/angular-sanitize/angular-sanitize.js',
					'bower_components/angular-ui-router/release/angular-ui-router.js',
					'bower_components/angular-animate/angular-animate.min.js',
					'bower_components/angular-aria/angular-aria.min.js',
					'bower_components/angular-messages/angular-messages.min.js',
					'bower_components/angular-material/angular-material.min.js',
					'bower_components/angular-material-data-table/dist/md-data-table.min.js'
				]
            },
            order: {
                before: [
					'bower_components/jquery/dist/jquery.js',
					'bower_components/angular/angular.js'
				]
            }
        },
        stylesheets: {
            joinTo: {
                'css/app.css': /^app/,
                'css/vendor.css': [
					'bower_components/angular-material/angular-material.min.css',
					'bower_components/angular-material-data-table/dist/md-data-table.min.css'
				]
            }
        }
    },

    server: {
        path: 'index.js',
        port: 3333,
        base: '/',
        serialport: 'COM3'
    },
    database: {
        url: 'http://root:pass@localhost:8529',
        secret: 'elektronski-indeks!23',
        name: 'elektronski-indeks'
    },

    conventions: {
        assets: /app(\\|\/)assets(\\|\/)/
    },

    sourceMaps: true
};