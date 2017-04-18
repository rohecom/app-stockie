var UniApp = angular.module('unishopModule', [
	'chart.js',
	'ngResource',
	'ngMaterial',
	'mgcrea.pullToRefresh',
	'ngCookies',
	'barcode'
]);

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

UniApp.config(function ($httpProvider, $mdThemingProvider) {
	$mdThemingProvider.theme('default')
		.primaryPalette('blue')
		.accentPalette('orange');

	$mdThemingProvider.theme('login')
		.primaryPalette('indigo')
		.accentPalette('orange');
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
		$cookies
	) {
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

		function updateCookies() {
			// schrijf cookies; cookies zijn 1 maand geldig
			var now = new Date();
			var expireDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

			$cookies.put('unishopGebruikersID', $scope.gebruikersID, { 'expires': expireDate });
			$cookies.put('unishopDataset', $scope.dataset, { 'expires': expireDate });
			$cookies.put('unishopCompanyName', $scope.bedrijfsnaam, { 'expires': expireDate });
			$cookies.put('unishopUserName', $scope.inlognaam, { 'expires': expireDate });
			$cookies.put('unishopPassword', $scope.wachtwoord, { 'expires': expireDate });
			$cookies.put('unishopFullName', $scope.gebruikersnaam, { 'expires': expireDate });
			$cookies.put('unishopDealerType', $scope.dealertype, { 'expires': expireDate });
			$cookies.put('expandAttributen', iif($scope.expandAttributen, 1, 0), { 'expires': expireDate });
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
		$scope.activePage = 'home';

		$scope.isLoaded = false;
		$scope.HeeftData = false;
		$scope.isBusy = false;
		$scope.isVoorraadBusy = false;
		$scope.ingelogd = false;
		$scope.inlogValideren = false;
		$scope.wijzigWachtwoord = false;
		$scope.gebruikersID = '3105630006583';
		if ($cookies.get('unishopGebruikersID') != null) {
			$scope.gebruikersID = $cookies.get('unishopGebruikersID');
		};
		$scope.inlognaam = 'rohecom';
		if ($cookies.get('unishopUserName') != null) {
			$scope.inlognaam = $cookies.get('unishopUserName');
		};
		$scope.wachtwoord = 'r0hecom38';
		if ($cookies.get('unishopPassword') != null) {
			$scope.wachtwoord = $cookies.get('unishopPassword');
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
		if ($cookies.get('expandAttributen') != null) {
			$scope.expandAttributen = ($cookies.get('expandAttributen') == 1);
		};
		$scope.expandRemark = false;
		$scope.clusterArtEnkelOpVoorraad = false;

		$scope.dataset = '';
		if ($cookies.get('unishopDataset') != null) {
			$scope.dataset = $cookies.get('unishopDataset');
		};
		$scope.bedrijfsnaam = '';
		if ($cookies.get('unishopCompanyName') != null) {
			$scope.bedrijfsnaam = $cookies.get('unishopCompanyName');
		};
		$scope.gebruikersnaam = '';
		if ($cookies.get('unishopFullName') != null) {
			$scope.gebruikersnaam = $cookies.get('unishopFullName');
		};
		$scope.dealertype = -1;   // -1 = onbekend, 0 = motordealer, 1 = mobiele recreatie, 2 = watersport 3 = transportlogistiek
		if ($cookies.get('unishopDealerType') != null) {
			$scope.dealertype = $cookies.get('unishopDealerType');
		};

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
				// schrijf cookies weer weg zodat de expire period bijgewerkt wordt
				updateCookies();
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
				updateCookies();
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

				$scope.ingelogd = true;
				$scope.dataset = response.details.dataset;
				$scope.bedrijfsnaam = response.details.bedrijfsnaam;
				$scope.gebruikersnaam = response.details.fullname;
				$scope.dealertype = response.details.dealertype;
				$scope.gebruikersID = response.details.usercode;
				$scope.inlognaam = response.details.username;
				$scope.wachtwoord = response.details.password;  // encoded versie van het wachtwoord
				updateCookies();

				// $scope.showAlert('Inloggen geslaagd', 'Welkom ' + JSON.stringify(response.details));
				var appScope = angular.element(document.getElementById('appController')).scope();
				if (appScope) {
					appScope.unishop.logResponseCode();
				}
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

			return true;
		};

		this.Uitloggen = function () {
			$mdSidenav('menuLinks').close()
			.then(function () {
				// $log.debug("menuLinks is gesloten");
			});

			$scope.ingelogd = false;
			// $scope.gebruikersID     = '';
			$scope.inlognaam = '';
			$scope.wachtwoord = '';
			$scope.dataset = '';
			$scope.bedrijfsnaam = 'Unishopbedrijf';
			$scope.gebruikersnaam = '';
			$scope.dealertype = -1;   // -1 = onbekend, 0 = motordealer, 1 = mobiele recreatie, 2 = watersport 3 = transportlogistiek

			updateCookies();
		};

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
				});

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

			$http.post(req.url, req.data, req).then
				(
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

			$http.post(req.url, req.data, req).then
				(
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
			//alert(prod.Name);
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

			if ($scope.zoekArt == '') {
				$scope.showAlert('Zoek artikel', 'Geen zoekterm opgegeven.');
				return false;
			}

			$scope.foutResponse = '';

			var AUrl = $scope.API_URL + '/products/find/' + encodeURI($scope.zoekArt) + '/25';   // zoek 2 artikelen

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
			$scope.zoekArtResultaten = [];
			$scope.zoekArtExpanded = [];
			$scope.zoekArtSelected = null;
			$scope.clusterArtResultaten = [];
			$scope.attribuutArtResultaten = [];
			$scope.artVoorraadResultaten = [];

			$http.post(req.url, req.data, req).then
				(
				// success
				function (response) {

					$scope.isBusy = false;

					$scope.zoekArtResultaten = [];
					for (var i = 0; i < response.data.products.length; i++) {
						$scope.zoekArtResultaten.push(response.data.products[i]);
					}

					if ($scope.zoekArtResultaten.length == 1) {
						var appScope = angular.element(document.getElementById('appController')).scope();
						if (appScope) {
							appScope.unishop.toonProd($scope.zoekArtResultaten[0]);
						}
					}

					if ($scope.zoekArtResultaten.length == 0) {
						$scope.foutResponse = 'niets gevonden...probeer een nieuwe zoekopdracht';
						// todo: hier alertje niets gevonden
						$scope.showAlert('Niets gevonden.', 'Probeer een nieuwe zoekopdracht');
						window.setTimeout(function () {
							$scope.foutResponse = '';
							$scope.$apply();
						}, 4000);
					}

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

					$scope.isBusy = false;
					$scope.showAlert(errortext, errortextSub);
				}
				);

			return true;
		};

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
			updateCookies();
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
			$scope.$apply();
		}

		this.openHome = function () {
			$scope.mainTitle = 'Voorraad';
			$scope.activePage = 'home';
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

		this.resetFoutResponse = function () {
			$scope.foutResponse = '';
			$scope.$apply();
		}

		this.handleZoekArtWrapper = function () {
			alert('in test met zoeken: ' + $scope.zoekArt);
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

		this.barcodeProcessed = function (boxes, box) {
			// er is een barcode foto behandeld. boxes is een array met areas. box is een optionele area van de gedetecteerde barcode
			$scope.zoekArt = '';
			$scope.zoekArtResultaten = [];

			if (!box) {
				$scope.foutResponse = 'geen barcode gedetecteerd, probeer opnieuw';
				$scope.$apply();
				window.setTimeout(function () {
					$scope.foutResponse = '';
					$scope.$apply();
				}, 4000);
			}
		}

		this.barcodeDetected = function (code) {
			// er is een barcode gevonden

			$scope.zoekArt = code;
			this.handleZoekArt();
			//$scope.showAlert('Zoek', code);
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

