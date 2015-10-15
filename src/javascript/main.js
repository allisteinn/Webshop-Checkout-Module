module.exports = function() {
  angular.module('app').controller('mainCtrl', function ($rootScope, $scope, $q) {
  	console.info('loadMainCtrl');
    
    $scope.loggedIn = false;
    $scope.emptyUser = {
    	nin: '',
    	name: '',
    	address: '',
    	postcode: '',
    	mobilePhoneNumber: ''
    };
    $scope.user = $scope.emptyUser;
    $scope.preMadeUser = {
    	nin: '1234567890',
    	name: 'Jón Jónsson',
    	address: 'Stórhöfða 29',
    	postcode: '110',
    	mobilePhoneNumber: '8881234'
    };
    $scope.basket = {
    	amount: 0,
    	weight: 0,
    	space: 0,
    	price: 0
    };
    $scope.purchasableItem = {
    	weight: 10,
    	space: 2,
    	price: 5
    };

    $scope.login = function() {
    	$scope.loggedIn = true;
    	angular.extend($scope.user, $scope.preMadeUser);
    };

    $scope.logout = function() {
    	$scope.loggedIn = false;
    	angular.extend($scope.user, $scope.emptyUser);
    };

    $scope.addToBasket = function(item) {
    	console.info('woop');
    	$scope.basket.amount++;
    	$scope.basket.weight += item.weight;
    	$scope.basket.space += item.space;
    	$scope.basket.price += item.price;
    };

    $scope.emptyBasket = function() {
    	$scope.basket.amount = 0;
    	$scope.basket.weight = 0;
    	$scope.basket.space = 0;
    };

    $scope.lastResult;

    // $.fn.startWebcheckout = function(storeProductInput, storeUserInput, displayMode, allowedDeliveryMethods)
    $scope.callCheckout = function(storeUserInput, displayMode, allowedDeliveryMethods) {
    	var deferred = $q.defer();
			return angular.element('pwebcheckout-area').startWebcheckout(storeUserInput, displayMode, allowedDeliveryMethods).then(
    		function(response) {
    			deferred.resolve(response);
    		},
    		function(error) {
    			deferred.reject(error);
    		}
    	);
    	return deferred.promise;
    };

    $scope.callCheckout = function(displayMode, allowedDeliveryMethods) {
    	var deferred = $q.defer();
    	return angular.element('pwebcheckout-area').startWebcheckout($scope.basket, $scope.user, displayMode, allowedDeliveryMethods).then(
    		function(response) {
    			deferred.resolve(response);
    		},
    		function(error) {
    			deferred.reject(error);
    		}
    	);
    	return deferred.promise;
    };

    $scope.callCheckout = function() {
    	var deferred = $q.defer();
    	angular.element('pwebcheckout-area').startWebcheckout($scope.basket, $scope.user).then(
    		function(response) {
    			deferred.resolve(response);
    		},
    		function(error) {
    			deferred.reject(error);
    		}
    	);
    	return deferred.promise;
    };

    $scope.simpleWebpage = {
    	posthouseOnly: function() {
    		$scope.callCheckout(undefined, ['posthouse']);
    	},
    	anywhere: function() {
    		$scope.callCheckout($scope.emptyUser, undefined, undefined);
    	}
    };
    $scope.complexWebpage = {
    	startCheckout: function() {
    		$scope.lastResult = JSON.stringify($scope.callCheckout(),null,"    ");
    	}
    };
    $scope.specialWebpage = {
    	startCheckout: function() {
    		if ($scope.loggedIn) {
    			$scope.callCheckout('skipuserinfo');
    		}
    		else {
    			$scope.callCheckout().then(
    				function(response) {
    					$scope.lastResult = JSON.stringify(response, null, "    ");
    				},
    				function(error) {
    					$scope.lastResult = 'Villa kom upp';
    				}
    			);	
    		}
    	}
    };
  });
};
