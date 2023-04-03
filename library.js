'use strict';

const { nextTick } = require('process');
const url = require('url');
const meta = require.main.require('./src/meta');
const controllers = require('./lib/controllers');
const controllerHelpers = require.main.require('./src/controllers/helpers');
const routeHelpers = require.main.require('./src/routes/helpers');
const {
	createFlyer,
	getFlyerStream,
	findHaiku,
	findUsedHaiku,
} = require('./lib/helpers');

const plugin = {};

plugin.init = async ({ router }) => {
	// Settings saved in the plugin settings can be retrieved via settings methods
	//const settings = await meta.settings.get('6bmk');
	// TODO: default settings
	router.use(async (req, res, next) => {
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
	// client-side API
	routeHelpers.setupApiRoute(router, 'post', '/6bmk/validate', [], async (req, res) => {
		const { text } = req.body;
		const haiku = await findHaiku(text);
		const found = !!haiku;
		if (haiku) {
			req.session.validatedHaikuId = haiku.hid;
		}
		const used = await findUsedHaiku(text);
		controllerHelpers.formatApiResponse(200, res, { found, used });
	});

	// admin API
	const middlewares = [
		middleware.ensureLoggedIn,
		middleware.admin.checkPrivileges,
	];
	routeHelpers.setupApiRoute(router, 'post', '/6bmk/flyers/', middlewares, async (req, res) => {
		const { paper, orientation, mode, locale, instructions } = await meta.settings.get('6bmk');
		const id = await createFlyer({ paper, orientation, mode, locale, instructions });
		res.redirect(req.originalUrl + `pptx/${id}`);
	});
	routeHelpers.setupApiRoute(router, 'get', '/6bmk/flyers/pptx/:id', middlewares, async (req, res) => {
		const { id } = req.params;
		const stream = await getFlyerStream(id);
		const name = `flyer-${id}`;
		res.set({ 
			'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			'Content-Disposition': `attachment; filename="${name}.pptx"`,
		});
		stream.pipe(res);	
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
