'use strict';

const meta = require.main.require('./src/meta');
const controllers = require('./lib/controllers');
const routeHelpers = require.main.require('./src/routes/helpers');

const plugin = {};

plugin.init = async ({ router }) => {
	// Settings saved in the plugin settings can be retrieved via settings methods
	const { setting1, setting2 } = await meta.settings.get('6bmk');

	router.use((req, res, next) => {
		if (!req.url.startsWith('/assets/')) {
			if (!req.user) {
				if (req.url.startsWith('/api/')) {
					req.url = '/api/6bmk';
				} else {
					req.url = '/6bmk';
				}
			}	
		}
		next();
	});
	routeHelpers.setupPageRoute(router, '/6bmk', [], (req, res) => {
		res.render('6bmk', { uid: req.uid });
	});
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/6bmk', [], controllers.renderAdminPage);
};

plugin.addRoutes = async ({ router, middleware, helpers }) => {
	const middlewares = [
		middleware.ensureLoggedIn,			// use this if you want only registered users to call this route
		middleware.admin.checkPrivileges,	// use this to restrict the route to administrators
	];

	routeHelpers.setupApiRoute(router, 'get', '/6bmk/flyers/pptx/:id', middlewares, (req, res) => {
		const { id } = req.params;
		res.json({ id });
	});
};

plugin.redirect = async ({ req, res }) => {
	if (!req.user) {
		req.url = '/6bmk';
	}
	console.log(res);
};

plugin.addAdminNavigation = (header) => {
	header.plugins.push({
		route: '/plugins/6bmk',
		icon: 'fa-tint',
		name: '6bmk',
	});
	return header;
};

module.exports = plugin;
