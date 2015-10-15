(function($) {
	
	$.fn.colorify = function(options) {

		var settings = $.extend({
			color: 'green',
			backgroundColor: 'black'
		}, options);
		
		return this.css({
			color: settings.color,
			backgroundColor: settings.backgroundColor
		});
	};

	$.fn.startWebcheckoutSuperSimple = function(productInput) {
		$.fn.startWebcheckout(productInput, undefined, undefined, undefined);
	};

	$.fn.startWebcheckoutSuperLoggedIn = function(productInput, userInput) {

	};

/* Args clarification
	

	// storeProductInput: Contains information on the products in the form of an array of objects, example:
	var product1 = {
		name: 'Sony sjónvarp ABC1234', 
		size: '5',
		price: '123456'
	},
	product2 = {
		name: 'Gallabuxur QWE987',
		size: '1',
		price: '12345'
	},
	products = [product1, product2];

	
	// storeUserInput: Contains information on the user (nin = kennitala), example:
	var user = {
		nin: '1234567890',
		name: 'Jón Jónsson',
		address: 'Stórhöfði 29',
		postcode: '110'
	};

	
	// displayMode: Specifies which steps will be available
	// (If undefined, then will go through ALL steps). All display modes:
	// 'skipuserinfo'				Hoppar yfir skrefið þar sem notandi slær inn notendaupplýsingar og fer beint
	//											í að velja sendingarmáta
	// 'skipdeliverymethod'	Hoppar yfir skrefið þar sem notandi velur afhendingarmáta. Aðeins hægt að nota
	// 											ef allowedDeliveryMethods inniheldur ekki fleiri en einn afhendingarmáta.

	// example:
	var displaymode1 = undefined,					// Show all steps
	displaymode2 = 'skipuserinfo',				// Skip the userinfo step
	displaymode3 = 'skipdeliverymethod';	// Skip the 'select delivery method'-step

	
	// allowedDeliveryMethods: A list of the delivery methods that are available for selection
	// (If empty or undefined, then allows ALL methods by default). All delivery methods:
	// 'postbox' 			Senda í póstbox
	// 'posthouse' 		Senda í pósthús
	// 'home' 				Heimsending
	// 'smallpackage' Smápakki heim, inn um lúguna

	// example: 
	var methods1 = [			// Only allow sending to posthouse or postbox
		'posthouse',
		'postbox'
	],
	methods2 = [					// Only send home
		'home'
	],
	methods3 = undefined; // Allow all methods

	// Finally call the function with our args:
	$.fn.startWebcheckout(products, user, displaymode3, methods2);

*/
	$.fn.startWebcheckout = function(storeProductInput, storeUserInput, displayMode, allowedDeliveryMethods) {
		var lastNinEntry = undefined,
				loading = false,
				currentStep = 0,
				user = {
					nin: '',
					name: '',
					deliverTo: '',
					address: '',
					postcode: '',
					mobilePhoneNumber: ''
				},
				webcheckoutResult = $.Deferred(),
				chosenService;

		init = function(newUser) {
			$.extend(user, newUser);

			// Open up our modal dialog
			$('#pwebcheckout-area').dialog({
				close: function(event, ui) {
					returnToStore();
				},

				dialogClass: 'webcheckout',

				minHeight: 600,
				minWidth: 800,

				modal: true,

				show: {
					effect: 'fade',
					duration: 800
				},
				title: 'Póstsending'
			});

			// Init modal window by removing any content that might be present from earlier
			if ($('.ui-dialog-content').find('div')) {
				$('.ui-dialog-content').find('div').remove();
			}

			// Find and add our initial view if we haven't done so previously
			if (displayMode == undefined || displayMode == 'skipdeliverymethod') {
				if (displayMode == 'skiplogin') {
					initUserInfoView();
				}
				else {
					initLoginView();
				}
			}
			else {
				initChooseServiceView();
			}	
		};

		initLoginView = function(outputMessage) {
			var html = '<div class="login"><p class="instructions">Ef þú ert skráður í Póstbox...</p><div class="row centered"><div class="userinput phone-number"><label>Símanúmer</label><input type="text" id="pwebcheckout-login-name" class="ui-corner-all" maxlength="7" tabindex="1"><br /><button id="pwebcheckout-login-skipBtn" title="Skrá upplýsingar handvirkt" tabindex="2" class="left"></button><button id="pwebcheckout-login-nameBtn" title="Áfram" tabindex="3" class="right"></button></div><div class="userinput code"><label>SMS-kóði</label><input type="text" id="pwebcheckout-login-code" class="ui-corner-all" maxlength="4" tabindex="1"><br /><button id="pwebcheckout-login-skipBtn" title="Skrá upplýsingar handvirkt" tabindex="2" class="left"></button><button id="pwebcheckout-login-codeBtn" title="Áfram" tabindex="3" class="right"></button></div><div class="output"></div></div></div>';
			loadHtml(html, 1);

			var loginState = 0;
			$('.userinput.phone-number').toggle('fade');
			$('#pwebcheckout-login-skipBtn').button({label: 'Sleppa skrefi'});
			$('#pwebcheckout-login-nameBtn').button({label: 'Áfram'});

			if (outputMessage != undefined && outputMessage.length > 0) {
				setLoginLoading(true, 0, outputMessage);
				setTimeout(function() {
					setLoginLoading(false, 0, outputMessage);
				}, 1000);
			}

			$('#pwebcheckout-login-skipBtn').click(function() {
				initUserInfoView();
			});

			$('#pwebcheckout-login-nameBtn').click(function() {
				setLoginLoading(true, 1);
				requestLogin($('#pwebcheckout-login-name').val())
				.done(function() {
					setLoginLoading(false, 1);
					$('.userinput.phone-number').remove();
					$('.userinput.code').toggle('fade');
					$('#pwebcheckout-login-skipBtn').button({label: 'Sleppa skrefi'});
					$('#pwebcheckout-login-codeBtn').button({label: 'Áfram'});

					$('#pwebcheckout-login-skipBtn').click(function() {
						initUserInfoView();
					});

					$('#pwebcheckout-login-codeBtn').click(function() {
						setLoginLoading(true, 2);
						confirmLogin($('#pwebcheckout-login-code').val())
						.done(function() {
							$('.login').remove();
							initUserInfoView();
						})
						.fail(function(error) {
							initLoginView(error);
						});
					});
				})
				.fail(function(error) {
					setLoginLoading(false, 2, error);
				});
			});
		};

		initUserInfoView = function() {
			var html = '<div class="userinfo"><p class="instructions">Pakka innanlands er hægt að senda á pósthús eða heim að dyrum. Þú getur sent stóra, litla, langa, breiða eða mjóa pakka með Póstinum. Hver pakki fær viðtökunúmer þannig að hægt er að finna sendingu, hvar hún er stödd á hverjum tíma. Við mælum með því að verðmætari sendingar séu tryggðar með pósttryggingu, en lágmarkstrygging er innifalin.</p><div class="row"><div class="userinput"><label>Kennitala</label><input type="text" id="pwebcheckout-nin" class="nin ui-corner-all" maxlength="10"></div></div><div class="row"><div class="userinput"><label>Nafn</label><input type="text" id="pwebcheckout-name" class="ui-corner-all"></div></div><div class="row"><div class="userinput"><label>Berist til</label><input type="text" id="pwebcheckout-deliver-to" class="ui-corner-all"></div></div><div class="row"><div class="userinput"><label>Heimilisfang</label><input type="text" id="pwebcheckout-address" class="address ui-corner-all"><select id="pwebcheckout-postcode" class="ui-corner-all postcode"><option selected disabled style="display:none;">Veldu póstnúmer</option></select></div></div><div class="row"><div class="userinput"><label>Farsímanúmer</label><input type="text" id="pwebcheckout-mobile-phone-number" class="phone-number ui-corner-all" maxlength="7"></div></div><div class="row"><div class="userinput"><label></label><button id="pwebcheckout-complete-userinfo" type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" title="Halda áfram og velja sendingarmáta"><span class="ui-button-text">Áfram</span></button></div></div></div>';

			// Load our html and display it
			loadHtml(html, 2);
			$('.ui-dialog-content').find('.userinfo').toggle('fade');

			// Add all postcodes if we haven't done so previously
			var allPostcodes = [
				{value: '101', full: '101 Reykjavík'},
				{value: '103', full: '103 Reykjavík'},
				{value: '104', full: '104 Reykjavík'},
				{value: '105', full: '105 Reykjavík'},
				{value: '107', full: '107 Reykjavík'},
				{value: '108', full: '108 Reykjavík'},
				{value: '109', full: '109 Reykjavík'},
				{value: '110', full: '110 Reykjavík'},
				{value: '860', full: '860 Hvolsvöllur'},
				{value: '870', full: '870 Vík'}
			];
			addOptions(allPostcodes, $('#pwebcheckout-postcode'));

			// Then load all userinfo if available (and select correct postcode)
			loadUserInfo();

			// TODO: Verify and save userinfo before proceeding to next view
			$('#pwebcheckout-complete-userinfo').click(function() {
				// Verify & save information
				user.nin = $('#pwebcheckout-nin').val();
				user.name = $('#pwebcheckout-name').val();
				user.deliverTo = $('#pwebcheckout-deliver-to').val();
				user.address = $('#pwebcheckout-address').val();
				user.postcode = $('#pwebcheckout-postcode option:selected').val();
				user.mobilePhoneNumber = $('#pwebcheckout-mobile-phone-number').val();;
				console.info($('pwebcheckout'));
				user.postcodeFull = $('#pwebcheckout-postcode option:selected').text();
				console.info(user);

				if (displayMode == 'skipdeliverymethod') {
					$('#pwebcheckout-area').dialog('close');
				}
				else {
					initChooseServiceView();
				}	
			});
		};

		initChooseServiceView = function() {
			getDeliveryMethods()
			.done(function(rMethods) {

				var availableServices = [];
				if (rMethods != undefined && rMethods.length > 0) {
					if (allowedDeliveryMethods == undefined) {
						availableServices = rMethods;
					}
					else {
						for (var i = 0; i < rMethods.length; i++) {
							if ($.inArray(rMethods[i], allowedDeliveryMethods) > -1)
								availableServices.push(rMethods[i]);
						}
					}
				}

				var fullhtml = '<div class="choose-service"><div class="container left"><div class="title"><span>Heimsending</span></div><div class="horizontal-line"></div><div class="content"><p>Hægt er að panta heimsendingu, gegn gjaldi, í þeim póstnúmerum þar sem Pósturinn er með heimaksturskerfi.</p><div class="row"><div class="userinput get"><label>Heimilisfang</label><input type="text" id="pwebcheckout-address" class="address ui-corner-all"><select id="pwebcheckout-postcode" class="ui-corner-all postcode"><option selected disabled style="display:none;">Veldu Póstnúmer...</option></select></div></div></div><div class="footer"><button id="pwebcheckout-sendHomeBtn" tabindex="1" title="Velja1" autofocus></button></div></div><div class="container center"><div class="title"><span>Sækja á pósthús</span></div><div class="horizontal-line"></div><div class="content"><p>Pósthús eru staðsett um allt land, eða á um 60 stöðum. Finndu staðsetningu, opnunartíma og þjónustustig á hvaða pósthúsi sem er. Þú getur einnig leitað á Íslandskorti.</p><div class="row"><div class="userinput get"><select id="pwebcheckout-posthouse" class="ui-corner-all posthouse"><option selected disabled style="display:none;">Veldu Pósthús...</option></select></div></div></div><div class="footer"><button id="pwebcheckout-sendPosthouseBtn" tabindex="2" title="Velja2"></button></div></div><div class="container right"><div class="title"><span>Póstbox</span></div><div class="horizontal-line"></div><div class="content"><p>Það er einfalt að skrá sig í Póstboxið á postur.is. Þar ertu leidd(ur) áfram, skref fyrir skref þar til þú færð þitt P-númer, velur þér Póstbox og getur farið að nýta þér þjónustuna.</p><div class="row"><div class="userinput"><label></label><input type="text" class="ui-corner-all postbox" placeholder="P-Númer..."></div></div><div class="row"><div class="userinput get"><select id="pwebcheckout-postbox" class="ui-corner-all postbox"><option selected disabled style="display:none;">Veldu Póstbox...</option></select></div></div></div><div class="footer"><button id="pwebcheckout-sendPostboxBtn" tabindex="3" title="Velja3"></button></div></div></div>';

				var html = '',
						postboxHtml = '<div class="title"><span>Póstbox</span></div><div class="horizontal-line"></div><div class="content"><p>Það er einfalt að skrá sig í Póstboxið á postur.is. Þar ertu leidd(ur) áfram, skref fyrir skref þar til þú færð þitt P-númer, velur þér Póstbox og getur farið að nýta þér þjónustuna.</p><div class="row"><div class="userinput"><label></label><input type="text" class="ui-corner-all postbox" placeholder="P-Númer..."></div></div><div class="row"><div class="userinput get"><select id="pwebcheckout-postbox" class="ui-corner-all postbox"><option selected disabled style="display:none;">Veldu Póstbox...</option></select></div></div></div><div class="footer"><button id="pwebcheckout-sendPostboxBtn" tabindex="3" title="Velja3"></button></div>',
						posthouseHtml = '<div class="title"><span>Sækja á pósthús</span></div><div class="horizontal-line"></div><div class="content"><p>Pósthús eru staðsett um allt land, eða á um 60 stöðum. Finndu staðsetningu, opnunartíma og þjónustustig á hvaða pósthúsi sem er. Þú getur einnig leitað á Íslandskorti.</p><div class="row"><div class="userinput get"><select id="pwebcheckout-posthouse" class="ui-corner-all posthouse"><option selected disabled style="display:none;">Veldu Pósthús...</option></select></div></div></div><div class="footer"><button id="pwebcheckout-sendPosthouseBtn" tabindex="2" title="Velja2"></button></div>',
						homeHtml = '<div class="title"><span>Heimsending</span></div><div class="horizontal-line"></div><div class="content"><p>Hægt er að panta heimsendingu, gegn gjaldi, í þeim póstnúmerum þar sem Pósturinn er með heimaksturskerfi.</p><div class="row"><div class="userinput get"><label>Heimilisfang</label><input type="text" id="pwebcheckout-address" class="address ui-corner-all"><select id="pwebcheckout-postcode" class="ui-corner-all postcode"><option selected disabled style="display:none;">Veldu Póstnúmer...</option></select></div></div></div><div class="footer"><button id="pwebcheckout-sendHomeBtn" tabindex="1" title="Velja1" autofocus></button></div>',
						smallpackageHtml = '',
						noMethodsHtml = '<div class="title">No methods allowed</div>';

				// Fetch the html(s) we are going to use
				var htmls = [];
				if (availableServices.length > 0) {

					if ($.inArray('home', availableServices) > -1)
						htmls.push(homeHtml);

					if ($.inArray('posthouse', availableServices) > -1)
						htmls.push(posthouseHtml);

					if ($.inArray('postbox', availableServices) > -1)
						htmls.push(postboxHtml);
					
					// ignoring smallpackages for now
					/*if ($.inArray('smallpackage', availableServices))
						htmls.push(smallpackage);*/
					html = createChooseServiceHtml(htmls);
				}
				else {
					html = noMethodsHtml;
				}

				// Load our html and display it
				loadHtml(html, 3);
				$('.ui-dialog-content').find('.choose-service').toggle('fade');

				// Load available delivery methods
				if (availableServices == undefined || $.inArray('home', availableServices) > -1) {
					// getHomePostcodes() ?
					getPostcodes()
					.done(function(rPostcodes) {
						addOptions(rPostcodes, $('#pwebcheckout-postcode'));
						fillOutUserInfo(user);
					});
				}
				if (availableServices == undefined || $.inArray('posthouse', availableServices) > -1) {
					getPosthouses()
					.done(function(rPosthouses) {
						addOptions(rPosthouses, $('#pwebcheckout-posthouse'));
					});
				}
				if (availableServices == undefined || $.inArray('postbox', availableServices) > -1) {
					getPostboxes()
					.done(function(rPostboxes) {
						addOptions(rPostboxes, $('#pwebcheckout-postbox'));
					});
				}
				/*if (availableServices == undefined || $.inArray('smallpackage', availableServices) {
					getSmallPackages()
					.done(function(rPosthouses) {
						
					});
				}*/

				$('#pwebcheckout-sendHomeBtn').click(function() {
					chooseService('home', 'Heim', $('#pwebcheckout-address').val() + ', ' + $('#pwebcheckout-postcode option:selected').text(), $('#pwebcheckout-postcode option:selected').val());
				});
				$('#pwebcheckout-sendPostboxBtn').click(function() {
					chooseService('postbox', 'Póstbox', $('#pwebcheckout-postbox option:selected').text(), $('#pwebcheckout-postbox option:selected').val());
				});
				$('#pwebcheckout-sendPosthouseBtn').click(function() {
					chooseService('posthouse', 'Pósthús', $('#pwebcheckout-posthouse option:selected').text(), $('#pwebcheckout-posthouse option:selected').val());
				});
			});
		};

		chooseService = function(serviceName, displayName, location, locationId) {
			chosenService = {
				name: serviceName,
				displayName: displayName,
				location: location,
				locationId: locationId
			};
			$('#pwebcheckout-area').dialog('close');
		};

		createChooseServiceHtml = function(htmls) {
			var html = '',
					chooseServiceDiv = '<div class="choose-service">',
					containerDiv = {
						left: '<div class="container left">',
						center: '<div class="container center">',
						right: '<div class="container right">',
						empty: '<div class="container empty">'
					},
					divEnd = '</div>';

			console.info('-----');
			console.info(htmls);
			console.info('-----');

			switch(htmls.length) {
				case 0: 	console.info('no services available');
									break;

				case 1: 	html = 	chooseServiceDiv + 
														containerDiv.empty + divEnd + 
														containerDiv.center + htmls[0] + divEnd + 
														containerDiv.empty + divEnd + 
													divEnd;
									break;

				case 2: 	html = 	chooseServiceDiv + 
														containerDiv.left + htmls[0] + divEnd + 
														container.empty + divEnd + 
														containerDiv.right + htmls[1] + divEnd + 
												 divEnd;
									break;

				case 3: 	html = 	chooseServiceDiv + 
														containerDiv.left + htmls[0] + divEnd + 
														containerDiv.center + htmls[1] + divEnd + 
														containerDiv.right + htmls[2] + divEnd + 
												 divEnd;
									break;

				case 4: 	console.info('Not implemented');
									break;

				default: 	console.info('htmls.length not 0-4')
									break;
			}

			return html;
		};

		// Renders loading text/gif. Variable scale.
		// element structures: 
		// .row > .userinput || .loading
		// .webcheckout > .ui-dialog-content > .userinfo || .choose-service || .loading
		setLoading = function(start, displayText, scale, element, classes, simpleOutput) {
			var relativeUrl = '../images/',
					baseUrl = 'pwebcheckout-plugin/images/',
					image = scale == 'full'? 'ajax-loader.gif': 'ajax-loader-small.gif',
					imageClass = scale == 'full'? 'class="centered" ': '',
					displaySpan = displayText == undefined? '' : '<span>' + displayText + '</span>',
					workingElement = element.parent().find('.ui-dialog-content').length > 0 || 
													 classes.indexOf('nin') > -1 ? 
													 element.parent() : element.parent().parent();
			console.info(image);
			console.info(displaySpan);
			console.info(workingElement);
			
			if (start) {
				console.info('start loading...');
				workingElement.append('<div class="loading ' + classes + '" style="display:none;"><img ' + 
					imageClass + 'src="' + relativeUrl + image + '" onerror="this.onerror=null;this.src=\'' + 
					baseUrl + image  + '\';"></img>' + displaySpan + '</div>');
				if(simpleOutput) {
					workingElement.find('img').remove();
				}
				workingElement.find('.loading').toggle('fade');
				loading = true;
			}
			else {
				console.info('stop loading!');
				if (displayText != undefined) {
					var loadingDiv = workingElement.find('.loading');
					if (!simpleOutput)
						loadingDiv.find('img').remove();
					loadingDiv.find('span').text(displayText);
					loadingDiv.toggle('fade', 3000);
					setTimeout(function() {
						loadingDiv.remove();
					}, 3000);
				}
				else {
					workingElement.find('.loading').remove();
				}
				loading = false;
			}
		};

		// 'Shortcuts' for: setLoading(start, displayText, scale, elementId, classes)
		setFullScaleLoading = function(start, displayText) {
			// Hide main view
			$('.ui-dialog-content').find('div').toggle('fade');
			// Display loading view
			setLoading(start, displayText, 'full', $('.ui-dialog-content'), 'centered');
		};
		setNinLoading = function(start) {
			var displayText = start ? 'Sæki upplýsingar...': 'Upplýsingar sóttar!';
			setLoading(start, displayText, 'input', $('#pwebcheckout-nin'), 'nin');
		};
		setPostcodeLoading = function(start) {
			if ($('#pwebcheckout-sendHomeBtn') != undefined) {
				$('#pwebcheckout-sendHomeBtn').button({label:'Áfram'});
				$('#pwebcheckout-sendHomeBtn').prop('disabled',start);
			}
			if (!start)
				$('#pwebcheckout-postcode').parent().toggle('fade');
			setLoading(start, undefined, 'select', $('#pwebcheckout-postcode'), 'postcode');
		};
		setPostboxLoading = function(start) {
			if ($('#pwebcheckout-sendPostboxBtn') != undefined) {
				$('#pwebcheckout-sendPostboxBtn').button({label:'Áfram'});
				$('#pwebcheckout-sendPostboxBtn').prop('disabled',start);					
			}
			if (!start)
				$('#pwebcheckout-postbox').parent().toggle('fade');
			setLoading(start, undefined, 'select', $('#pwebcheckout-postbox'), 'postbox');
		};
		setPosthouseLoading = function(start) {
			if ($('#pwebcheckout-sendPosthouseBtn') != undefined) {
				$('#pwebcheckout-sendPosthouseBtn').button({label:'Áfram'});
				$('#pwebcheckout-sendPosthouseBtn').prop('disabled',start);
			}
			if (!start)
				$('#pwebcheckout-posthouse').parent().toggle('fade');
			setLoading(start, undefined, 'select', $('#pwebcheckout-posthouse'), 'posthouse');
		};
		setLoginLoading = function(start, step, errorText) {
			var element = $('.output'),
					displayText;

			if (errorText == undefined || errorText.length < 1)
				$('.userinput').find('button').prop('disabled',start);

			if (step == 1)
				displayText = 'Sendi SMS kóða...';
			else
				displayText = 'Staðfesti SMS kóða...';

			if (errorText != undefined && errorText.length > 0)
				displayText = errorText;
			else if (!start)
				displayText = undefined;
				

			if (step == 0)
				setLoading(start, displayText, 'input', element, 'login', true);
			else
				setLoading(start, displayText, 'input', element, 'login');
		};

		requestLogin = function(phoneNumber) {
			var dfd = $.Deferred();
			setTimeout(function() {
				var response = 'success!';
				dfd.resolve(response);
			}, 1500);
			return dfd.promise();
		};
		confirmLogin = function(code) {
			var dfd = $.Deferred();
			setTimeout(function() {
				var rUser = {
					nin: '9876543210',
					name: 'Pétur Pétursson',
					deliverTo: '',
					address: 'Pétursgata 99',
					postcode: '110',
					mobilePhoneNumber: '9876543'
				};
				if (code == '1234') {
					dfd.resolve(rUser);
				}
				else {
					dfd.reject('Villa: Rangur kóði!');
				}
				
			}, 1500);
			return dfd.promise();
		};
		getUser = function(nin) {
			var dfd = $.Deferred();
			setNinLoading(true);
			setTimeout(function() {
				var response = {
					name: 'Guðmundur Guðmundsson',
					address: 'Flúðasel 99',
					postcode: '109'
				};
				setNinLoading(false);
				dfd.resolve(response);

			}, 1000);
			return dfd.promise();
		};
		getPostcodes = function() {
			setPostcodeLoading(true);
			var dfd = $.Deferred();
			setTimeout(function() {
				var response = [
					{value: '101', full: '101 Reykjavík'},
					{value: '103', full: '103 Reykjavík'},
					{value: '104', full: '104 Reykjavík'},
					{value: '105', full: '105 Reykjavík'},
					{value: '107', full: '107 Reykjavík'},
					{value: '108', full: '108 Reykjavík'},
					{value: '109', full: '109 Reykjavík'},
					{value: '110', full: '110 Reykjavík'}
				];
				setPostcodeLoading(false);
				dfd.resolve(response);
			}, 2000);
			return dfd.promise();
		};
		getPostboxes = function() {
			setPostboxLoading(true);
			var dfd = $.Deferred();
			setTimeout(function() {
				var response = [
					{value: '1', full: 'Víðir Sólvallargötu'},
					{value: '2', full: 'Barónstíg'},
					{value: '3', full: 'Mjódd'},
					{value: '4', full: 'Húsgagnahöll'},
					{value: '5', full: 'Smáralind'},
					{value: '6', full: 'Olís Garðabæ'},
					{value: '7', full: 'AO Kaplakrika'}
				];
				setPostboxLoading(false);
				dfd.resolve(response);
			}, 3000);
			return dfd.promise();
		};
		getPosthouses = function() {
			setPosthouseLoading(true);
			var dfd = $.Deferred();
			setTimeout(function() {
				var response = [
					{value: '1', full: 'Pósthússtræti 5, 101'},
					{value: '2', full: 'Síðumúla 3-5, 108'},
					{value: '3', full: 'Þönglabakka 4, 109'},
					{value: '4', full: 'Höfðabakka 9, 110'},
					{value: '5', full: 'Stórhöfða 32, 110'},
					{value: '6', full: 'Austurvegi 4a, 860'},
					{value: '7', full: 'Póstbíll, 870'}
				];
				setPosthouseLoading(false);
				dfd.resolve(response);
			}, 1000);
			return dfd.promise();
		};

		// Gets all available delivery methods for selected item & postcode
		getDeliveryMethods = function() {
			setFullScaleLoading(true, 'Sæki lista yfir mögulega sendingarmáta...');
			var dfd = $.Deferred();
			setTimeout(function() {
				var response = ['posthouse', 'postbox', 'home', 'smallpackage'];
				if (parseInt(user.postcode) > 800) {
					response = ['posthouse', 'postbox'];
				}
				setFullScaleLoading(false);
				dfd.resolve(response);
			}, 3000);
			return dfd.promise();
		};

		// Out with the old, in with the new
		loadHtml = function(html, step) {
			$('.ui-dialog-content').find('div').remove();
			$('.ui-dialog-content').append(html);			
			currentStep = step;
		};

		// Used to add <option> to <select>, with id=element
		addOptions = function(options, element) {
			console.info('appending to:');
			console.info(element);
			// Check for length < 2, as we have one (disabled) option element with instructional text
			if (!element.find('option') || element.find('option').length < 2) {
				for (var i = 0; i < options.length; i++) {
					element.append('<option value="' + options[i].value + '" >' + options[i].full + '</option>');
				}
			}
		};

		loadUserInfo = function() {
			fillOutUserInfo(user);

			// Check if we have entered a full NIN, then get userinfo
			$('#pwebcheckout-nin').keyup(function() {
				if ($('#pwebcheckout-nin').val() != lastNinEntry) {
					lastNinEntry = $('#pwebcheckout-nin').val();
					user.nin = lastNinEntry;
					if (user.nin.length == 10) {
						getUser(user.nin)
						.done(function(userResponse) {
							$.extend(user, userResponse);
							fillOutUserInfo(user);
						});
					}
				}
			});
		};

		// Fills out fields with userinfo if available
		fillOutUserInfo = function(userinfo) {

			// If we have the NIN, then simply fetch userinfo, otherwise use manual input
			if (userinfo != undefined) {
				if (userinfo.nin)
					$('#pwebcheckout-nin').val(userinfo.nin);
				if (userinfo.name)
					$('#pwebcheckout-name').val(userinfo.name);
				if (userinfo.address)
					$('#pwebcheckout-address').val(userinfo.address);
				if (userinfo.postcode)
					$('#pwebcheckout-postcode').val(userinfo.postcode);
				if (userinfo.mobilePhoneNumber)
					$('#pwebcheckout-mobile-phone-number').val(userinfo.mobilePhoneNumber)
			}
		};

		returnToStore = function() {
			if (chosenService == undefined || chosenService.length < 1) {
				chosenService = {
					name: 'quit'
				};
			}
			var information = {
				user: user,
				service: chosenService
			};
			webcheckoutResult.resolve(information);
		};

		init(storeUserInput);

		return webcheckoutResult.promise();
	};

}(jQuery));


$(function() {
	'use strict';

	// TODO: change $(document) to highest possible parent (maybe the data-ui-view for angular apps?)
	/*$(document).on('click', '.pwebcheckout-start-full-args', function() {
		console.info('go');
		$('#pwebcheckout-area').startWebcheckout();
	});

	$(document).on('click', '.pwebcheckout-start-full-args', function() {
		console.info('go');
		$('#pwebcheckout-area').startWebcheckout();
	});

	$(document).on('click', '.pwebcheckout-start-full-args', function() {
		console.info('go');
		$('#pwebcheckout-area').startWebcheckout();
	});*/

	/*$(document).ready(function() {
		// Actual trigger function
		// Need button with pwebcheckout-start-full-args class and something with pwebcheckout-area id
		$('.pwebcheckout-start-full-args').click(function(event) {
			event.preventDefault();
			console.info('go');
			$('#pwebcheckout-area').startWebcheckout();
		});
	});*/

});