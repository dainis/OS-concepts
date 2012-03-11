$(document).ready(function(){

	var modal_open = true;

	var settings_modal = $('#settings_modal').modal({backdrop: 'static', keyboard: false, show: true});

	//Error handling
	$('#settings_ok_button').on('click', function(){

		$('.error', settings_modal).removeClass('error');
		$('.help-block', settings_modal).hide();

		var errors = false;

		var cycle_length = parseInt($('input[name="cycle_length"]', settings_modal).val());

		var max_execution_cycles = parseInt($('input[name="max_execution_cycles"]', settings_modal).val());

		if(!cycle_length || cycle_length < 1) {
			errors = true;
			$('input[name="cycle_length"]', settings_modal).closest('.control-group').addClass('error').find('.help-block').show();
		}

		var paralel_processes = parseInt($('input[name="paralel_processes"]', settings_modal).val());

		if(!paralel_processes || paralel_processes < 1) {
			errors = true;
			$('input[name="paralel_processes"]', settings_modal).closest('.control-group').addClass('error').find('.help-block').show();
		}

		if(!max_execution_cycles || max_execution_cycles < 1) {
			errors = true;
			$('input[name="max_execution_cycles"]', settings_modal).closest('.control-group').addClass('error').find('.help-block').show();
		}		

		if(!errors) {

			task_queue.cycle_length = cycle_length;
			task_queue.paralel_processes = paralel_processes;
			task_queue.start();
			task_queue.max_execution_cycles = max_execution_cycles;
			$(settings_modal).modal('hide');	
			modal_open = false;
		}
		
		return false;
	});

	var new_process_modal = $('#new_process_modal').modal({backdrop: 'static', keyboard: false}).modal('hide');

	$('#new_process').on('click', function(){

		modal_open = true;

		$('input:not([type="radio"])', new_process_modal).val('');
		$('.error', new_process_modal).removeClass('error');
		$('.error-block', new_process_modal).hide();

		new_process_modal.modal('show');

		return false;
	});

	$('#create_process').on('click', function() {

		$('.error', new_process_modal).removeClass('error');
		$('.error-block', new_process_modal).hide();

		var process_cycles = parseInt($('input[name="cycles"]', new_process_modal).val());

		if(isNaN(process_cycles) || process_cycles < 0) {
			$('input[name="cycles"]', new_process_modal).closest('.control-group').addClass('error').find('.help-block').show();
		}
		else {
			$(new_process_modal).modal('hide');
			var io_wait = parseInt($('input[name="io_wait"]:checked', new_process_modal).val());
			process_cycles = process_cycles || Infinity;
			var process = new Process(process_cycles, io_wait);
			task_queue.add_process(process);
			modal_open = false;
		}

		return false;
	});

	$('#running').on('click', '.terminate', function() {
		task_queue.terminate($(this).closest('.process').data('pid'));

		return false;
	});

	$('body').on('keypress', function(e) {
		if(!modal_open) {
			
			task_queue.notify(e.which);

			return false;
		}
		
		return true;		
	})
});

var animate_move = function(el, to_container) {

	el = $(el);

	el.addClass('animating');

	var initial_offset = el.offset();
	var animated_el = el.clone();
	var dimensions = {
		width: el.width()
	};

	to_container.append(el);

	var target_coords = el.offset();

	el.hide();

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
    			el.removeClass('animating');
      			$(this).remove();
    		}
    	});
}

