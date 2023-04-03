'use strict';

define('admin/plugins/6bmk', [ 'settings' ], function (settings) {
	var ACP = {};

	ACP.init = function () {
		settings.load('6bmk', $('.6bmk-settings'));
		$('#save').on('click', saveSettings);
		$('#download').on('click', startDownload);
	};

	function saveSettings() {
		settings.save('6bmk', $('.6bmk-settings'));
	}

	function startDownload() {
		$('#download-form').submit();
		setTimeout(() => ajaxify.refresh(), 500);
	}

	return ACP;
});
