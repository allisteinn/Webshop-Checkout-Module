module.exports = function() {
	angular.module('app').config(function($stateProvider, $urlRouterProvider) {
		
		$urlRouterProvider.otherwise('/');

		$stateProvider

		.state('home', {
			url: '/',
			templateUrl: 'home.html'
		})
		.state('simple', {
			url: '/simple',
			templateUrl: 'simple.html'
		})
		.state('complex', {
			url: '/complex',
			templateUrl: 'complex.html'
		})
		.state('special', {
			url: '/special',
			templateUrl: 'special.html'
		})
		.state('karfa', {
			url: '/karfa',
			templateUrl: 'karfa.html'
		});
		
		// configure html5 to get links working on jsfiddle
		//$locationProvider.html5Mode(true);
	});
};
