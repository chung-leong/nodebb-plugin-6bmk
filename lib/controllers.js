'use strict';

const { getFlyers, formatFlyers } = require('./helpers');

module.exports = {
	renderEntryPage,
	renderAdminPage,
};

async function renderEntryPage(req, res) {
	res.render('6bmk', {
		title: '[[6bmk:title]]',
	});
}

async function renderAdminPage(req, res) {
	const flyers = await getFlyers();	
	res.render('admin/plugins/6bmk', {
		flyers: await formatFlyers(flyers),
	});
}
