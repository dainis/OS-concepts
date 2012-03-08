$(document).ready(function(){

	var settings_modal = $('#settings_modal').modal({backdrop: 'static', keyboard: false, show: true});

	$('#settings_ok_button').on('click', function(){

		$('.error', settings_modal).removeClass('error');
		$('.help-block', settings_modal).hide();

		var errors = false;

		var cycle_length = parseInt($('input[name="cycle_length"]', settings_modal).val());

		if(!cycle_length || cycle_length < 1) {
			errors = true;
			$('input[name="cycle_length"]', settings_modal).closest('.control-group').addClass('error').find('.help-block').show();
		}

		var paralel_processes = parseInt($('input[name="paralel_processes"]', settings_modal).val());

		if(!paralel_processes || paralel_processes < 1) {
			errors = true;
			$('input[name="paralel_processes"]', settings_modal).closest('.control-group').addClass('error').find('.help-block').show();
		}

		if(!errors) {
			task_queue.cycle_length = cycle_length;
			task_queue.paralel_processes = paralel_processes;			
			task_queue.start();

			$(settings_modal).modal('hide');	
		}
		
		return false;
	});

	var new_process_modal = $('#new_process_modal').modal({backdrop: 'static', keyboard: false}).modal('hide');

	$('#new_process').on('click', function(){
		
		new_process_modal.modal('show');
		return false;
	});


});

var task_queue = {
	cycle_length: undefined,
	paralel_processes: undefined,
	start: function() {
		var that = this;
		var timeouted = function() {
			console.log(new Date().valueOf());
			setTimeout(timeouted, that.cycle_length * 1000);
		}

		timeouted();
	}
}