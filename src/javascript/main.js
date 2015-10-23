module.exports = function() {
	angular.module('app').controller('mainCtrl', function ($rootScope, $scope, $q) {
		console.info('loadMainCtrl');

		$scope.loggedIn = false;
		$scope.emptyUser = {
			nin: '',
			name: '',
			address: '',
			postcode: '',
			phoneNumber: ''
		};
		$scope.user = $scope.emptyUser;
		$scope.preMadeUser = {
			nin: '1234567890',
			name: 'Jón Jónsson',
			addresses: [
				{
					address: 'Stórhöfða 29',
					postalCode: '110'
				},
				{
					address: 'Stórhöfða 31',
					postalCode: '110'
				}
			],
			phoneNumber: '8881234'
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
		$scope.callCheckout = function(sendUser, displayMode, allowedDeliveryMethods) {
			var theUser = sendUser? $scope.user: undefined;
			var deferred = $q.defer();

			angular.element('pwebcheckout-area').startWebcheckout($scope.basket, theUser, displayMode, allowedDeliveryMethods).then(
				function(response) {
					deferred.resolve(response);
				},
				function(error) {
					deferred.resolve(error);
				}
			);
			return deferred.promise;
		};

		$scope.simpleWebpage = {
			startCheckout: function() {
				$scope.callCheckout(false, undefined, undefined);
			}
		};
		$scope.complexWebpage = {
			startCheckout: function() {
				$scope.callCheckout($scope.loggedIn, undefined, undefined).then(
					function(response) {
						$scope.lastResult = JSON.stringify(response, null, "    ");
					},
					function(error) {
						$scope.lastResult = 'Villa kom upp';
					}
				);
			}
		};
		$scope.specialWebpage = {
			startCheckout: function() {
				var displayMode = $scope.loggedIn? ['skiplogin', 'skipuserinfo']: undefined;
			$scope.callCheckout($scope.loggedIn, displayMode, undefined).then(
				function(response) {
					$scope.lastResult = JSON.stringify(response, null, "    ");
				},
				function(error) {
					$scope.lastResult = 'Villa kom upp';
				}
			);
			}
		};
	});
};
