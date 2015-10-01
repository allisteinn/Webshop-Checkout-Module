module.exports = function() {
	angular.module('app').config(function($stateProvider, $urlRouterProvider) {
		
		$urlRouterProvider.otherwise('/');

		$stateProvider

		.state('home', {
			url: '/',
			templateUrl: 'home.html'
		});
		
		// configure html5 to get links working on jsfiddle
		//$locationProvider.html5Mode(true);
	});
};
