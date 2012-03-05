$(document).ready(function(){
	$('#settings_modal').modal({backdrop: 'static', keyboard: false, show: true});

	$('#settings_ok_button').on('click', function(){
		$('#settings_modal').modal('hide');
		return false;
	});

	var new_process_modal = $('#new_process_modal').modal({backdrop: 'static', keyboard: false}).modal('hide');

	$('#new_process').on('click', function(){
		console.log(123);
		new_process_modal.modal('show');
		return false;
	});
});