


(function () {
	"use strict";

	// Module for performing actions as soon as possible
	var ASAP = (function () {

		// Variables
		var state = 0;
		var callbacks_asap = [];
		var callbacks_ready = [];
		var callbacks_check = [];
		var callback_check_interval = null;
		var callback_check_interval_time = 20;
		var on_document_readystatechange_interval = null;



		// Events
		var on_document_readystatechange = function () {
			// State check
			if (document.readyState == "interactive") {
				if (state == 0) {
					// Mostly loaded
					state = 1;

					// Callbacks
					var c = callbacks_asap;
					callbacks_asap = null;
					trigger_callbacks(c);
				}
			}
			else if (document.readyState == "complete") {
				// Loaded
				state = 2;

				// Callbacks
				var c;
				if (callbacks_asap !== null) {
					c = callbacks_asap;
					callbacks_asap = null;
					trigger_callbacks(c);
				}

				c = callbacks_ready;
				callbacks_ready = null;
				trigger_callbacks(c);

				// Complete
				clear_events();
			}
		};
		var on_callbacks_check = function () {
			// Test all
			for (var i = 0; i < callbacks_check.length; ++i) {
				if (callback_test.call(null, callbacks_check[i])) {
					// Remove
					callbacks_check.splice(i, 1);
					--i;
				}
			}

			// Stop timer?
			if (callbacks_check.length == 0) {
				clearInterval(callback_check_interval);
				callback_check_interval = null;
			}
		};
		var on_callback_timeout = function (data) {
			// Remove
			for (var i = 0; i < callbacks_check.length; ++i) {
				if (callbacks_check[i] === data) {
					// Update
					data.timeout_timer = null;

					// Callback
					if (data.timeout_callback) data.timeout_callback.call(null);

					// Remove
					callbacks_check.splice(i, 1);
					return;
				}
			}
		};

		// Clear events
		var clear_events = function () {
			if (on_document_readystatechange_interval !== null) {
				// Remove timer
				clearInterval(on_document_readystatechange_interval);
				on_document_readystatechange_interval = null;

				// Remove events
				document.removeEventListener("readystatechange", on_document_readystatechange, false);

				// Clear callbacks
				callbacks_asap = null;
				callbacks_ready = null;
			}
		};

		// Test callback
		var callback_test = function (data) {
			if (!data.condition || data.condition.call(null)) {
				// Call
				data.callback.call(null);

				// Stop timeout
				if (data.timeout_timer !== null) {
					clearTimeout(data.timeout_timer);
					data.timeout_timer = null;
				}

				// Okay
				return true;
			}

			// Not called
			return false;
		};
		var callback_wait = function (data) {
			// Add to list
			callbacks_check.push(data);
			if (callback_check_interval === null) {
				callback_check_interval = setInterval(on_callbacks_check, callback_check_interval_time);
			}

			// Timeout
			if (data.timeout > 0) {
				data.timeout_timer = setTimeout(on_callback_timeout.bind(null, data), data.timeout * 1000);
			}
		};

		// Trigger callback list
		var trigger_callbacks = function (callback_list) {
			for (var i = 0, j = callback_list.length; i < j; ++i) {
				// Test
				if (!callback_test.call(null, callback_list[i])) {
					// Queue
					callback_wait.call(null, callback_list[i]);
				}
			}
		};

		// Add callback
		var add_callback = function (callback, condition, timeout, timeout_callback, target) {
			var cb_data = {
				callback: callback,
				condition: condition || null,
				timeout: timeout || 0,
				timeout_callback: timeout_callback || null,
				timeout_timer: null
			};

			if (target === null) {
				// Test
				if (!callback_test.call(null, cb_data)) {
					// Queue
					callback_wait.call(null, cb_data);
				}
			}
			else {
				// Add
				target.push(cb_data);
			}
		};

		// Setup events
		on_document_readystatechange();
		if (state < 2) {
			document.addEventListener("readystatechange", on_document_readystatechange, false);
			on_document_readystatechange_interval = setInterval(on_document_readystatechange, 20);
		}



		// Return functions
		return {

			/**
				Call a function as soon as possible when the DOM is fully loaded
				(document.readyState == "interactive")

				@param callback
					The callback to be called
					The call format is:
						callback.call(null)
				@param condition
					An additional condition to test for.
					If this condition is falsy, a timeout interval is
					used to continuously test it until it is true (or timed out)
					The call format is:
						condition.call(null)
				@param timeout
					If specified, a maximum time limit is given for the condition to be met
					Must be greater than 0, units are seconds
				@param timeout_callback
					If specified, this is a callback which is called when the condition check
					has timed out
					The call format is:
						timeout_callback.call(null)
			*/
			asap: function (callback, condition, timeout, timeout_callback) {
				// Add to asap
				add_callback.call(null, callback, condition, timeout, timeout_callback, callbacks_asap);
			},
			/**
				Call a function as soon as possible when the DOM is fully loaded
				(document.readyState == "complete")

				@param callback
					The callback to be called
					The call format is:
						callback.call(null)
				@param condition
					An additional condition to test for.
					If this condition is falsy, a timeout interval is
					used to continuously test it until it is true (or timed out)
					The call format is:
						condition.call(null)
				@param timeout
					If specified, a maximum time limit is given for the condition to be met
					Must be greater than 0, units are seconds
				@param timeout_callback
					If specified, this is a callback which is called when the condition check
					has timed out
					The call format is:
						timeout_callback.call(null)
			*/
			ready: function (callback, condition, timeout, timeout_callback) {
				// Add to ready
				add_callback.call(null, callback, condition, timeout, timeout_callback, callbacks_ready);
			},

		};

	})();

	var bind_function = function (callback, self) {
		var args = Array.prototype.slice.call(arguments, 2);

		// return callback.bind(self, args);
		return function () {
			var full_args = Array.prototype.slice.call(args);
			Array.prototype.push.apply(full_args, arguments);

			return callback.apply(self, full_args);
		};
	};
	var wrap_mouseenterleave_event = (function () {

		// Handle mouseover/mouseout events to make sure the target is correct
		var on_mouseenterleave_prehandle = function (event, callback, self, extra_args) {
			// Must check for same parent element
			var parent = event.relatedTarget;

			// Error handling
			try {
				// Find parents
				while (parent) {
					if (parent === this) return;
					parent = parent.parentNode;
				}

				// Setup event arguments
				var new_args = [ event , this ],
					i = 0,
					im = extra_args.length;

				for (; i < im; ++i) new_args.push(extra_args[i]);

				// Okay, trigger event
				return callback.apply(self, new_args);
			}
			catch (e) {
			}
		};



		// Return a wrapping function
		return function (callback, self) {
			// Get any extra arguments
			var args = Array.prototype.slice.call(arguments, 2);

			// Return the function wrapped
			return function (event) {
				return on_mouseenterleave_prehandle.call(this, event, callback, self, args);
			};
		};

	})();

	var add_event_listener = function (event_list, node, event, callback, capture) {
		node.addEventListener(event, callback, capture);
		event_list.push([ node , event , callback , capture ]);
	};
	var remove_event_listeners = function (event_list) {
		for (var i = 0, entry; i < event_list.length; ++i) {
			entry = event_list[i];
			entry[0].removeEventListener(entry[1], entry[2], entry[3]);
		}
	};

	var restyle_noscript = function () {
		// Script
		var nodes = document.querySelectorAll(".script_disabled"),
			i;

		for (i = 0; i < nodes.length; ++i) {
			nodes[i].classList.remove("script_visible");
		}

		nodes = document.querySelectorAll(".script_enabled");
		for (i = 0; i < nodes.length; ++i) {
			nodes[i].classList.add("script_visible");
		}
	};

	var rice_delete_checkboxes = function (nodes) {
		var nodes = nodes || document.querySelectorAll("input[type=checkbox].checkbox"),
			svgns = "http://www.w3.org/2000/svg",
			i, par, sib, node, n1, n2, n3;

		for (i = 0; i < nodes.length; ++i) {
			node = nodes[i];
			par = node.parentNode;
			sib = node.nextSibling;

			// Create new checkbox
			n1 = document.createElement("label");
			n1.className = node.className;

			n2 = document.createElementNS(svgns, "svg");
			n2.setAttribute("svgns", svgns);
			n2.setAttribute("viewBox", "0 0 16 16");

			n3 = document.createElementNS(svgns, "polygon");
			n3.setAttribute("points", "13,0 16,2 8,16 5,16 0,11 2,8 6,11.5");
			n2.appendChild(n3);

			if (node.classList.contains("delete_checkbox")) {
				n3 = document.createElementNS(svgns, "polygon");
				n3.setAttribute("points", "0,2 2,0 8,6 14,0 16,2 10,8 16,14 14,16 8,10 2,16 0,14 6,8");
				n2.appendChild(n3);
			}

			// Re-add
			n1.appendChild(n2);
			par.insertBefore(n1, node);
			n1.insertBefore(node, n2);
		}
	};

	var class_add = function (node, class_name) {
		if (node.classList) {
			node.classList.add(class_name);
		}
		else {
			// If classList doesn't exist (SVG nodes in IE)
			var cn = node.getAttribute("class") || "";

			if (cn.length == 0) {
				node.setAttribute("class", class_name);
			}
			else {
				var regex = class_name.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
				regex = new RegExp("(^|\\s)" + regex + "(\\s|$)");
				if (!regex.exec(cn)) {
					node.setAttribute("class", cn + " " + class_name);
				}
			}
		}
	};
	var class_remove = function (node, class_name) {
		if (node.classList) {
			node.classList.remove(class_name);
		}
		else {
			// If classList doesn't exist (SVG nodes in IE)
			var regex = class_name.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
			regex = new RegExp("(^|\\s)" + regex + "(\\s|$)", "g");
			node.setAttribute("class", (node.getAttribute("class") || "").replace(regex, " ").trim());
		}
	};



	var Edit = (function () {

		var Image = function () {
			this.uri = "";
			this.remove_when_done = false;
			this.node = null;
			this.event_list = [];
			this.width = 0;
			this.height = 0;
		};
		var Coordinate = function (parent, id) {
			this.parent = parent;

			this.x = 0;
			this.y = 0;
			this.id = id;
			this.event_list = [];

			// Create svg nodes
			var svgns = this.parent.preview_image_overlay.getAttribute("svgns");

			this.point_node = document.createElementNS(svgns, "rect");
			this.point_node.setAttribute("width", "1");
			this.point_node.setAttribute("height", "1");

			this.point_mask_node = document.createElementNS(svgns, "rect");
			this.point_mask_node.setAttribute("width", "1");
			this.point_mask_node.setAttribute("height", "1");
			add_event_listener(this.event_list, this.point_mask_node, "mousedown", bind_function(on_coordinate_mask_mousedown, this.parent, this), false);

			this.parent.preview_image_overlay_points.appendChild(this.point_node);
			this.parent.preview_image_overlay_point_masks.appendChild(this.point_mask_node);

			if (this.id > 0) {
				// Same
				this.line = this.parent.coordinates[this.id - 1].line;
				++this.line.count;
			}
			else {
				// New
				this.line = new PolyLine(this.parent, this.id);
			}

			// Create other nodes
			var checkbox_node, n;

			this.display_node = document.createElement("div");
			this.display_node.className = "coordinate_list_entry";

			checkbox_node = document.createElement("input");
			checkbox_node.className = "checkbox delete_checkbox";
			checkbox_node.setAttribute("type", "checkbox");
			checkbox_node.checked = true;
			add_event_listener(this.event_list, checkbox_node, "change", bind_function(on_coordinate_delete_change, this.parent, this, checkbox_node), false);

			this.id_node = document.createElement("span");
			this.id_node.className = "coordinate_list_entry_id";

			n = document.createElement("span");
			n.textContent = ": ";

			this.coordinate_node = document.createElement("span");
			this.coordinate_node.className = "coordinate_list_entry_pos";

			this.display_node.appendChild(checkbox_node);
			this.display_node.appendChild(this.id_node);
			this.display_node.appendChild(n);
			this.display_node.appendChild(this.coordinate_node);

			rice_delete_checkboxes([ checkbox_node ]);

			this.set_id(id);

			this.parent.coordinate_list.appendChild(this.display_node);
		};
		Coordinate.prototype = {
			constructor: Coordinate,

			set_position: function (x, y) {
				this.x = x;
				this.y = y;

				this.point_node.setAttribute("x", x);
				this.point_node.setAttribute("y", y);
				this.point_mask_node.setAttribute("x", x);
				this.point_mask_node.setAttribute("y", y);

				this.coordinate_node.textContent = "(" + x + "," + y + ")";

				this.line.update();
			},
			set_id: function (id) {
				this.id = id;
				this.id_node.textContent = id;
			},
			remove: function () {
				var cs = this.parent.coordinates,
					i, par;

				// Remove events
				remove_event_listeners(this.event_list);
				this.event_list = null;

				// Remove nodes
				par = this.display_node.parentNode;
				if (par) par.removeChild(this.display_node);

				par = this.point_node.parentNode;
				if (par) par.removeChild(this.point_node);

				par = this.point_mask_node.parentNode;
				if (par) par.removeChild(this.point_mask_node);

				// Update ids
				for (i = this.id + 1; i < cs.length; ++i) {
					cs[i].set_id(i - 1);
				}

				// Remove
				cs.splice(this.id, 1);
				if (this === this.parent.coordinate_current) {
					this.parent.coordinate_current = null;
				}

				// Remove line nodes if they are empty
				if (--this.line.count <= 0) {
					this.line.remove();
				}
				else {
					this.line.update();
				}
			},
		};
		var PolyLine = function (parent, start) {
			this.parent = parent;

			this.start = start;
			this.count = 1;

			var svgns = this.parent.preview_image_overlay.getAttribute("svgns");

			this.line_node = document.createElementNS(svgns, "polyline");
			this.line_bg_node = document.createElementNS(svgns, "polyline");

			this.parent.preview_image_overlay_lines.appendChild(this.line_node);
			this.parent.preview_image_overlay_lines_bg.appendChild(this.line_bg_node);
		};
		PolyLine.prototype = {
			constructor: PolyLine,

			update: function () {
				var coord_str = "",
					cs = this.parent.coordinates,
					c = this.start + this.count,
					i;

				for (i = this.start; i < c; ++i) {
					if (coord_str.length > 0) coord_str += " ";
					coord_str += (cs[i].x + 0.5);
					coord_str += ",";
					coord_str += (cs[i].y + 0.5);
				}

				this.line_node.setAttribute("points", coord_str);
				this.line_bg_node.setAttribute("points", coord_str);
			},
			remove: function () {
				var par;

				// Remove nodes
				par = this.line_node.parentNode;
				if (par) par.removeChild(this.line_node);

				par = this.line_bg_node.parentNode;
				if (par) par.removeChild(this.line_bg_node);
			},
		};

		var Edit = function () {
			this.image = new Image();
			this.zoom = 1;

			this.coordinates = [];
			this.coordinate_current = null;

			this.edit_region = document.querySelector(".edit_region");

			this.drag_drop_highlight = document.querySelector(".drag_drop_highlight");
			this.selection_from_file = document.getElementById("selection_from_file");
			this.selection_from_file_button = document.querySelector(".selection_from_file_button");
			this.selection_from_url = document.getElementById("selection_from_url");

			this.preview_image_size = document.querySelector(".preview_image_size");
			this.preview_image_message = document.querySelector(".preview_image_message");
			this.preview_image_overlay = document.querySelector(".preview_image_overlay");
			this.preview_image_overlay_lines = document.querySelector(".preview_image_overlay_lines");
			this.preview_image_overlay_lines_bg = document.querySelector(".preview_image_overlay_lines_bg");
			this.preview_image_overlay_points = document.querySelector(".preview_image_overlay_points");
			this.preview_image_overlay_point_masks = document.querySelector(".preview_image_overlay_point_masks");

			this.preview_image_container_inner = document.querySelector(".preview_image_container_inner");

			this.preview_info_stat_zoom = document.querySelector(".preview_info_stat_zoom");
			this.preview_info_stat_resolution = document.querySelector(".preview_info_stat_resolution");
			this.preview_info_stat_cursor = document.querySelector(".preview_info_stat_cursor");

			this.coordinate_list_container = document.querySelector(".coordinate_list_container");
			this.coordinate_list = document.querySelector(".coordinate_list");
			this.coordinates_modifier = document.getElementById("coordinates_modifier");
			this.coordinates_modified = document.getElementById("coordinates_modified");

			this.disable_dragdrop_highlight_timer = null;

			var preview_info_stat_link_zoom_increase = document.querySelector(".preview_info_stat_link_zoom_increase"),
				preview_info_stat_link_zoom_decrease = document.querySelector(".preview_info_stat_link_zoom_decrease"),
				cancel_fn = bind_function(on_generic_cancel, this),
				fn;

			// File drag/drop events
			document.addEventListener("dragover", bind_function(on_file_dragover, this), false);
			document.addEventListener("dragleave", bind_function(on_file_dragleave, this), false);
			document.addEventListener("drop", bind_function(on_file_drop, this), false);

			// More events
			this.selection_from_url.addEventListener("change", bind_function(on_selection_from_url_change, this), false);
			this.selection_from_file.addEventListener("change", bind_function(on_selection_from_file_change, this), false);
			this.selection_from_file_button.addEventListener("click", bind_function(on_selection_from_file_click, this), false);
			this.drag_drop_highlight.addEventListener("click", bind_function(on_drag_drop_highlight_click, this), false);

			this.preview_image_container_inner.addEventListener("mousewheel", fn = bind_function(on_image_mousewheel, this), false);
			this.preview_image_container_inner.addEventListener("DOMMouseScroll", fn, false);

			preview_info_stat_link_zoom_increase.addEventListener("click", bind_function(on_zoom_change_click, this, 1), false);
			preview_info_stat_link_zoom_decrease.addEventListener("click", bind_function(on_zoom_change_click, this, -1), false);
			preview_info_stat_link_zoom_increase.addEventListener("mousedown", cancel_fn, false);
			preview_info_stat_link_zoom_decrease.addEventListener("mousedown", cancel_fn, false);

			this.preview_image_size.addEventListener("mouseover", wrap_mouseenterleave_event(on_image_mouseenter, this), false);
			this.preview_image_size.addEventListener("mouseout", wrap_mouseenterleave_event(on_image_mouseleave, this), false);
			document.addEventListener("mousemove", bind_function(on_document_mousemove, this), false);
			this.preview_image_size.addEventListener("mousedown", bind_function(on_image_mousedown, this), false);
			document.addEventListener("mouseup", bind_function(on_document_mouseup, this), false);

			this.coordinates_modifier.addEventListener("change", bind_function(on_autoreplace_change, this), false);
			this.coordinates_modified.addEventListener("click", bind_function(on_autoreplaced_click, this), false);

			window.addEventListener("blur", bind_function(on_window_blur, this), false);

			window.addEventListener("keydown", bind_function(on_window_keydown, this), false);
			window.addEventListener("keyup", bind_function(on_window_keyup, this), false);

			this.preview_image_container_inner.addEventListener("contextmenu", bind_function(on_image_region_contextmenu, this), false);
			this.preview_image_container_inner.addEventListener("mousedown", cancel_fn, false);
		};



		var on_file_dragover = function (event) {
			if (
				Array.prototype.indexOf.call(event.dataTransfer.types, "Files") < 0 &&
				Array.prototype.indexOf.call(event.dataTransfer.types, "text/uri-list") < 0
			) return;

			if (this.disable_dragdrop_highlight_timer !== null) {
				clearTimeout(this.disable_dragdrop_highlight_timer);
				this.disable_dragdrop_highlight_timer = null;
			}
			this.drag_drop_highlight.classList.add("drag_drop_highlight_visible");

			event.dataTransfer.dropEffect = "copy";
			event.preventDefault();
			event.stopPropagation();
			return false;
		};
		var on_file_dragleave = function (event) {
			if (
				Array.prototype.indexOf.call(event.dataTransfer.types, "Files") < 0 &&
				Array.prototype.indexOf.call(event.dataTransfer.types, "text/uri-list") < 0
			) return;

			if (this.disable_dragdrop_highlight_timer !== null) clearTimeout(this.disable_dragdrop_highlight_timer);
			this.disable_dragdrop_highlight_timer = setTimeout(bind_function(disable_dragdrop_highlight, this), 50);

			event.preventDefault();
			event.stopPropagation();
			return false;
		};
		var on_file_drop = function (event) {
			// Reset style
			if (this.disable_dragdrop_highlight_timer !== null) {
				clearTimeout(this.disable_dragdrop_highlight_timer);
				this.disable_dragdrop_highlight_timer = null;
			}
			this.drag_drop_highlight.classList.remove("drag_drop_highlight_visible");
			event.preventDefault();
			event.stopPropagation();

			// Read files
			if (event.dataTransfer.files.length > 0) {
				// Use image
				if (event.dataTransfer.files[0]) this.set_file(event.dataTransfer.files[0]);
			}
			else if (Array.prototype.indexOf.call(event.dataTransfer.types, "text/uri-list") >= 0) {
				var url = event.dataTransfer.getData("text/uri-list");

				// Use image
				this.selection_from_url.value = url;
				this.set_url(url);
			}

			// Done
			return false;
		};

		var on_selection_from_url_change = function (event) {
			// Use image
			this.set_url(this.selection_from_url.value);
		};
		var on_selection_from_file_change = function (event) {
			// Use file
			if (this.selection_from_file.files[0]) this.set_file(this.selection_from_file.files[0]);

			// Clear file
			this.selection_from_file.value = null;
		};
		var on_selection_from_file_click = function (event) {
			this.selection_from_file.click();
		};
		var on_drag_drop_highlight_click = function (event) {
			if (this.disable_dragdrop_highlight_timer !== null) {
				clearTimeout(this.disable_dragdrop_highlight_timer);
				this.disable_dragdrop_highlight_timer = null;
			}
			this.drag_drop_highlight.classList.remove("drag_drop_highlight_visible");
		};

		var on_image_load = function (event) {
			// Set size
			this.image.width = this.image.node.naturalWidth;
			this.image.height = this.image.node.naturalHeight;
			update_image_size.call(this);

			// Show
			this.preview_image_size.classList.add("preview_image_size_visible");
		};
		var on_image_error = function (event) {
			// Error
			this.preview_image_message.textContent = "Invalid image";
		};

		var on_zoom_change_click = function (delta, event) {
			if (this.image.width == 0) return;

			// Change zoom
			set_zoom.call(this, Math.max(1, this.zoom + delta));
		};
		var on_image_mousewheel = function (event) {
			if (this.image.width == 0) return;

			// Get direction
			var delta = (event.wheelDelta || -event.detail || 0);
			if (delta < 0) delta = -1;
			else if (delta > 0) delta = 1;

			// Change zoom
			set_zoom.call(this, Math.max(1, this.zoom + delta));

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		};

		var on_image_mouseenter = function (event) {
		};
		var on_image_mouseleave = function (event) {
		};
		var on_document_mousemove = function (event) {
			var pos = get_mouse_position.call(this, event);

			if (this.coordinate_current !== null) {
				snap_coordinate.call(this, event, pos);
				set_coordinate_position.call(this, this.coordinate_current, pos);
			}
		};
		var on_image_mousedown = function (event) {
			if (event.which === 1) {
				// Create new point
				var pos = get_mouse_position.call(this, event);

				this.coordinate_current = new Coordinate(this, this.coordinates.length);
				this.coordinates.push(this.coordinate_current);
				snap_coordinate.call(this, event, pos);
				set_coordinate_position.call(this, this.coordinate_current, pos);

				// Scroll
				this.coordinate_list_container.scrollTop = this.coordinate_list_container.scrollHeight - this.coordinate_list_container.clientHeight;

				// Stop event
				event.preventDefault();
				event.stopPropagation();
				return false;
			}
			else if (event.which === 3) {
				// Right click = cancel
				if (this.coordinate_current !== null) {
					this.coordinate_current.remove();
				}
			}
		};
		var on_document_mouseup = function (event) {
			if (this.coordinate_current !== null) {
				// Update
				var pos = get_mouse_position.call(this, event);
				snap_coordinate.call(this, event, pos);
				set_coordinate_position.call(this, this.coordinate_current, pos);
				this.coordinate_current = null;

				// Update auto-replace
				update_autoreplace.call(this);
			}
		};
		var on_image_region_contextmenu = function (event) {
			// Stop event
			event.preventDefault();
			event.stopPropagation();
			return false;
		};

		var on_autoreplace_change = function (event) {
			update_autoreplace.call(this);
		};
		var on_autoreplaced_click = function (event) {
			this.coordinates_modified.select();
		};



		var on_coordinate_mask_mousedown = function (coord, event) {
			if (event.which === 1) {
				// Modify coordinate
				var pos = get_mouse_position.call(this, event);

				this.coordinate_current = coord;
				snap_coordinate.call(this, event, pos);
				set_coordinate_position.call(this, this.coordinate_current, pos);

				// Stop event
				event.preventDefault();
				event.stopPropagation();
				return false;
			}
		};
		var on_coordinate_delete_change = function (coord, node, event) {
			if (!node.checked) {
				coord.remove();
			}
		};

		var on_window_blur = function (event) {
			// Stop stuff
			if (this.coordinate_current !== null) {
				// Update
				this.coordinate_current = null;

				// Update auto-replace
				update_autoreplace.call(this);
			}

			// Disable modification of existing points
			class_remove(this.preview_image_overlay_point_masks, "preview_image_overlay_point_masks_visible");
		};
		var on_window_keydown = function (event) {
			if (event.which == 17) { // Ctrl
				class_add(this.preview_image_overlay_point_masks, "preview_image_overlay_point_masks_visible");
			}
		};
		var on_window_keyup = function (event) {
			if (event.which == 17) { // Ctrl
				class_remove(this.preview_image_overlay_point_masks, "preview_image_overlay_point_masks_visible");
			}
		};

		var on_generic_cancel = function (event) {
			if (event.which === 1) {
				event.preventDefault();
				event.stopPropagation();
				return false;
			}
		};

		var get_mouse_position = function (event) {
			var pos = this.preview_image_size.getBoundingClientRect(),
				bn = this.preview_image_container_inner,
				bound = bn.getBoundingClientRect(),
				x = Math.floor((Math.max(bound.left, Math.min(bound.left + bn.clientWidth, event.clientX)) - pos.left) / this.zoom),
				y = Math.floor((Math.max(bound.top, Math.min(bound.top + bn.clientHeight, event.clientY)) - pos.top) / this.zoom);

			x = Math.max(0, Math.min(this.image.width - 1, x));
			y = Math.max(0, Math.min(this.image.height - 1, y));

			this.preview_info_stat_cursor.textContent = x + "," + y;

			return [ x , y ];
		};
		var snap_coordinate = function (event, pos) {
			if (event.shiftKey && this.coordinate_current.id > 0) {
				// Snap
				var c_rel = this.coordinates[this.coordinate_current.id - 1],
					x_diff = pos[0] - c_rel.x,
					y_diff = pos[1] - c_rel.y;

				if (Math.abs(x_diff) >= Math.abs(y_diff)) {
					y_diff = 0;
				}
				else {
					x_diff = 0;
				}

				pos[0] = c_rel.x + x_diff;
				pos[1] = c_rel.y + y_diff;
			}
		};
		var set_coordinate_position = function (coord, pos) {
			coord.set_position(pos[0], pos[1]);
		};
		var disable_dragdrop_highlight = function () {
			this.drag_drop_highlight.classList.remove("drag_drop_highlight_visible");
		};
		var update_image_size = function () {
			this.preview_image_size.style.width = this.image.width + "em";
			this.preview_image_size.style.height = this.image.height + "em";

			this.preview_image_overlay.setAttribute("viewBox", "0 0 " + this.image.width + " " + this.image.height);

			this.preview_info_stat_resolution.textContent = this.image.width + "x" + this.image.height;
		};
		var set_zoom = function (level) {
			this.zoom = level;

			this.preview_image_container_inner.style.fontSize = level.toFixed(2) + "px";

			this.preview_info_stat_zoom.textContent = (level * 100) + "%";
		};
		var update_autoreplace = function () {
			var val = this.coordinates_modifier.value,
				self = this;

			// Modify
			val = val.replace(/(^|[\w\W])(\\([xy])\[([0-9]+)\])/g, function (g0, start, body, key, id) {
				id = parseInt(id, 10);

				if (start == "\\") {
					return body;
				}
				else if (id >= 0 && id < self.coordinates.length) {
					return start + self.coordinates[id][key];
				}
				else {
					return g0;
				}
			});

			// Set
			this.coordinates_modified.value = val;
		};



		Edit.prototype = {
			constructor: Edit,

			set_file: function (file) {
				this.selection_from_url.value = "";
				this.set_image(window.URL.createObjectURL(file), true);
			},
			set_url: function (url) {
				this.set_image(url, false);
			},
			set_image: function (url, remove_when_done) {
				// Remove
				remove_event_listeners(this.image.event_list);
				if (this.image.node !== null) {
					var par = this.image.node.parentNode;
					if (par) par.removeChild(this.image.node);
				}
				if (this.image.remove_when_done) {
					window.URL.revokeObjectURL(this.image.url);
				}

				// Settings
				this.image.url = url;
				this.image.remove_when_done = remove_when_done;

				this.image.width = 0;
				this.image.height = 0;

				// Set image
				this.image.node = document.createElement("img");
				this.image.node.className = "preview_image";
				this.image.node.setAttribute("alt", "");
				add_event_listener(this.image.event_list, this.image.node, "load", bind_function(on_image_load, this), false);
				add_event_listener(this.image.event_list, this.image.node, "error", bind_function(on_image_error, this), false);

				this.preview_image_size.insertBefore(this.image.node, this.preview_image_overlay);
				this.image.node.setAttribute("src", url);

				// Display
				this.preview_image_message.textContent = "Loading image";

				this.preview_image_size.classList.remove("preview_image_size_visible");
				set_zoom.call(this, 1);

				this.edit_region.classList.add("edit_region_visible");
			},

		};



		return Edit;

	})();



	// Execute
	ASAP.asap(function () {
		// Noscript
		var nodes, i;

		// Noscript
		restyle_noscript();

		// Setup editing
		var edit = new Edit();
	});

})();


