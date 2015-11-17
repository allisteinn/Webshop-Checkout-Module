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
	$.fn.startWebcheckout = function(storeProductInput, storeUserInput, storeId) {
		var lastNinEntry = undefined,
				loading = false,
				currentStep = 0,
				user = {
					nin: '',
					name: '',
					deliverTo: '',
					addresses: [],
					phoneNumber: '',
					chosenAddress: {
						address: '',
						postalCode: '',
						displayText: ''
					}
				},
				webcheckoutResult = $.Deferred(),
				localConfig = {
					forceLogin: false,
					forcePayment: false,
					displayMode: ''
				},
				chosenService;

		init = function(newUser) {
			$.extend(true, user, newUser);
			console.info('extend:done');
			if (user.addresses && user.addresses.length > 0 && 
				(user.chosenAddress.address == undefined || user.chosenAddress.address.length < 1)) {
				user.chosenAddress.address = user.addresses[0].address;
				user.chosenAddress.postalCode = user.addresses[0].postalCode;
			}
			console.info(user);

			// Open up our modal dialog
			$('#pwebcheckout-area').dialog({
				buttons: [],

				close: function(event, ui) {
					returnToStore();
				},

				dialogClass: 'webcheckout',

				height: 600,
				width: 800,

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

			
			getStoreConfig(storeId)
			// config.forceLogin = false; config.forcePayment = false; config.displayMode = '';
			.done(function(config) {
				$.extend(true, localConfig, config);
				// Find and add our initial view if we haven't done so previously
				if (localConfig.displayMode.indexOf('skiplogin') > -1) {
					if (localConfig.displayMode.indexOf('skipuserinfo') > -1) {
						initChooseServiceView(true);
					}
					else {
						initUserInfoView();
					}
				}
				else if (localConfig.forceLogin) {
					initLoginView();
				}
				else {
					console.info(localConfig.displayMode);
					initUserInfoView(true);
				}
			})
			.fail(function(error) {
				// Use "default" settings
				initUserInfoView(true);
			});
		};

		initLoginView = function() {
			var html = '<div class="login"><p class="instructions">Þessa innskráningarleið er aðeins hægt að nota ef þú ert nú þegar skráð(ur) í Póstbox. Það er einfalt að skrá sig í Póstboxið á postur.is. Þar ertu leidd(ur) áfram, skref fyrir skref þar til þú færð þitt P-númer, velur þér Póstbox og getur farið að nýta þér þjónustuna. Þú getur skráð þig á mappan.is eða notað rafræn skilríki til þess að skrá þig í þjónustuna. Rafræn skilríki eru auðveld leið til auðkenningar og undirritunar. Þau getur þú fengið í símann þinn eða í debetkortið. Á postur.is eru einföld myndbönd sem útskýra hvernig ferlið gengur fyrir sig.</p><div class="form"><div class="userinput phone-number"><div class="row"><label>Símanúmer</label><input type="text" id="pwebcheckout-login-name" class="ui-corner-all" maxlength="7" tabindex="1" digits autofocus><br /></div><div class="row"><button id="pwebcheckout-login-nameBtn" title="Áfram" tabindex="3"></button></div></div><div class="userinput code"><div class="row"><label>SMS-kóði</label><input type="text" id="pwebcheckout-login-code" class="ui-corner-all" maxlength="4" tabindex="1" digits><br /></div><div class="row"><button id="pwebcheckout-login-codeBtn" title="Áfram" tabindex="3"></button></div></div><div class="output"></div></div></div>';
			loadHtml(html, 1);

			activateLogin(true);
		};

		initUserInfoView = function(hasLogin) {
			var html = {
				withoutLogin: '<div class="userinfo"><p class="instructions">Pakka innanlands er hægt að senda á pósthús eða heim að dyrum. Þú getur sent stóra, litla, langa, breiða eða mjóa pakka með Póstinum. Hver pakki fær viðtökunúmer þannig að hægt er að finna sendingu, hvar hún er stödd á hverjum tíma. Við mælum með því að verðmætari sendingar séu tryggðar með pósttryggingu, en lágmarkstrygging er innifalin.</p><div class="row"><div class="userinput"><label>Kennitala</label><input type="text" id="pwebcheckout-nin" class="nin ui-corner-all" maxlength="10"></div></div><div class="row"><div class="userinput"><label>Nafn</label><input type="text" id="pwebcheckout-name" class="ui-corner-all"></div></div><div class="row addresses"><div class="userinput"><label>Heimilisfangalisti</label><select id="pwebcheckout-addresses" class="ui-corner-all addresses"></select></div></div><div class="row"><div class="userinput"><label>Heimilisfang</label><input type="text" id="pwebcheckout-address" class="address ui-corner-all"><select id="pwebcheckout-postcode" class="ui-corner-all postcode"><option selected disabled style="display:none;">Veldu póstnúmer</option></select></div></div><div class="row"><div class="userinput"><label>Farsímanúmer</label><input type="text" id="pwebcheckout-mobile-phone-number" class="phone-number ui-corner-all" maxlength="7"></div></div><div class="row"><div class="userinput"><label>Netfang</label><input type="text" id="pwebcheckout-email" class="ui-corner-all"></div></div><div class="row"><div class="userinput"><label></label><button id="pwebcheckout-complete-userinfo" type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" tabindex="1" title="Halda áfram og velja sendingarmáta"><span class="ui-button-text">Áfram</span></button></div></div></div>',
				withLogin: '<div class="userinfo"><p class="instructions">Pakka innanlands er hægt að senda á pósthús eða heim að dyrum. Þú getur sent stóra, litla, langa, breiða eða mjóa pakka með Póstinum. Hver pakki fær viðtökunúmer þannig að hægt er að finna sendingu, hvar hún er stödd á hverjum tíma. Við mælum með því að verðmætari sendingar séu tryggðar með pósttryggingu, en lágmarkstrygging er innifalin.</p><div class="login left"><div class="userinput phone-number"><label>Símanúmer</label><input type="text" id="pwebcheckout-login-name" class="ui-corner-all" maxlength="7" tabindex="1" digits><br /><div class="centerbutton"><button id="pwebcheckout-login-nameBtn" title="Áfram" tabindex="3" class="right"></button></div></div><div class="userinput code"><label>SMS-kóði</label><input type="text" id="pwebcheckout-login-code" class="ui-corner-all" maxlength="4" tabindex="1" digits><br /><div class="centerbutton"><button id="pwebcheckout-login-codeBtn" title="Áfram" tabindex="3" class="right"></button></div></div></div><div class="right"><div class="row"><div class="userinput"><label>Kennitala</label><input type="text" id="pwebcheckout-nin" class="nin ui-corner-all" maxlength="10"></div></div><div class="row"><div class="userinput"><label>Nafn</label><input type="text" id="pwebcheckout-name" class="ui-corner-all"></div></div><div class="row addresses"><div class="userinput"><label>Heimilisfangalisti</label><select id="pwebcheckout-addresses" class="ui-corner-all addresses"></select></div></div><div class="row"><div class="userinput"><label>Heimilisfang</label><input type="text" id="pwebcheckout-address" class="address ui-corner-all"></div></div><div class="row"><div class="userinput"><label>Póstnúmer</label><select id="pwebcheckout-postcode" class="ui-corner-all postcode"><option selected disabled style="display:none;">Veldu póstnúmer</option></select></div></div><div class="row"><div class="userinput"><label>Netfang</label><input type="text" id="pwebcheckout-email" class="ui-corner-all"></div></div><div class="row"><div class="userinput"><label>Farsímanúmer</label><input type="text" id="pwebcheckout-mobile-phone-number" class="phone-number ui-corner-all" maxlength="7"></div></div><div class="row"><div class="userinput"><label></label><button id="pwebcheckout-complete-userinfo" type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" tabindex="1" title="Halda áfram og velja sendingarmáta"><span class="ui-button-text">Áfram</span></button></div></div></div></div>'
			};

			// Load our html and display it
			loadHtml(hasLogin? html.withLogin: html.withoutLogin, 2);
			$('.ui-dialog-content').find('.userinfo').toggle('fade');

			// Add all postcodes if we haven't done so previously
			var allPostcodes = [
				{id: '101', name: '101 Reykjavík'},
				{id: '103', name: '103 Reykjavík'},
				{id: '104', name: '104 Reykjavík'},
				{id: '105', name: '105 Reykjavík'},
				{id: '107', name: '107 Reykjavík'},
				{id: '108', name: '108 Reykjavík'},
				{id: '109', name: '109 Reykjavík'},
				{id: '110', name: '110 Reykjavík'},
				{id: '860', name: '860 Hvolsvöllur'},
				{id: '870', name: '870 Vík'}
			];
			addOptions(allPostcodes, $('#pwebcheckout-postcode'));

			// Then load all userinfo if available (and select correct postcode)
			loadUserInfo();

			$('#pwebcheckout-addresses').change(function(event) {
				selectAddress(event.target.value);
			});

			// And make sure our login form is working (if present)
			if (hasLogin)
				activateLogin(false);

			// TODO: Verify and save userinfo before proceeding to next view
			$('#pwebcheckout-complete-userinfo').click(function() {
				// Verify & save information
				user.nin = $('#pwebcheckout-nin').val();
				user.name = $('#pwebcheckout-name').val();
				user.deliverTo = $('#pwebcheckout-deliver-to').val();
				var addr = {
					address: $('#pwebcheckout-address').val(), 
					postalCode: $('#pwebcheckout-postcode option:selected').val()
				};
				user.chosenAddress.address = $('#pwebcheckout-address').val();
				user.chosenAddress.postalCode = $('#pwebcheckout-postcode option:selected').val();

				if (user.addresses == undefined)
					user.addresses = [];
				user.addresses.push(user.chosenAddress);

				user.phoneNumber = $('#pwebcheckout-mobile-phone-number').val();

				if (localConfig.displayMode.indexOf('skipdeliverymethod') > -1) {
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
					availableServices = rMethods;
				}

				var fullhtml = '<div class="choose-service"><div class="container left"><div class="title"><span>Heimsending</span></div><div class="horizontal-line"></div><div class="content"><p>Hægt er að panta heimsendingu, gegn gjaldi, í þeim póstnúmerum þar sem Pósturinn er með heimaksturskerfi.</p><div class="row"><div class="userinput get"><label>Heimilisfang</label><input type="text" id="pwebcheckout-address" class="address ui-corner-all"><select id="pwebcheckout-postcode" class="ui-corner-all postcode"><option selected disabled style="display:none;">Veldu Póstnúmer...</option></select></div></div></div><div class="footer"><button id="pwebcheckout-sendHomeBtn" tabindex="1" title="Velja1" autofocus></button></div></div><div class="container center"><div class="title"><span>Sækja á pósthús</span></div><div class="horizontal-line"></div><div class="content"><p>Pósthús eru staðsett um allt land, eða á um 60 stöðum. Finndu staðsetningu, opnunartíma og þjónustustig á hvaða pósthúsi sem er. Þú getur einnig leitað á Íslandskorti.</p><div class="row"><div class="userinput get"><select id="pwebcheckout-posthouse" class="ui-corner-all posthouse"><option selected disabled style="display:none;">Veldu Pósthús...</option></select></div></div></div><div class="footer"><button id="pwebcheckout-sendPosthouseBtn" tabindex="2" title="Velja2"></button></div></div><div class="container right"><div class="title"><span>Póstbox</span></div><div class="horizontal-line"></div><div class="content"><p>Það er einfalt að skrá sig í Póstboxið á postur.is. Þar ertu leidd(ur) áfram, skref fyrir skref þar til þú færð þitt P-númer, velur þér Póstbox og getur farið að nýta þér þjónustuna.</p><div class="row"><div class="userinput"><label></label><input type="text" class="ui-corner-all postbox" placeholder="P-Númer..."></div></div><div class="row"><div class="userinput get"><select id="pwebcheckout-postbox" class="ui-corner-all postbox"><option selected disabled style="display:none;">Veldu Póstbox...</option></select></div></div></div><div class="footer"><button id="pwebcheckout-sendPostboxBtn" tabindex="3" title="Velja3"></button></div></div></div>';

				var html = '',
						send = {
							smallPackage: '<h3 id="pwebcheckout-send-small-package">Smápakki</h3><div><div class="row"><span>Kemur inn um lúguna.</span></div><div class="row"><div class="userinput get"><label>Heimilisfang</label><input type="text" id="pwebcheckout-small-package-address" class="address ui-corner-all"><select id="pwebcheckout-small-package-postcode" class="ui-corner-all postcode"><option selected disabled style="display:none;">Veldu Póstnúmer...</option></select></div></div></div>',
							home: '<h3 id="pwebcheckout-send-home">Heimsending</h3><div><div class="row"><span>Hægt er að panta heimsendingu, gegn gjaldi, í þeim póstnúmerum þar sem Pósturinn er með heimaksturskerfi.</span></div><div class="row"><div class="userinput get"><label>Heimilisfang</label><input type="text" id="pwebcheckout-home-address" class="address ui-corner-all"><select id="pwebcheckout-home-postcode" class="ui-corner-all postcode"><option selected disabled style="display:none;">Veldu Póstnúmer...</option></select></div></div></div>',
							postbox: '<h3 id="pwebcheckout-send-postbox">Póstbox</h3><div><div class="row"><span>Það er einfalt að skrá sig í Póstboxið á postur.is. Þar ertu leidd(ur) áfram, skref fyrir skref þar til þú færð þitt P-númer, velur þér Póstbox og getur farið að nýta þér þjónustuna.</span></div><div class="row"><div class="userinput get"><label>Póstbox</label><select id="pwebcheckout-postbox" class="ui-corner-all postbox"><option selected disabled style="display:none;">Veldu Póstbox...</option></select></div></div></div>',
							posthouse: '<h3 id="pwebcheckout-send-posthouse">Sækja á pósthús</h3><div><div class="row"><span>Pósthús eru staðsett um allt land, eða á um 60 stöðum. Finndu staðsetningu, opnunartíma og þjónustustig á hvaða pósthúsi sem er. Þú getur einnig leitað á Íslandskorti.</span></div><div class="row"><div class="userinput get"><label>Pósthús</label><select id="pwebcheckout-posthouse" class="ui-corner-all posthouse"><option selected disabled style="display:none;">Veldu Pósthús...</option></select></div></div></div>',
							pickup: '<h3 id="pwebcheckout-send-pickup">Sækja í verslun</h3><div><div class="row"><span>Þá getur þú sótt vöruna þegar verslunin er opin.</span></div></div>'
						},
						noMethodsHtml = '<div class="title">No methods allowed</div>';

				// Fetch the html(s) we are going to use
				var htmls = [];
				if (availableServices.length > 0) {

					if ($.inArray('smallpackage', availableServices) > -1)
						htmls.push(send.smallPackage);

					if ($.inArray('home', availableServices) > -1)
						htmls.push(send.home);

					if ($.inArray('postbox', availableServices) > -1)
						htmls.push(send.postbox);

					if ($.inArray('posthouse', availableServices) > -1)
						htmls.push(send.posthouse);

					if ($.inArray('pickup', availableServices) > -1)
						htmls.push(send.pickup)
					
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

				$('#pwebcheckout-choose-service').accordion({
					active: 0,
					create: function(event, ui) {

					},
					/*clearStyle: true,*/
					heightStyle: 'fill'
				});

				$('.ui-dialog-content .choose-service').toggle('fade');
				// We need to redraw our accordion to get correct height as it was drawn into a "display:none;" container
				$('#pwebcheckout-choose-service').accordion('refresh');

				$('#pwebcheckout-area').dialog('option', 'buttons',
					[
						{
							text: 'Staðfesta val',
							click: function() {
								var active = $('#pwebcheckout-choose-service').accordion('option', 'active');
								var id = $('#pwebcheckout-choose-service h3').eq(active).get(0).id.toLowerCase();

								if (id.indexOf('smallpackage') > -1)
									chooseService('smallpackage', 'Smápakki', $('#pwebcheckout-address').val() + ', ' + $('pwebcheckout-postcode option:selected').text(), $('#pwebcheckout-postcode option:selected').val())
								else if (id.indexOf('home') > -1)
									chooseService('home', 'Heim', $('#pwebcheckout-address').val() + ', ' + $('#pwebcheckout-postcode option:selected').text(), $('#pwebcheckout-postcode option:selected').val());
								else if (id.indexOf('postbox') > -1)
									chooseService('postbox', 'Póstbox', $('#pwebcheckout-postbox option:selected').text(), $('#pwebcheckout-postbox option:selected').val());
								else if (id.indexOf('posthouse') > -1)
									chooseService('posthouse', 'Pósthús', $('#pwebcheckout-posthouse option:selected').text(), $('#pwebcheckout-posthouse option:selected').val());
								else if (id.indexOf('pickup') > -1)
									chooseService('pickup', 'Sækja í verslun');
								else
									chooseService('none', 'Ekkert valið');
							}
						}
					]
				);

				// Load details for each available delivery method
				if (availableServices == undefined || $.inArray('home', availableServices) > -1) {
					getHomePostcodes()
					.done(function(rPostcodes) {
						addOptions(rPostcodes, $('#pwebcheckout-home-postcode'));
						fillOutUserInfo(user);
					});
				}
				if (availableServices == undefined || $.inArray('smallpackage', availableServices) > -1) {
					getSmallPackagesPostcodes()
					.done(function(rPostcodes) {
						addOptions(rPostcodes, $('#pwebcheckout-small-package-postcode'));
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
						if (user && user.postbox && user.postbox.id) {
							$('#pwebcheckout-postbox').val(user.postbox.id);
						}
					});
				}

			});
		};

		// nopayment, mandatorypayment, optionalpayment, (paynow,) paylater
		initPaymentMethodView = function() {
			var html = '',
					htmls = [],
					payLater = '<h3>Borga við afhendingu</h3><div><p>Lorem ipsum dolor</p><button id="pwebcheckout-paylater" type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" tabindex="1" title="Halda áfram og velja sendingarmáta"><span class="ui-button-text">Áfram</span></button></div>',
					creditcard = '<h3>Greiðslukort</h3><div><p>Lorem ipsum dolor</p><div id="pwebcheckout-choose-creditcard" class="row"><select class="choose-creditcard"><option>Velja greiðslukort</option></select></div><p>Skrá nýtt greiðslukort</p><div class="row"><label>Korthafi</label><input type="text"></div><div class="row"><label>Kortanúmer</label><input type="text" digits></div><div class="row"><label>Gildir til</label><select class="expdate"><option>MM</option></select><select class="expdate"><option>ÁÁ</option></select></div><div class="row"><label>CVV</label><input type="text" digits></div><button id="pwebcheckout-newcreditcard" type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" tabindex="1" title="Bæta korti við"><span class="ui-button-text">Bæta korti við</span></button><button id="pwebcheckout-paycreditcard" type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" tabindex="1" title="Greiða"><span class="ui-button-text">Greiða</span></button></div>'
			if (localConfig.displayMode.toLowerCase().indexOf('mandatorypayment') > -1) {

			}
			else {
				// then optional, add option to pay via store (triggers return to store)
			}

			// then add pay upon delivery option
			if (localConfig.displayMode.indexOf('paylater'))
				htmls.push(payLater);
			if (localConfig.displayMode.indexOf('creditcard'))
				htmls.push(creditcard);

			html = createPaymentMethodsHtml(htmls);

			loadHtml(html, 4);

			$('#pwebcheckout-paymentmethods').accordion({
				active: 0,
				create: function(event, ui) {

				},
				heightStyle: 'fill'
			});

			$('.ui-dialog-content .payment').toggle('fade');
			// We need to redraw our accordion to get correct height as it was drawn into a "display:none;" container
			$('#pwebcheckout-paymentmethods').accordion('refresh');
		};

		activateLogin = function(isLoginView, outputMessage) {
			var loginState = 0;
			$('.userinput.phone-number').toggle('fade');

			if ($('#pwebcheckout-login-skipBtn').length)
				$('#pwebcheckout-login-skipBtn').button({label: 'Sleppa skrefi'});

			$('#pwebcheckout-login-nameBtn').button({label: 'Áfram'});

			if (outputMessage != undefined && outputMessage.length > 0) {
				setLoginLoading(true, 0, false, outputMessage);
				setTimeout(function() {
					setLoginLoading(false, 0, false, outputMessage);
				}, 1000);
			}

			/*$('#pwebcheckout-login-skipBtn').click(function() {
				initUserInfoView();
			});*/

			// Allow triggering next step when 'enter' is pressed
			$('.userinput.phone-number').keyup(function(e) {
				if (e.which == 13)
					$('#pwebcheckout-login-nameBtn').trigger('click');
			});
			// Or when we click 'next'
			$('#pwebcheckout-login-nameBtn').click(function() {
				var name = $('#pwebcheckout-login-name').val();
				
				if (validate.isNumber(name, 7)) {
					setLoginLoading(true, 1, true);
					requestLogin(name)
					.done(function() {
						setLoginLoading(false, 1, true);
						$('.userinput.phone-number').remove();
						$('.userinput.code').toggle('fade');
						$('#pwebcheckout-login-skipBtn').button({label: 'Sleppa skrefi'});
						$('#pwebcheckout-login-codeBtn').button({label: 'Áfram'});

						$('#pwebcheckout-login-code').focus();

						$('#pwebcheckout-login-skipBtn').click(function() {
							initUserInfoView();
						});

						$('.userinput.code').keyup(function(e) {
							if (e.which == 13)
								$('#pwebcheckout-login-codeBtn').trigger('click');
						});
						$('#pwebcheckout-login-codeBtn').click(function() {
							var code = $('#pwebcheckout-login-code').val();
							console.info(code);
							
							if (validate.isNumber(code, 4)) {
								setLoginLoading(true, 2, true);
								confirmLogin(name, code)
								.done(function(rToken) {
									console.info('confirmLogin:done');
									getUser(rToken.token)
									.done(function(rUser) {
										console.info('getUser:done');
										$('.login').remove();
										$.extend(true, user, rUser);
										console.info(user);
										console.info(rUser);
										if (localConfig.displayMode.indexOf('skipuserinfo') > -1)
											initChooseServiceView();
										else if (!isLoginView) {
											setLoginLoading(false, 1, true);
											loadUserInfo();
										}
										else
											initUserInfoView(false);
									})
									.fail(function(error) {
										console.info(error);
										activateLogin(isLoginView, getErrorMessage(error));
									});
									
								})
								.fail(function(error) {
									activateLogin(isLoginView, getErrorMessage(error));
								});
							}
							else {
								setLoginLoading(true, 0, false, 'Villa! Ógildur kóði');
								setTimeout(function() {
									setLoginLoading(false, 0, false, 'Villa! Ógildur kóði');
								}, 1000);
							}
							
						});
					})
					.fail(function(error) {
						setLoginLoading(false, 2, true, getErrorMessage(error));
					});
				}
				else {
					setLoginLoading(true, 0, false, 'Villa! Ógilt símanúmer');
					setTimeout(function() {
						setLoginLoading(false, 0, false, 'Villa! Ógilt símanúmer');
					}, 1000);
				}
			});
		};

		chooseService = function(serviceName, displayName, location, locationId) {
			chosenService = {
				name: serviceName,
				displayName: displayName,
				location: location,
				locationId: locationId
			};
			if (localConfig.displayMode.indexOf('nopayment') > -1)
				$('#pwebcheckout-area').dialog('close');
			else
				initPaymentMethodView();
		};

		createChooseServiceHtml = function(htmls) {
			var html = '<div class="choose-service"><h2>Veldu sendingarmáta</h2><div id="pwebcheckout-choose-service">',
					end = '</div></div>';

			for (var i = 0; i < htmls.length; i++) {
				html += htmls[i];
			}
			html += end;

			return html;
		};

		createPaymentMethodsHtml = function(htmls) {
			var html = '<div class="payment"><p class="instructions">Lorem ipsum dolor greiðslumöguleikar</p><div id="pwebcheckout-paymentmethods">',
					end = '</div></div>';

			for (var i = 0; i < htmls.length; i++) {
				html += htmls[i];
			}

			html += end;
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
					workingElement = element;

			//is default
			//if (classes.indexOf('fullscale') > -1)
			//	workingElement = element;

			if (classes.indexOf('nin') > -1) 
				workingElement = element.parent();
			else if (classes.indexOf('postcode') > -1)
				workingElement = element.parent().parent();
			/*else 
				workingElement = element.parent().parent();*/
			
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
			setLoading(start, displayText, 'full', $('.ui-dialog-content'), 'fullscale');
		};
		setNinLoading = function(start) {
			var displayText = start ? 'Sæki upplýsingar...': 'Upplýsingar sóttar!';
			setLoading(start, displayText, 'input', $('#pwebcheckout-nin'), 'nin');
		};
		setPostcodeLoading = function(start, element) {
			if (!start)
				element.parent().toggle('fade');
			setLoading(start, undefined, 'select', element, 'postcode');
		};
		setPostboxLoading = function(start) {
			if (!start)
				$('#pwebcheckout-postbox').parent().toggle('fade');
			setLoading(start, undefined, 'select', $('#pwebcheckout-postbox'), 'postbox');
		};
		setPosthouseLoading = function(start) {
			if (!start)
				$('#pwebcheckout-posthouse').parent().toggle('fade');
			setLoading(start, undefined, 'select', $('#pwebcheckout-posthouse'), 'posthouse');
		};
		setLoginLoading = function(start, step, includeButtons, errorText) {
			var element = $('.output'),
					displayText;

			if (includeButtons)
				$('.userinput').find('button').prop('disabled', start);

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

		validate = {
			notEmpty: function(input) {
				return input != undefined && input.length > 0;
			},
			exactLength: function(input, length) {
				return input.length == length;
			},
			isNumber: function(input, length) {
				return validate.notEmpty(input) && !isNaN(parseInt(input)) && 
					(length == undefined? true: validate.exactLength(input, length));
			}
		};

		// 8676137 or 8251077
		requestLogin = function(phoneNumber) {
			var dfd = $.Deferred(),
					postData = {phoneNumber: phoneNumber};
			setTimeout(function() {

					$.ajax({
						type: 'POST',
						url: 'http://T2097:8945/webcheckout/authentication/pin',
						contentType: 'application/json; charset=UTF-8',
						data: JSON.stringify(postData)
					})
					.done(function(data) {
						console.info(data);
						dfd.resolve(data);
					})
					.error(function(data) {
						console.info(data);
						dfd.reject(data);
					});

			}, 5000);
			return dfd.promise();
		};
		confirmLogin = function(phoneNumber, code) {
			var dfd = $.Deferred(),
					postData = {phoneNumber: phoneNumber, pin: code};

			setTimeout(function() {

				$.ajax({
					type: 'POST',
					url: 'http://T2097:8945/webcheckout/authentication/token',
					contentType: 'application/json; charset=UTF-8',
					data: JSON.stringify(postData)
				})
				.done(function(data) {
					console.info(data);
					// Make sure the token is present
					if (data) {
						dfd.resolve(data);
					}
					else
						dfd.reject(data);
				})
				.error(function(data) {
					console.info(data);
					dfd.reject(data);
				});

			}, 1000);
			return dfd.promise();
		};

		getErrorMessage = function(error, defaultMessage) {
			var message;
			if (error && error.responseJSON) {
				if (error.responseJSON.message)
					message = error.responseJSON.message;
				else if (error.responseJSON.error)
					message = error.responseJSON.error;
				else if (error.responseJSON.exception)
					message = error.responseJSON.exception;
				else if (defaultMessage && defaultMessage.length > 0)
					message = defaultMessage;
				else
					message = 'Óvænt villa, reyndu aftur'
			}
			return message;
		};
		getStoreConfig = function(storeId) {
			setFullScaleLoading(true, 'Sæki stillingar...');
			var dfd = $.Deferred();
			setTimeout(function() {
				var data = {
					forceLogin: false,
					forcePayment: false,
					displayMode: ''
				};
				if (storeId != undefined) {
					if (storeId.toLowerCase().indexOf('forcelogin') > -1)
						data.forceLogin = true;
					if (storeId.toLowerCase().indexOf('forcepayment') > -1)
						data.forcePayment = true;
					if (storeId.toLowerCase().indexOf('skiplogin') > -1)
						data.displayMode = 'skiplogin';
					if (storeId.toLowerCase().indexOf('skipuserinfo') > -1)
						data.displayMode += 'skipuserinfo';
				}
				setFullScaleLoading(false);
				dfd.resolve(data);
			}, 1500);
			return dfd.promise();
		};
		getUser = function(token) {
			var dfd = $.Deferred();
			$.ajax({
				type: 'GET',
				url: 'http://T2097:8945/webcheckout/users',
				headers: {'Authorization': 'bearer ' + token}
			})
			.done(function(data) {
				if (data.addresses && data.addresses.length > 0) {
					for (var i = 0; i < data.addresses.length; i++) {
						data.addresses[i].id = data.addresses[i].address + ' ' + data.addresses[i].postalCode;
						data.addresses[i].name = data.addresses[i].id;
					}
				}
				// if no default address, then set it
				if (data.chosenAddress == undefined || data.chosenAddress.length < 1) {
					data.chosenAddress = {
						address: data.addresses[0].address,
						postalCode: data.addresses[0].postalCode,
						name: data.addresses[0].displayText
					};
				}
				console.info(data);
				if (data)
					dfd.resolve(data);
				else
					dfd.reject(data);
			})
			.error(function(data) {
				console.info(data);
				dfd.reject(data);
			});
			return dfd.promise();
		};
		getUserByNin = function(nin) {
			var dfd = $.Deferred();
			setNinLoading(true);
			setTimeout(function() {
				var data = {
					name: 'Guðmundur Guðmundsson',
					addresses: [
						{
							address: 'Flúðasel 99',
							postalCode: '109'
						}
					]
				};
				addOptions(data.addresses, $('#pwebcheckout-addresses'));
				
				
				if (data.addresses && data.addresses.length > 0) { 
					if (data.chosenAddress == undefined || data.chosenAddress.length < 1) {
						data.chosenAddress = {
							address: data.addresses[0].address,
							postalCode: data.addresses[0].postalCode,
						};
						selectAddress(data.addresses[0]);
					}
					else {
						selectAddress(data.chosenAddress);
					}
				}
				// if no default address, then set it
				else {

				}
				setNinLoading(false);
				dfd.resolve(data);

			}, 1000);
			return dfd.promise();
		};
		getPostcodes = function(element) {
			if (element)
				setPostcodeLoading(true, element);
			else
				setPostcodeLoading(true, $('#pwebcheckout-postcode'));

			var dfd = $.Deferred();
			setTimeout(function() {
				var response = [
					{id: '101', name: '101 Reykjavík'},
					{id: '103', name: '103 Reykjavík'},
					{id: '104', name: '104 Reykjavík'},
					{id: '105', name: '105 Reykjavík'},
					{id: '107', name: '107 Reykjavík'},
					{id: '108', name: '108 Reykjavík'},
					{id: '109', name: '109 Reykjavík'},
					{id: '110', name: '110 Reykjavík'}
				];

				if (element)
					setPostcodeLoading(false, element);
				else
					setPostcodeLoading(false, $('#pwebcheckout-postcode'));

				dfd.resolve(response);
			}, 2000);
			return dfd.promise();
		};
		getHomePostcodes = function() {
			var dfd = $.Deferred();
			setTimeout(function() {
				getPostcodes($('#pwebcheckout-home-postcode'))
				.done(function(response) {
					dfd.resolve(response);
				})
				.fail(function(error) {
					dfd.reject(error);
				});
			}, 500);
			return dfd.promise();
		};
		getSmallPackagesPostcodes = function() {
			var dfd = $.Deferred();
			setTimeout(function() {
				getPostcodes($('#pwebcheckout-small-package-postcode'))
				.done(function(response) {
					dfd.resolve(response);
				})
				.fail(function(error) {
					dfd.reject(error);
				});
			}, 500);
			return dfd.promise();
		};
		getPostboxes = function() {
			setPostboxLoading(true);
			var dfd = $.Deferred();
			setTimeout(function() {
				var response = [
					{id: 'IS101A', name: 'Víðir Sólvallagötu', address: 'Sólvallagötu', postalCode: '101'},
					{id: 'IS101B', name: '10-11 Barónstíg', address: 'Barónstíg', postalCode: '101'},
					{id: 'IS104A', name: 'Olís Álfheimum', address: 'Álfheimum', postalCode: '104'},
					{id: 'IS109A', name: 'Mjódd', address: 'Mjódd', postalCode: '109'},
					{id: 'IS110A', name: 'Húsgagnahöllinni', address: 'Höfðabakka', postalCode: '110'},
					{id: 'IS201A', name: 'Smáralind', address: 'Smáralind', postalCode: '201'},
					{id: 'IS210A', name: 'Olís', address: 'Olís', postalCode: '210'},
					{id: 'IS220A', name: 'AO Kaplakrika', address: 'Kaplakrika', postalCode: '220'}
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
					{id: '1', name: 'Pósthússtræti 5, 101'},
					{id: '2', name: 'Síðumúla 3-5, 108'},
					{id: '3', name: 'Þönglabakka 4, 109'},
					{id: '4', name: 'Höfðabakka 9, 110'},
					{id: '5', name: 'Stórhöfða 32, 110'},
					{id: '6', name: 'Austurvegi 4a, 860'},
					{id: '7', name: 'Póstbíll, 870'}
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
				var response = ['posthouse', 'postbox', 'home', 'smallpackage', 'pickup'];
				if (parseInt(user.chosenAddress.postalCode) > 800) {
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

		// Used to add <option> to element
		addOptions = function(options, element) {
			console.info('appending to:');
			console.info(element);
			// Check for length < 2, as we have one (disabled) option element with instructional text
			if (!element.find('option') || element.find('option').length < 2) {
				for (var i = 0; i < options.length; i++) {
					element.append($('<option>', {
						value: options[i].id,
						text: options[i].name
					}));
				}
			}
		};

		selectAddress = function(address) {
			if (address) {
				$('#pwebcheckout-addresses').val(address);
				$('#pwebcheckout-address').val(address.address);
				$('#pwebcheckout-postcode').val(address.postalCode);
			}
			else {
				$('#pwebcheckout-addresses').val(user.addresses[0]);
				$('#pwebcheckout-address').val(user.addresses[0].address);
				$('#pwebcheckout-postcode').val(user.addresses[0].postalCode);
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
						getUserByNin(user.nin)
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
				if (userinfo.addresses && userinfo.addresses.length > 0) {
					$('.row.addresses').show();
					addOptions(userinfo.addresses, $('#pwebcheckout-addresses'));
					$('#pwebcheckout-addresses').val(userinfo.chosenAddress.displayText);
				}
				else {
					$('.row.addresses').hide();
				}

				if (userinfo.chosenAddress && userinfo.chosenAddress.address) {
					if ($('#pwebcheckout-address').length) {
						$('#pwebcheckout-address').val(userinfo.chosenAddress.address);
						$('#pwebcheckout-postcode').val(userinfo.chosenAddress.postalCode);
					}
					if ($('#pwebcheckout-home-address').length) {
						$('#pwebcheckout-home-address').val(userinfo.chosenAddress.address);
						$('#pwebcheckout-home-postcode').val(userinfo.chosenAddress.postalCode);
					}
					if ($('#pwebcheckout-small-package-address').length) {
						$('#pwebcheckout-small-package-address').val(userinfo.chosenAddress.address);
						$('#pwebcheckout-small-package-postcode').val(userinfo.chosenAddress.postalCode);
					}
				}					
				if (userinfo.phoneNumber)
					$('#pwebcheckout-mobile-phone-number').val(userinfo.phoneNumber)
			}
		};

		returnToStore = function() {
			console.info('returning to store');
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