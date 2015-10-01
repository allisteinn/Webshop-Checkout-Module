require( 'angular' );

angular.module('app',
	[
		require('angular-ui-router'),
		require('angular-ui-bootstrap'),
		require('./routes.js'),
		require('./main.js')
	]
);

