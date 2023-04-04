'use strict';

define('admin/plugins/6bmk', [ 
	'settings', 
	'api', 
	'benchpress',
	'translator'
 ], function (settings, api, benchpress, translator) {
	var ACP = {};

	let savedValues
	ACP.init = function () {
		settings.load('6bmk', $('.6bmk-settings'), () => {
			savedValues = $('.6bmk-settings').serializeObject();
		});
		$('#save').on('click', saveSettings);
		$('#download').on('click', startDownload);
	};

	function saveSettings() {
		settings.save('6bmk', $('.6bmk-settings'), () => {
			savedValues = $('.6bmk-settings').serializeObject();
		});
	}

	function startDownload() {
		const values = $('.6bmk-settings').serializeObject();
		if (JSON.stringify(values) !== JSON.stringify(savedValues)) {
			translator.translate('[[6bmk:save-before-download]]', (message) => {
				bootbox.alert(message);
			});
			return;
		}

		$('#download-form').submit();
		let attempt = 0;
		const update = (delay) => {
			setTimeout(() => {
				api.get('/plugins/6bmk/flyers/', {}, async (err, result) => {
					if (!err) {
						const html = await benchpress.render('admin/plugins/6bmk/partials/flyer-list/list', result);
						translator.translate(html, (html) => {
							$('#flyer-list').html(html);	
						});
						const { flyers } = result;
						if (flyers[0]?.total === 0 && attempt <= 2) {
							// haiku count hasn't been updated yet
							update(5000);
							attempt++;
						}
					} else {
						console.error(err);
					}
				});
			}, delay);
		};
		update(2000);
	}

	return ACP;
});
