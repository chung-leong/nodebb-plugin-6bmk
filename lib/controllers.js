'use strict';

const meta = require.main.require('./src/meta');
const { getFlyers } = require('./helpers');

const Controllers = module.exports;

Controllers.renderAdminPage = async function (req, res) {
	const flyers = await getFlyers();	
	res.render('admin/plugins/6bmk', {
		flyers: flyers.reverse().map(({ fid, date, haiku }) => {
			let used = 0, free = 0, total = haiku.length;
			for (const { uid } of haiku) {
				if (uid > 0) {
					used++;
				} else if (uid === 0) {
					free++;
				}
			}
			const locale = meta.config.defaultLang;
			date = new Date(date).toLocaleDateString(locale, { dateStyle: 'full' });
			return { fid, date, used, free, total };
		}),
	});
};