var Process = function(cycles, interupt) {
	
	var cycles_left = cycles;

	var pid = null;

	var status = Process.STATUS_NEW;
	var old_status = null;
	var dom = undefined;
	var cycles_executed = 0;
	var cycles_executed_in_loop = 0;
	var io = null;

	this.set_pid = function(pid_in) {
		pid = pid_in;
		dom = $('.process.template').clone().removeClass('template');
		dom.data('pid', pid);
		$('#new .list').append(dom).fadeIn(1000);
		$('.pid > span', dom).text(pid);
	}

	this.get_pid = function() {
		return pid;
	}

	//Renders process content, if new, then renders it in corresponding que
	this.render = function() {
		$('.io > span', dom).text(io)

		$('.cycles > span', dom).text(cycles_executed+'/'+cycles);
	}

	this.run = function() {

		if(cycles_left < 1) {
			status = Process.STATUS_TERMINATED;
			return;
		}
		console.log(task_queue);
		if(cycles_executed_in_loop == task_queue.max_execution_cycles) {
			cycles_executed_in_loop = 0;
			status = Process.STATUS_READY;
			return;
		}

		if(status == Process.STATUS_READY) {
			status = Process.STATUS_RUNNING;
			return;
		}

		cycles_left -= 1;
		cycles_executed += 1;
		cycles_executed_in_loop += 1;
		if(interupt && status == Process.STATUS_RUNNING) {
			var io_wait = Math.random()*cycles;
			if(io_wait < (cycles / 5)) {
				status = Process.STATUS_WAITING;
				io = String.fromCharCode(Math.floor(Math.random() * 26 + 97));
			}

			return;
		}
	}

	this.get_dom = function() {
		return dom;
	}

	this.set_status = function(status_in) {
		status = status_in;
	}

	this.get_status = function() {
		return status;
	}

	this.waiting_for = function(code) {
		return io == String.fromCharCode(code);
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

	var lists = {
		new: [],
		ready: [],
		running: [],
		waiting: [],
		terminated: []
	};

	var move_to_list = function(p, list) {

		if(p.get_dom().hasClass('animating')) {
			setTimeout(function() {move_to_list(p, list)}, 30);
		}
		else {
			p.render();
			animate_move(p.get_dom(), list);
		}
	}

	var currently_running = 0;

	var task_queue = {

		cycle_length: undefined,
		paralel_processes: undefined,
		max_execution_cycles: 10,
		start: function() {
			var that = this;
			var timeouted = function() {
				
				while(lists.new.length > 0) {

					var process = lists.new.shift();
					
					process.set_status(Process.STATUS_READY);
					move_to_list(process, $('#ready'));
					//animate_move(process.get_dom(), $('#ready'));

					lists.ready.push(process);
				}

				while(lists.ready.length > 0 && currently_running < that.paralel_processes) {
					var process = lists.ready.shift();
					lists.running.push(process);
					currently_running++;
					move_to_list(process, $('#running'));
					//animate_move(process.get_dom(), $('#running'));					
				}

				var processed = [];
				
				while(lists.running.length > 0) {

					var process = lists.running.shift();
					process.run();

					if(process.get_status() == Process.STATUS_TERMINATED) {
						lists.terminated.push(process);
						move_to_list(process, $('#terminated'));
						currently_running -= 1;
					}
					else if(process.get_status() == Process.STATUS_WAITING) {
						lists.waiting.push(process);
						move_to_list(process, $('#waiting'));
						currently_running -= 1;
					}
					else if(process.get_status() == Process.STATUS_READY) {
						lists.ready.push(process);
						move_to_list(process, $('#ready'));
						currently_running -= 1;
					}
					else {
						process.render();
						processed.push(process);
					}
				}

				lists.running = processed;
				
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
			lists.new.push(process);
			process.render();
		},
		terminate: function(pid) {

			var l = lists.running.length;
			var running = lists.running;
			var process = null;

			for(var i=0; i<l;i++) {
				if(running[i].get_pid() == pid) {
					process = running[i];
					break;
				}
			}

			currently_running -= 1;

			lists.running.splice(i, 1);

			process.set_status(Process.STATUS_TERMINATED);
			
			move_to_list(process, $('#terminated'));
			lists.terminated.push(process);
		},

		notify: function(char) {
			var still_waiting = [];

			while(lists.waiting.length > 0) {

				var process = lists.waiting.shift();

				if(process.waiting_for(char)) {
					process.set_status(Process.STATUS_READY);
					lists.ready.push(process);
					move_to_list(process, $('#ready'));
				}
				else {
					still_waiting.push(process);
				}
			}

			lists.waiting = still_waiting;
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