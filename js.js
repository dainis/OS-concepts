$(document).ready(function(){

	var settings_modal = $('#settings_modal').modal({backdrop: 'static', keyboard: false, show: true});

	//Error handling
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

		$('input', new_process_modal).val('');
		$('.error', new_process_modal).removeClass('error');
		$('.error-block', new_process_modal).hide();

		new_process_modal.modal('show');

		return false;
	});

	$('#create_process').on('click', function() {

		$('.error', new_process_modal).removeClass('error');
		$('.error-block', new_process_modal).hide();

		var process_cycles = parseInt($('input[name="cycles"]', new_process_modal).val());

		if(!process_cycles || process_cycles < 0) {
			$('input[name="cycles"]', new_process_modal).closest('.control-group').addClass('error').find('.help-block').show();
		}
		else {
			$(new_process_modal).modal('hide');
			var io_wait = parseInt($('input[name="io_wait"]', new_process_modal).val());
			var process = new Process(process_cycles, io_wait);
			task_queue.add_process(process);
		}

		return false;
	});

	$('#test_anim').on('click', function() {
		var el = $('#new .process');
		animate_move(el, $('#running'));
		return false;
	});

	$('#running').on('click', '.terminate', function() {
		var process = $(this).closest('.process');
		animate_move(process, $('#terminated'));
	})
});

var animate_move = function(el, to_container) {
	el = $(el);

	var initial_offset = el.offset();
	var animated_el = el.clone();
	var dimensions = {
		width: el.width()
	};

	to_container.append(el);

	var target_coords = el.offset();

	el.hide();

	console.log(el);
	console.log(animated_el);
	console.log(target_coords);
	console.log(initial_offset);

	animated_el.css({
		position: 'absolute', 
		left: initial_offset.left, 
		top: initial_offset.top, 
		width: dimensions.width, 
	});
	
	$('body').append(animated_el);

	animated_el.animate(
		{
			left: target_coords.left, 
			top: target_coords.top
		}, 
		{
			duration: 1000,
			specialEasing: {
      			width: 'linear',
      			height: 'easeOutBounce'
    		},
    		complete: function() {
    			el.show();
      			$(this).remove();
    		}
    	});
}

var Process = function(cycles, interupt) {
	
	var cycles_left = cycles;

	var pid = null;

	var status = Process.STATUS_NEW;

	var dom = undefined;

	var task_queue = undefined;
	/**
	 * 
	 */
	this.set_pid = function(pid_in, task_queue_in) {
		pid = pid_in;
		task_queue = task_queue_in;
	}

	//Renders process content, if new, then renders it in corresponding que
	this.render = function() {

		if(!dom) {
			dom = $('.process.template').clone().removeClass('template');
			$(task_queue.lists[status] + ' .list').append(dom).fadeIn(1000);	
			$('.pid > span', dom).text(pid);
		}

		$('.cycles > span', dom).text(cycles - cycles_left+'/'+cycles);
	}

	this.run = function() {
		cycles_left -= 1;

	}
}

Process.STATUS_NEW = 1;
Process.STATUS_READY = 2;
Process.STATUS_RUNNING = 3;
Process.STATUS_WAITING = 4;
Process.STATUS_TERMINATED = 5;

var task_queue = (function(){

	var pid = 1;

	var processes = [];

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
		},
		get_pid: function() {
			return pid++;
		},
		add_process: function(process) {
			process.set_pid(this.get_pid(), this);
			processes.push(process);
			process.render();
		}

	}

	task_queue.lists = [];
	task_queue.lists[Process.STATUS_NEW] = '#new';
	task_queue.lists[Process.STATUS_READY] = '#ready';
	task_queue.lists[Process.STATUS_RUNNING] = '#running';
	task_queue.lists[Process.STATUS_WAITING] = '#waiting';
	task_queue.lists[Process.STATUS_TERMINATED] = '#terminated';

	return task_queue;
}());

