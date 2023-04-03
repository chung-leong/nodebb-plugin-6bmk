<form role="form" class="6bmk-settings">
	<div class="row mb-4">
		<div class="col-sm-2 col-12 settings-header">[[6bmk:flyer-options]]</div>
		<div class="col-sm-10 col-12">
			<div class="mb-3">
				<label class="form-label" for="orientation">[[6bmk:layout]]</label>
				<select id="orientation" name="orientation" title="[[6bmk:layout]]" class="form-control">
					<option value="portrait">[[6bmk:portrait]]</option>
					<option value="landscape">[[6bmk:landscape]]</option>
				</select>
			</div>
			<div class="mb-3">
				<label class="form-label" for="paper">[[6bmk:paper-size]]</label>
				<select id="paper" name="paper" title="[[6bmk:paper-size]]" class="form-control">
					<option value="letter">US Letter</option>
					<option value="a4">A4</option>
				</select>
			</div>
			<div class="mb-3">
				<label class="form-label" for="locale">[[6bmk:haiku-language]]</label>
				<select id="locale" name="locale" title="[[6bmk:haiku-language]]" class="form-control">
					<option value="en-US">[[6bmk:english-us]]</option>
					<option value="en-GB">[[6bmk:english-gb]]</option>
					<option value="en-CA">[[6bmk:english-ca]]</option>
					<option value="en-AU">[[6bmk:english-au]]</option>
				</select>
			</div>
			<div class="mb-3">
				<label class="form-label" for="mode">[[6bmk:haiku-location]]</label>
				<select id="mode" name="mode" title="[[6bmk:haiku-location]]" class="form-control">
					<option value="simplex">[[6bmk:front-simplex]]</option>
					<option value="duplex">[[6bmk:back-duplex]]</option>
				</select>
			</div>
			<div class="mb-3">
				<label class="form-label" for="instructions">[[6bmk:instructions]]</label>
				<input type="text" id="instructions" name="instructions" title="[[6bmk:instructions]]" class="form-control" placeholder="[[6bmk:instructions]]">
			</div>
		</div>
	</div>

	<div class="row mb-4">
		<div class="col-sm-2 col-12 settings-header">[[6bmk:new-flyer]]</div>
		<div class="col-sm-10 col-12">
				<button type="button" id="download" class="btn btn-primary">[[6bmk:download]]</button>
			</form>
		</div>
	</div>
{{{ if flyers.length }}}
	<div class="row mb-4">
		<div class="col-sm-2 col-12 settings-header">[[6bmk:existing-flyers]]</div>
		<div class="col-sm-10 col-12">
		<ul id="flyer-list" class="list-group list-group-flush">
			<!-- IMPORT admin/plugins/6bmk/partials/flyer-list/list.tpl -->			
		</ul>
		</div>
	</div>
{{{ end }}}
</form>
<form id="download-form" method="post" action="{config.relative_path}/api/v3/plugins/6bmk/flyers/">
	<input type="hidden" name="csrf_token" value="{config.csrf_token}">
	<input type="hidden" name="download" value="pptx">
</form>

<!-- IMPORT admin/partials/save_button.tpl -->