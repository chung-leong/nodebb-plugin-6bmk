'use strict';

const url = require('url');
const meta = require.main.require('./src/meta');
const translator = require.main.require('./src/translator');
const routeHelpers = require.main.require('./src/routes/helpers');
const controllers = require('./lib/controllers');
const api = require('./lib/api');
const { useHaiku } = require('./lib/helpers');

module.exports = {
	init,
	addRoutes,
	addAdminNavigation,
	removeGuestPrivileges,
};

async function init({ router }) {
	// default settings
	const { defaultLang } = meta.config;
	await meta.settings.setOnEmpty('6bmk', {
		paper: (defaultLang === 'en-US') ? 'letter' : 'a4',
		orientation: 'portrait', 
		mode: 'simplex', 
		locale: [ 'en-US', 'en-CA', 'en-GB', 'en-AU' ].includes(defaultLang) ? defaultLang : 'en-GB', 
		instructions: await new Promise(r => translator.translate('[[6bmk:default-instructions]]', r)),
	});

	// redirect unregistered user to 6bmk entry page
	router.use(async (req, res, next) => {
		try {
			if (!req.user) {
				let allowing = false;
				const { pathname } = url.parse(req.url, true);
				const routes = n => [ n, `/api${n}` ];
				const match = n => pathname === n || pathname.startsWith(`${n}/`);
				const ignoring = [ 
					'/assets', 
					'/admin', 
					'/api/v3',
					...routes('/login'),	
					...routes('/reset') 
				];
				if (ignoring.some(match)) {
					allowing = true;
				} else if (routes('/register').some(match)) {
					if (req.session.validatedHaikuId) {
						// allow user to go to registration page after a haiku has been entered
						allowing = true;
					}
				}
				if (!allowing) {
					if (match('/api')) {
						req.url = '/api/6bmk';
					} else {
						req.url = '/6bmk';
					}	
				}	
			} else if (req.session.validatedHaikuId) {
				if (!req.session.registration) {
					// registration is done--this haiku is no longer usable
					await useHaiku(req.session.validatedHaikuId, req.user.uid);
					delete req.session.validatedHaikuId;
				}
			}
			next();
		} catch (err) {
			next(err);
		}
	});
	routeHelpers.setupPageRoute(router, '/6bmk', [], controllers.renderEntryPage);
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/6bmk', [], controllers.renderAdminPage);
}

async function addRoutes({ router, middleware }) {
	// client-side API
	routeHelpers.setupApiRoute(router, 'post', '/6bmk/validate', [], api.validateHaiku);

	// admin API
	const middlewares = [
		middleware.ensureLoggedIn,
		middleware.admin.checkPrivileges,
	];
	routeHelpers.setupApiRoute(router, 'get', '/6bmk/flyers/', middlewares, api.retrieveFlyers);
	routeHelpers.setupApiRoute(router, 'post', '/6bmk/flyers/', middlewares, api.createFlyer);
	routeHelpers.setupApiRoute(router, 'get', '/6bmk/flyers/:id', middlewares, api.retrieveFlyer);
	routeHelpers.setupApiRoute(router, 'get', '/6bmk/flyers/:id/pptx', middlewares, api.downloadFlyer);
}

function addAdminNavigation(header) {
	header.plugins.push({
		route: '/plugins/6bmk',
		icon: 'fa-tint',
		name: '6bmk',
	});
	return header;
}

async function removeGuestPrivileges({ category, data, defaultPrivileges, modPrivileges, guestPrivileges }) {
	guestPrivileges = [];
	return { category, data, defaultPrivileges, modPrivileges, guestPrivileges };
}
