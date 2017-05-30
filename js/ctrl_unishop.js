var UniApp = angular.module('unishopModule', [
	'ngResource',
	'ngMaterial',
	'mgcrea.pullToRefresh',
	'LocalStorageModule'
]);

UniApp.filter('trustAsHtml', ['$sce', function ($sce) {
  return function(htmlCode){
    return $sce.trustAsHtml(htmlCode);
  }
}]);

UniApp.directive('myEnter', function () {
	return function (scope, element, attrs) {
		element.bind("keydown keypress", function (event) {
			if (event.which === 13) {
				scope.$apply(function () {
					scope.$eval(attrs.myEnter);
				});

				event.preventDefault();
			}
		});
	};
});

UniApp.directive('focusMe', function ($timeout) {
	return {
		link: function (scope, element, attrs) {
			$timeout(function () {
				element[0].focus();
			}, 750);
		}
	};
});

UniApp.directive('focusOn', function () {
	return function (scope, elem, attr) {
		scope.$on(attr.focusOn, function (e) {
			elem[0].focus();
		});
	};
});

UniApp.directive('clickOn', function () {
	return function (scope, elem, attr) {
		scope.$on(attr.clickOn, function (e) {
			elem[0].click();
		});
	};
});

UniApp.config(function ($httpProvider, $mdThemingProvider, localStorageServiceProvider) {
	$mdThemingProvider.theme('default')
		.primaryPalette('blue')
		.accentPalette('orange');

	$mdThemingProvider.theme('login')
		.primaryPalette('indigo')
		.accentPalette('orange');

	localStorageServiceProvider.setPrefix('stockie');	

  	//initialize get if not there
    if (!$httpProvider.defaults.headers.get) {
        $httpProvider.defaults.headers.get = {};    
    }    

    // Answer edited to include suggestions from comments
    // because previous version of code introduced browser-related errors

    //disable IE ajax request caching
    $httpProvider.defaults.headers.get['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT';
    // extra
    $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
    $httpProvider.defaults.headers.get['Pragma'] = 'no-cache';

});

UniApp.controller('unishopController',
	function (
		$scope,
		$q,
		$timeout,
		$mdSidenav,
		$log,
		$http,
		$mdDialog,
		$location,
		localStorageService,
		$sce
	) {
		// Check if localStorage is supported
		this.isLocalStorageSupported = false;
		if (localStorageService.isSupported) {
			this.isLocalStorageSupported = true;
		}

		this.barcodeOptions = {
			format: "ean13",
			textmargin: 0,
			width: 1.5,
			height: 30,
			displayValue: true
		}

		function zoekJSONNaam(obj, ANaam) {
			for (var i = 0; i < obj.length; i++) {
				if (obj[i].Name == ANaam) {
					return obj[i];
				}
			}
		}

		function buildToggler(navID) {
			return function () {
				$mdSidenav(navID)
					.toggle()
					.then(function () {
						// $log.debug("toggle " + navID + " is done");
					});
			}
		}

		function updateLocalStorage() {
			var now = new Date();
			var expireDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

			localStorageService.set('unishopGebruikersID', $scope.gebruikersID);
			localStorageService.set('unishopDataset', $scope.dataset);
			localStorageService.set('unishopCompanyName', $scope.bedrijfsnaam);
			localStorageService.set('unishopUserName', $scope.inlognaam);
			localStorageService.set('unishopPassword', $scope.wachtwoord);
			localStorageService.set('unishopFullName', $scope.gebruikersnaam);
			localStorageService.set('unishopDealerType', $scope.dealertype);
			localStorageService.set('expandAttributen', iif($scope.expandAttributen, 1, 0));
		}

		$scope.showAlert = function (title, message, ev) {
			$mdDialog.show(
				$mdDialog.alert()
					.parent(angular.element(document.querySelector('#popupContainer')))
					.clickOutsideToClose(true)
					.title(title)
					.textContent(message)
					.ariaLabel('Informatie')
					.ok('OK')
					.targetEvent(ev)
			);
		};

		$scope.toggleMenuLinks = buildToggler('menuLinks');
		$scope.isOpenMenuLinks = function () {
			return $mdSidenav('menuLinks').isOpen();
		};

		// $scope.API_URL = 'http://delphi-ontwikke:6879/v1';
		$scope.API_URL = 'http://api.unishoponline.nl:6879/v1';
		// $scope.API_URL = 'https://api.unishoponline.nl:6880/v1';

		// add public and generic declarations 
		$scope.mainTitle = 'Voorraad';
		$scope.foutResponse = '';
		$scope.activePage = 'home';

		$scope.isLoaded = false;
		// $scope.HeeftData = false;
		$scope.isBusy = false;
		$scope.isVoorraadBusy = false;
		$scope.ingelogd = false;
		$scope.inlogValideren = false;
		$scope.wijzigWachtwoord = false;
		$scope.gebruikersID = '';

		if (localStorageService.get('unishopGebruikersID')) {
			$scope.gebruikersID = localStorageService.get('unishopGebruikersID');
		};
		
		$scope.inlognaam = '';
		if (localStorageService.get('unishopUserName')) {
			$scope.inlognaam = localStorageService.get('unishopUserName');
		};		
		$scope.wachtwoord = '';
		if (localStorageService.get('unishopPassword')) {
			$scope.wachtwoord = localStorageService.get('unishopPassword');
		};		
		$scope.wachtwoord_old = '';
		$scope.wachtwoord_new = '';
		$scope.wachtwoord_new2 = '';

		$scope.isSmall = true;
		$scope.zoekArt = '';
		$scope.zoekArtResultaten = [];
		$scope.zoekArtSelected = null;
		$scope.zoekArtExpanded = [];
		$scope.clusterArtResultaten = [];
		$scope.attribuutArtResultaten = [];
		$scope.artVoorraadResultaten = [];
		$scope.expandVoorraad = false;
		$scope.expandAttributen = false;

		if (localStorageService.get('expandAttributen')) {
			$scope.expandAttributen = (localStorageService.get('expandAttributen') == 1);
		};		
		$scope.expandRemark = false;
		$scope.clusterArtEnkelOpVoorraad = false;

		$scope.dataset = '';

		if (localStorageService.get('unishopDataset')) {
			$scope.dataset = localStorageService.get('unishopDataset');
		};		
		$scope.bedrijfsnaam = '';

		if (localStorageService.get('unishopCompanyName')) {
			$scope.bedrijfsnaam = localStorageService.get('unishopCompanyName');
		};			
		$scope.gebruikersnaam = '';

		if (localStorageService.get('unishopFullName')) {
			$scope.gebruikersnaam = localStorageService.get('unishopFullName');
		};		
		$scope.dealertype = -1;   // -1 = onbekend, 0 = motordealer, 1 = mobiele recreatie, 2 = watersport 3 = transportlogistiek

		if (localStorageService.get('unishopDealerType')) {
			$scope.dealertype = localStorageService.get('unishopDealerType');
		};

		if ($scope.inlognaam && $scope.wachtwoord) {
			$scope.ingelogd = true;
			$scope.inlogValideren = false;
		}

		// add public more declarations below
		this.isMobilePlatform = function () {
			return isMobile.any();
		}

		this.logResponseCode = function () {
			if ($location.search().responsecode) {
				// alert($location.search().responsecode);
				var AUrl = $scope.API_URL + '/logtext/' + encodeURI('responsecode=' + $location.search().responsecode);

				var req = {
					url: AUrl,
					method: 'POST',
					headers:
					{
						'Content-Type': undefined,
						'dataset': $scope.dataset,
						'username': $scope.inlognaam,
						'password': $scope.wachtwoord
					},
					data:
					{

					},
					params:
					{
						// 'callback': 'JSON_CALLBACK',
						'dataset': $scope.dataset,
						'username': $scope.inlognaam,
						'password': $scope.wachtwoord
					}
				};
				var AHttp = $http(req);
			}
		}


		if ($scope.wachtwoord != '') {
			$scope.inlogValideren = true;
			// valideer de user via de API
			var AUrl = $scope.API_URL + '/auth/validateuserlogin';

			var req = {
				url: AUrl,
				method: 'POST',
				headers:
				{
					'Content-Type': undefined
				},
				data: { usercode: $scope.gebruikersID, username: $scope.inlognaam, password: $scope.wachtwoord }
			};

			var AHttp = $http(req);

			AHttp.success(function (response) {
				$scope.ingelogd = true;
				$scope.inlogValideren = false;
				updateLocalStorage();
				// standaard actie hier:
				var appScope = angular.element(document.getElementById('appController')).scope();
				if (appScope) {
					appScope.unishop.logResponseCode();
				}
			});

			AHttp.error(function (response) {
				$scope.wachtwoord = '';
				$scope.ingelogd = false;
				$scope.inlogValideren = false;
			}
			);
		};

		this.isLoginHidden = function () {
			return ($scope.ingelogd);
		};

		this.wijzigWachtwoord = function () {
			$mdSidenav('menuLinks').close()
			.then(function () {
				// $log.debug("menuLinks is gesloten");
			});

			$scope.wachtwoord_old = '';
			$scope.wachtwoord_new = '';
			$scope.wachtwoord_new2 = '';

			$scope.wijzigWachtwoord = true;
		};

		this.cancelWijzigWachtwoord = function () {
			$scope.wijzigWachtwoord = false;
		}

		this.handleWijzigWachtwoord = function () {
			if ($scope.wachtwoord_old == '') {
				$scope.showAlert('Vul uw huidige wachtwoord in.', '');
				return false;
			}

			if ($scope.wachtwoord_new == '') {
				$scope.showAlert('Vul uw nieuwe wachtwoord in.', '');
				return false;
			}

			if ($scope.wachtwoord_new.length < 6) {
				$scope.showAlert('Uw wachtwoord moet minimaal 6 tekens bevatten.', '');
				return false;
			}

			if ($scope.wachtwoord_new2 == '') {
				$scope.showAlert('Vul uw herhaalde wachtwoord in.', '');
				return false;
			}

			if ($scope.wachtwoord_new != $scope.wachtwoord_new2) {
				$scope.showAlert('Uw herhaalde wachtwoord komt niet overeen.', 'Het wachtwoord is hoofdlettergevoelig.');
				return false;
			}

			var AUrl = $scope.API_URL + '/auth/userloginChange';

			var req = {
				url: AUrl,
				method: 'POST',
				headers: {
					'Content-Type': undefined
				},
				data: { usercode: $scope.gebruikersID, username: $scope.inlognaam, password_old: $scope.wachtwoord_old, password_new: $scope.wachtwoord_new }
			};
			var AHttp = $http(req);

			AHttp.success(function (response) {

				$scope.wachtwoord = response.details.password;  // encoded versie van het wachtwoord
				updateLocalStorage();
				$scope.showAlert('Wachtwoord is gewijzigd', '');
			});

			AHttp.error(function (response) {
				var errortext = 'Controleer uw gegevens en probeer het nogmaals.';
				var errortextSub = '';
				if (response != null) {
					if (response.Error != null) {
						if (response.Error.ErrorText != null) {
							errortextSub = response.Error.ErrorText;
						}
					}
				}
				$scope.showAlert(errortext, errortextSub);
			});

			$scope.wijzigWachtwoord = false;
			return true;
		}

		this.handleLogin = function () {
			if ($scope.gebruikersID == '') {
				$scope.showAlert('Inloggen', 'Geen gebruikers ID ingevuld.');
				return false;
			}

			if ($scope.inlognaam == '') {
				$scope.showAlert('Inloggen', 'Geen inlognaam ingevuld.');
				return false;
			}

			if ($scope.wachtwoord == '') {
				$scope.showAlert('Inloggen', 'Geen wachtwoord ingevuld.');
				return false;
			}

			$scope.isBusy = true;
			$scope.ingelogd = false;
			$scope.dataset = '';
			$scope.bedrijfsnaam = 'Unishop Management Info';
			$scope.gebruikersnaam = '';
			$scope.dealertype = -1;

			var AUrl = $scope.API_URL + '/auth/userlogin';

			var req = {
				url: AUrl,
				method: 'POST',
				headers: {
					'Content-Type': undefined
				},
				data: { usercode: $scope.gebruikersID, username: $scope.inlognaam, password: $scope.wachtwoord }
			};

			var AHttp = $http(req);

			AHttp.success(function (response) {
				$scope.isBusy = false;
				$scope.ingelogd = true;
				$scope.dataset = response.details.dataset;
				$scope.bedrijfsnaam = response.details.bedrijfsnaam;
				$scope.gebruikersnaam = response.details.fullname;
				$scope.dealertype = response.details.dealertype;
				$scope.gebruikersID = response.details.usercode;
				$scope.inlognaam = response.details.username;
				$scope.wachtwoord = response.details.password;  // encoded versie van het wachtwoord
				updateLocalStorage();

				// $scope.showAlert('Inloggen geslaagd', 'Welkom ' + JSON.stringify(response.details));
				var appScope = angular.element(document.getElementById('appController')).scope();
				if (appScope) {
					appScope.unishop.logResponseCode();
				}
			});

			AHttp.error(function (response) {
				$scope.isBusy = false;
				var errortext = 'Controleer uw gegevens en probeer het nogmaals.';
				var errortextSub = '';
				if (response != null) {
					if (response.Error != null) {
						if (response.Error.ErrorText != null) {
							errortextSub = response.Error.ErrorText;
						}
					}
				}
				$scope.showAlert(errortext, errortextSub);
			});

			return true;
		};

		this.Uitloggen = function () {
			$mdSidenav('menuLinks').close()
			.then(function () {
				// $log.debug("menuLinks is gesloten");
			});

			$scope.isBusy = false;
			$scope.ingelogd = false;
			// $scope.gebruikersID = '';
			// $scope.inlognaam = '';
			$scope.wachtwoord = '';
			// $scope.dataset = '';
			$scope.bedrijfsnaam = 'Unishopbedrijf';
			// $scope.gebruikersnaam = '';
			$scope.dealertype = -1;   // -1 = onbekend, 0 = motordealer, 1 = mobiele recreatie, 2 = watersport 3 = transportlogistiek

			updateLocalStorage();
		};

		this.getCustomerDetails = function (customer) {
			/* console.log('In getCustomerDetails with customer id: ' + customer.ID); */
			/* $scope.showAlert('Api call', 'customer with id: ' + customer.ID); */

			$scope.isBusy = true;
			// $scope.zoekCust = query;
			$scope.relatieResultaat = [];

			var AUrl = $scope.API_URL + '/customers/id/' + encodeURI(customer.ID);

			var req = {
				url: AUrl,
				method: 'POST',
				headers: {
					'Content-Type': undefined,
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				}, data: {	},
				params: {
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				}
			};

			$http.post(req.url, req.data, req)
			.then(
				// success
				function (response) {
					$scope.isBusy = false;

					$scope.relatieResultaat = [];
					console.log('====== relatieResultaat ====');
					console.log(response.data);
					console.log('====== relatieResultaat ====');
					
					$scope.relatieResultaat = response.data.customer;
					console.log('$scope.relatieResultaat', $scope.relatieResultaat);
				},

				// error
				function (response) {
					var errortext = 'Fout customer ophalen';
					var errortextSub = '';
					if (response != null) {
						if (response.data != null) {
							if (response.data.Error != null) {
								if (response.data.Error.ErrorText != null) {
									errortextSub = response.data.Error.ErrorText;
								}
							}
						}
					}

					$scope.isBusy = false;
					$scope.showAlert(errortext, errortextSub);
				}
			);

		}

		/* Start quick find customers */
		this.quickFindCustomers = function () {
			console.log('In quickFindCustomers with query: ' + $scope.zoekCust);

			$scope.isBusy = true;
			// $scope.zoekCust = query;
			$scope.relatiesResultaten = [];

			var AUrl = $scope.API_URL + '/customers/quickfind/' + encodeURI($scope.zoekCust) + '/25';   // zoek 25 relaties

			var req = {
				url: AUrl,
				method: 'POST',
				headers: {
					'Content-Type': undefined,
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				}, data: {	},
				params: {
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				}
			};

			$http.post(req.url, req.data, req)
			.then(
				// success
				function (response) {
					$scope.isBusy = false;

					$scope.relatiesResultaten = [];
					console.log('====== relatiesResultaten ====');
					console.log(response.data);
					console.log('====== relatiesResultaten ====');
					
					for (var i = 0; i < response.data.customers.length; i++) {
						$scope.relatiesResultaten.push(response.data.customers[i]);
					}

				},

				// error
				function (response) {
					var errortext = 'Fout customers ophalen';
					var errortextSub = '';
					if (response != null) {
						if (response.data != null) {
							if (response.data.Error != null) {
								if (response.data.Error.ErrorText != null) {
									errortextSub = response.data.Error.ErrorText;
								}
							}
						}
					}

					$scope.isBusy = false;
					$scope.showAlert(errortext, errortextSub);
				}
			);
		}
		/* End quick find customers */

		this.handleClusterArt = function (prod) {
			var AUrl = $scope.API_URL + '/products/clustered/' + encodeURI(prod.ProductNr.replace('/', '//')) + '/' + encodeURI(prod.SuCodeAlt);

			var req = {
				url: AUrl,
				method: 'POST',
				headers:
				{
					'Content-Type': undefined,
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				},
				data:
				{

				},
				params:
				{
					// 'callback': 'JSON_CALLBACK',
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				}
			};

			$scope.isBusy = true;
			$scope.clusterArtResultaten = [];

			$http.post(req.url, req.data, req)
			.then(
				// success
				function (response) {
					$scope.isBusy = false;

					$scope.clusterArtResultaten = [];
					for (var i = 0; i < response.data.products.length; i++) {
						$scope.clusterArtResultaten.push(response.data.products[i]);
					}
				},

				// error
				function (response) {
					var errortext = 'Fout cluster ophalen';
					var errortextSub = '';
					if (response != null) {
						if (response.data != null) {
							if (response.data.Error != null) {
								if (response.data.Error.ErrorText != null) {
									errortextSub = response.data.Error.ErrorText;
								}
							}
						}
					}

					$scope.isBusy = false;
					$scope.showAlert(errortext, errortextSub);
				}
			);

			return true;
		};

		this.AttribuutWaarde = function (attr) {
			if (attr.FieldType == 3) {
				// J=1/N=2
				if (attr.Value == '1') {
					return 'ja';
				}
				else {
					return 'nee';
				}
			}
			else {
				return attr.Value;
			}
		}

		this.handleAttribuutArt = function (prod) {
			var AUrl = $scope.API_URL + '/products/attributes/' + encodeURI(prod.ProductNr.replace('/', '//')) + '/' + encodeURI(prod.SuCodeAlt);

			var req = {
				url: AUrl,
				method: 'POST',
				headers:
				{
					'Content-Type': undefined,
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				},
				data:
				{
				},
				params:
				{
					//'callback': 'JSON_CALLBACK',
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				}
			};

			$scope.isBusy = true;
			$scope.attribuutArtResultaten = [];

			$http.post(req.url, req.data, req)
			.then(
				// success
				function (response) {

					$scope.isBusy = false;
					$scope.attribuutArtResultaten = [];
					for (var i = 0; i < response.data.attributes.length; i++) {
						$scope.attribuutArtResultaten.push(response.data.attributes[i]);
					}
				},

				// error
				function (response) {
					var errortext = 'Fout attributen ophalen';
					var errortextSub = '';
					if (response != null) {
						if (response.data != null) {
							if (response.data.Error != null) {
								if (response.data.Error.ErrorText != null) {
									errortextSub = response.data.Error.ErrorText;
								}
							}
						}
					}

					$scope.isBusy = false;
					$scope.showAlert(errortext, errortextSub);
				}
			);

			return true;
		};

		this.handleArtVoorraad = function (prod) {

			var AUrl = $scope.API_URL + '/products/supplierstocklevel/' + encodeURI(prod.ProductNr.replace('/', '//')) + '/' + encodeURI(prod.SuCodeAlt);

			var req = {
				url: AUrl,
				method: 'POST',
				headers:
				{
					'Content-Type': undefined,
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				},
				data:
				{
				},
				params:
				{
					//'callback': 'JSON_CALLBACK',
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				}
			};

			$scope.isVoorraadBusy = true;
			$scope.artVoorraadResultaten = [];
			$scope._handleArtVoorraadID = prod.ProductNr + prod.SuCodeAlt;

			$http.post(req.url, req.data, req)
			.then(
				// success
				function (response) {
					$scope.isVoorraadBusy = false;
					// is het het antwoord op het laatste verzoek?
					if (
						($scope.zoekArtSelected != null) &&
						(($scope.zoekArtSelected.ProductNr + $scope.zoekArtSelected.SuCodeAlt) == $scope._handleArtVoorraadID)
					) {
						$scope.artVoorraadResultaten = [];
						for (var i = 0; i < response.data.stock.length; i++) {
							$scope.artVoorraadResultaten.push(response.data.stock[i]);
						}
					}
				},

				// error
				function (response) {
					var errortext = 'Fout voorraad ophalen';
					var errortextSub = '';
					if (response != null) {
						if (response.data != null) {
							if (response.data.Error != null) {
								if (response.data.Error.ErrorText != null) {
									errortextSub = response.data.Error.ErrorText;
								}
							}
						}
					}

					$scope.isVoorraadBusy = false;
					$scope.showAlert(errortext, errortextSub);
				}
			);

			return true;
		}

		this.toonProd = function (prod) {
			$scope.zoekArtSelected = prod;
			if (prod.ClusterSize > 1) {
				// haal cluster op
				this.handleClusterArt(prod);
				// en haal attributen
				this.handleAttribuutArt(prod);
			}

			this.handleArtVoorraad(prod);
		}

		this.handleZoekArt = function () {

			$scope.foutResponse = '';
			$scope.isBusy = true;
			$scope.zoekArtResultaten = [];
			$scope.zoekArtExpanded = [];
			$scope.zoekArtSelected = null;
			$scope.clusterArtResultaten = [];
			$scope.attribuutArtResultaten = [];
			$scope.artVoorraadResultaten = [];

			var AUrl = $scope.API_URL + '/products/find/' + encodeURI($scope.zoekArt) + '/25';   // zoek 25 artikelen

			var req = {
				url: AUrl,
				method: 'POST',
				headers: {
					'Content-Type': undefined,
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				},
				data: { },
				params: {
					'dataset': $scope.dataset,
					'username': $scope.inlognaam,
					'password': $scope.wachtwoord
				}
			};

			$http.post(req.url, req.data, req)
			.then(
				// success
				function (response) {
					$scope.isBusy = false;

					$scope.zoekArtResultaten = [];
					for (var i = 0; i < response.data.products.length; i++) {
						$scope.zoekArtResultaten.push(response.data.products[i]);
					}

					/*
					if ($scope.zoekArtResultaten.length == 1) {
						var appScope = angular.element(document.getElementById('appController')).scope();
						if (appScope) {
							appScope.unishop.toonProd($scope.zoekArtResultaten[0]);
						}
					}

					if ($scope.zoekArtResultaten.length == 0) {
						$scope.status_zoeken = 'niets gevonden...probeer een nieuwe zoekopdracht';
						$scope.foutResponse = 'niets gevonden...probeer een nieuwe zoekopdracht';
						// todo: hier alertje niets gevonden
						$scope.showAlert('Niets gevonden.', 'Probeer een nieuwe zoekopdracht');
						window.setTimeout(function () {
							$scope.foutResponse = '';
							$scope.isBusy = false;
							$scope.$apply();
						}, 4000);
					}
					*/

				},

				// error
				function (response) {
					var errortext = 'Fout zoeken';
					var errortextSub = '';
					if (response != null) {
						if (response.data != null) {
							if (response.data.Error != null) {
								if (response.data.Error.ErrorText != null) {
									errortextSub = response.data.Error.ErrorText;
								}
							}
						}
					}

					$scope.foutResponse = '';
					$scope.isBusy = false;
					$scope.zoekArtResultaten = [];
					$scope.zoekArtExpanded = [];
					$scope.zoekArtSelected = null;
					$scope.clusterArtResultaten = [];
					$scope.attribuutArtResultaten = [];
					$scope.artVoorraadResultaten = [];

					$scope.showAlert(errortext, errortextSub);
				}
			);
		}

		this.toggleExpandProd = function (prod) {
			var idx = $scope.zoekArtExpanded.indexOf(prod);
			if (idx == -1) {
				$scope.zoekArtExpanded.push(prod);
			}
			else {
				$scope.zoekArtExpanded.remove(idx, idx);
			}
		}

		this.toggleExpandVoorraad = function () {
			$scope.expandVoorraad = !$scope.expandVoorraad;
		}

		this.toggleExpandAttributen = function () {
			$scope.expandAttributen = !$scope.expandAttributen;
			updateLocalStorage();
		}

		this.toggleExpandRemark = function () {
			$scope.expandRemark = !$scope.expandRemark;
		}

		this.sluitProd = function () {
			$scope.zoekArtSelected = null;
			$scope.clusterArtResultaten = [];
			$scope.attribuutArtResultaten = [];
		}

		this.isActivePage = function (pageName) {
			return ($scope.activePage == pageName);
		}

		this.discountDate = function (isoStr) {
			if (isoStr) {
				if (isoStr.substring(0, 10) == '1899-12-30') {
					return '';
				}
				else {
					return dateToDMY(isoDateStringToDate(isoStr), '-');
				}
			}
		}

		this.heeftDiscountDate = function (isoStr) {
			if (isoStr) {
				if (isoStr.substring(0, 10) == '1899-12-30') {
					return false;
				}
				else {
					return true;
				}
			}
		}

		this.discountPercentage = function (prod) {
			if (prod) {
				if (prod.RetailPrice == 0) {
					return 0;
				} else {
					return ((prod.RetailPrice - prod.RetailPriceAfterDiscount) / prod.RetailPrice) * 100;
				}
			}
		}

		this.resetZoekArt = function () {
			$scope.zoekArt = '';
			$scope.isBusy = false;
			$scope.$apply();
		}

		this.openHome = function () {
			$scope.isBusy = false;
			$scope.zoekCust = '';
			$scope.relatiesResultaten = [];

			$scope.mainTitle = 'Voorraad';
			$scope.activePage = 'home';
			$scope.$apply();
			$mdSidenav('menuLinks').close()
				.then(function () {
					//$log.debug("menuLinks is gesloten");
				});
		}

		this.openItem1 = function () {
			$scope.mainTitle = 'Mijn Item';
			$scope.activePage = 'pageItem';
			$mdSidenav('menuLinks').close()
				.then(function () {
					// $log.debug("menuLinks is gesloten");
				});
		}

		this.pageCustomers = function () {
			$scope.isBusy = false;
			$scope.mainTitle = 'Relaties';
			$scope.activePage = 'pageCustomers';
			$scope.$apply();
			$mdSidenav('menuLinks').close()
				.then(function () {
					// $log.debug("menuLinks is gesloten");
				});
		}

		this.openPageCustomer = function (relatie) {
			/* alert('opening page customer'); */
			$scope.isBusy = false;
			$scope.mainTitle = 'Relatie';
			$scope.activePage = 'pageCustomer';
			$scope.$apply();
			this.getCustomerDetails(relatie)
			$mdSidenav('menuLinks').close()
				.then(function () {
					// $log.debug("menuLinks is gesloten");
				});
		}				

		this.resetFoutResponse = function () {
			$scope.foutResponse = '';
			$scope.$apply();
		}

		this.handleZoekArtWrapper = function () {
			this.handleZoekArt();
		}

		this.newBarcodeScanner = function () {
			var scanner = null;
			var self = this;
			document.addEventListener("deviceready", function () {
				var scanner = cordova.plugins.barcodeScanner;
				scanner.scan(function (result) {
					$scope.zoekArt = result.text;
					self.handleZoekArtWrapper();
				}, function (error) {},
				{
					showTorchButton: true,
					torchOn: true,
					prompt: "Plaats een barcode binnen het scangebied",
					orientation: "landscape"
				});
			}.bind(this), false);
		}

		document.getElementById('mainContent').style.visibility = 'visible';

		// dit moet het laatste statement zijn
		$scope.isLoaded = true;
	})

UniApp.controller('MenuLinksCtrl', function ($scope, $timeout, $mdSidenav, $log) {
	this.close = function () {
		$mdSidenav('menuLinks').close()
		.then(function () {
			// $log.debug("menuLinks is gesloten");
		});
	};
});

UniApp.controller('PullToRefreshCtrl', function ($scope, $timeout, $mdSidenav, $log) {
	this.onPullReload = function () {
		var appScope = angular.element(document.getElementById('appController')).scope();
		appScope.unishop.onPullReload();
	};
});

