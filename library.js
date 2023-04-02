'use strict';

const { nextTick } = require('process');
const url = require('url');
const meta = require.main.require('./src/meta');
const controllers = require('./lib/controllers');
const controllerHelpers = require.main.require('./src/controllers/helpers');
const routeHelpers = require.main.require('./src/routes/helpers');
const {
	createFlyer,
	getFlyers,
	getFlyerStream,
	findHaiku,
} = require('./lib/helpers');

const plugin = {};

plugin.init = async ({ router }) => {
	// Settings saved in the plugin settings can be retrieved via settings methods
	const { setting1, setting2 } = await meta.settings.get('6bmk');
	router.use((req, res, next) => {
		try {
			const parsedUrl = url.parse(req.url, true);
			const { pathname } = parsedUrl;
			const routes = n => [ n, `/api${n}` ];
			const match = n => pathname === n || pathname.startsWith(`${n}/`);
			const ignoring = [ 
				'/assets', 
				'/admin', 
				'/api/v3',
				...routes('/login'),
				...routes('/reset') 
			];
			if (!ignoring.some(match)) {
				let allowing = false;
				if (req.user) {
					allowing = true;
				} else {
					if (routes('/register').some(match)) {
						const { validatedHaikuId } = req.session;
						if (validatedHaikuId) {
							allowing = true;
						}
					}
				}
				if (!allowing) {
					if (match('/api')) {
						req.url = '/api/6bmk';
					} else {
						req.url = '/6bmk';
					}	
					console.log(`Redirecting to ${req.url}`);
				}
			}	
			next();
		} catch (err) {
			next(err);
		}
	});
	routeHelpers.setupPageRoute(router, '/6bmk', [], (req, res) => {
		res.render('6bmk', { uid: req.uid });
	});
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/6bmk', [], controllers.renderAdminPage);
};

plugin.addRoutes = async ({ router, middleware }) => {
	routeHelpers.setupApiRoute(router, 'post', '/6bmk/validate', [], (req, res, next) => {
		(async () => {
			const { text } = req.body;
			const haiku = await findHaiku(text);
			const found = !!haiku;
			if (haiku) {
				req.session.validatedHaikuId = haiku.hid;
			}
			const used = false;
			controllerHelpers.formatApiResponse(200, res, { found, used });
		})();
	});

	const middlewares = [
		middleware.ensureLoggedIn,
		middleware.admin.checkPrivileges,
	];
	routeHelpers.setupApiRoute(router, 'get', '/6bmk/flyers/pptx/:id', middlewares, (req, res) => {
		(async () => {
			const { id } = req.params;
			const stream = await getFlyerStream(id);
			res.set({ 
				'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				'Content-Disposition': `attachment; filename="${stream.name}.pptx"`,
			});
			stream.pipe(res);	
		})();
	});
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
