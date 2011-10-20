var g_running = false;
var dla_ctx;
var dla_canvas;
var canvas_height;
var canvas_width;
var canvas_radius_x;
var canvas_radius_y;
var canvas_origin_x;
var canvas_origin_y;
var bg_color = "#f0e0d1";

var particles = [];
var nticks = 0;
var scale = 1.0;

var AUTO_ADD_FROM_ANYWHERE = 0;
var AUTO_ADD_FROM_TOP = 1;
var AUTO_ADD_FROM_LEFT = 2;
var AUTO_ADD_FROM_BOTTOM = 3;
var AUTO_ADD_FROM_RIGHT = 4;
var AUTO_ADD_FROM_OUTSIDE = 10;
var AUTO_ADD_NEAR_CENTER = 20;

//
// settings
var g_step_time = 1;  // ms
var auto_add = -1;
var auto_add_from = AUTO_ADD_FROM_OUTSIDE;
var particle_size_low = 1;
var particle_size_high = 5;
var aggregation_threshold = 1.5;
var aggregate_fixed_only = true;
var aggregate_count_threshold = 5;

var stuck_color = "#600";
var fixed_colors_fine =
    ["#FF0000", "#F80000", "#EF0000", "#E80000", "#DF0000", "#D80000",
     "#CF0000", "#C80000", "#BF0000", "#B80000", "#AF0000", "#A80000",
     "#9F0000", "#980000", "#8F0000", "#880000", "#7F0000", "#780000"];
var fixed_colors_coarse =
    ["#FF0000", "#DF0000", "#BF0000", "#AF0000",
     "#8F0000", "#6F0000"];
var fixed_colors = fixed_colors_coarse;
var num_fixed_colors = fixed_colors.length;                 

function load(dla_id) {
  dla_canvas = document.getElementById(dla_id);
  dla_ctx = dla_canvas.getContext("2d");
  dla_canvas.addEventListener('mousedown', on_mousedown, false);

  canvas_height = 450;
  canvas_width  = 450;
  canvas_radius_x = canvas_width / 2;
  canvas_radius_y = canvas_height / 2;
  canvas_origin_x = canvas_width / 2.;
  canvas_origin_y = canvas_height / 2.;
  clear_dla();
  var initial_particles = random_range(6, 13);
  var initial_particles_are_seeds = aggregate_fixed_only;
  for(var i=0; i < initial_particles; i++) {
      if (initial_particles_are_seeds) {
          introduce_particle_from(AUTO_ADD_NEAR_CENTER, true);
      }
      // but in either case, also introduce some moving particles.
      introduce_particle(false);
  }
  start_dla();
}

function draw_particle(particle) {
    dla_ctx.fillStyle = particle.color;
    if (isNaN(particle.x) || !particle.x) {
        particle.x = 0;
    }
    if (isNaN(particle.y) || !particle.y) {
        particle.y = 0;
    }
    dla_ctx.fillRect(particle.x + canvas_origin_x,
                     (canvas_height - particle.y - canvas_origin_y),
                     particle.width, particle.height);
}

function introduce_particle(is_seed) {
    introduce_particle_from(auto_add_from, is_seed);
}


function introduce_particle_from(from, is_seed) {
    var px, py;
    if (from == AUTO_ADD_FROM_ANYWHERE) {
        px = random_range(-canvas_radius_x, canvas_radius_x);
        py = random_range(-canvas_radius_y, canvas_radius_y);
    } else if (from == AUTO_ADD_FROM_OUTSIDE) {
        var direction = 1 + Math.floor(4 * Math.random());
        return introduce_particle_from(direction);
    } else if (from == AUTO_ADD_FROM_TOP) {
        px = random_range(-canvas_radius_x, canvas_radius_x);
        py = canvas_radius_y;
    } else if (from == AUTO_ADD_FROM_RIGHT) {
        px = canvas_radius_x;
        py = random_range(-canvas_radius_y, canvas_radius_y);
    } else if (from == AUTO_ADD_FROM_BOTTOM) {
        px = random_range(-canvas_radius_x, canvas_radius_x);
        py = -1 * canvas_radius_y;
    } else if (from == AUTO_ADD_FROM_LEFT) {
        px = -1 * canvas_radius_x;
        py = random_range(-canvas_radius_y, canvas_radius_y);
    } else if (from == AUTO_ADD_NEAR_CENTER) {
        px = random_range(-canvas_radius_x/4, canvas_radius_x/4);
        py = random_range(-canvas_radius_y/4, canvas_radius_y/4);
    } else {
        px = random_range(-canvas_radius_x/4, canvas_radius_x/4);
        py = random_range(-canvas_radius_y/4, canvas_radius_y/4);
    }
    return introduce_particle_at(px, py, is_seed);
}

function introduce_particle_at(px, py, is_seed) {
    var size = random_range(particle_size_low, particle_size_high);
    //var size = 20;
    var particle = new Particle(px, py, size);
    if (is_seed) {
        fix_particle(particle);
    }
    particles.push(particle);
    draw_particle(particle);
    return particle;
}

function start_dla() {
    g_running = true;
    nticks = 0;
    step_and_continue();
}

function step_and_continue() {
    dla_tick();
    if (g_running) {
        window.setTimeout('step_and_continue()', g_step_time);
    }
}

function set_auto_add(aa) {
    auto_add = aa;
}

function set_auto_add_from(val) {
    auto_add_from = val;
}

function set_step_time(st) {
    g_step_time = st;
}

function set_particle_size_range(low, high) {
    particle_size_low = low;
    particle_size_high = high;
}

function set_aggregation_threshold(at) {
    aggregation_threshold = at;
}

function set_aggregate_fixed_only(val) {
    aggregate_fixed_only = val;
}

function stop_dla() {
    g_running = false;
}

function step_dla() {
    dla_tick();
}

function clear_dla() {
    particles = [];
    clear_canvas();
}

function clear_canvas() {
    dla_ctx.fillStyle = bg_color; //dla_canvas.style.bgColor;
    dla_ctx.fillRect(0, 0, canvas_width, canvas_height);
}

function dla_tick() {
    //alert("dla_tick. particles: " + particles.length);
    clear_canvas();
    for(var i=0; i < particles.length; i++) {
        var particle = particles[i];
        if (!particle.fixed) {
            particle.brownian_step(particle.size/2);
            check_particle_collisions(particle, i);
        }
        draw_particle(particle);
    }
    nticks++;
    if (auto_add > 0 && ((nticks % auto_add) == 0 )) {
        introduce_particle(false);
    }
}

function check_particle_collisions(particle, nth) {
    //
    // the most later particles are more likely to
    // be at the ends of aggregation chains, so if there
    // is a collision, it's likely to be with one of the fixed
    // particles at the end of the chain, so we'll gain a bit of
    // speed by counting down backwards.
    //
    for(var j=particles.length - 1; j >= 0; j--) {
        if (j != nth) {
            var candidate_particle = particles[j];
            //
            // as an optimization, ignore particles that have been grabbed onto
            // too many times.
            //
            if (candidate_particle.aggregate_count < aggregate_count_threshold) {
                if (particle.grabs(candidate_particle)) {
                    fix_particle(particle);
                    fix_particle(candidate_particle);
                    if (auto_add == -1) {
                        introduce_particle(false);
                    }
                    return;
                }
            }
        }
    }
}

function fix_particle(particle) {
    particle.fixed = true;
    particle.aggregate_count += 1;
    if (particle.aggregate_count > aggregate_count_threshold || particle.aggregate_count > num_fixed_colors) {
        particle_color = stuck_color;
    } else {
        particle.color = fixed_colors[particle.aggregate_count];
    }
}
    
function random_range(low, hi) {
    return low + (hi - low) * Math.random();
}

/* Particle class */

function Particle(x, y, size) {
    this.color = "#348";
    this.x = x;
    this.y = y;
    this.size = size;
    this.height = size;
    this.width = size;
    this.fixed = false;
    this.vx = 0;
    this.vy = 0;
    this.aggregate_count = 0;
}

Particle.prototype.grabs = function(particle) {
    if (aggregate_fixed_only && !this.fixed && !particle.fixed) {
        return false;
    }
    var size_threshold = aggregation_threshold * Math.max(this.size, particle.size);
    var dx = Math.abs(this.x - particle.x);
    var dy = Math.abs(this.y - particle.y);
    var grabbed =
    ((dx < size_threshold || dx < size_threshold) &&
     (dy < size_threshold || dy < size_threshold));
    //alert("grabs: dx: " + dx + " dy: " + dy + " this.size: " + this.size + " p.size: " + particle.size);
    return grabbed;
}

Particle.prototype.brownian_step = function(range) {
    var dvx = random_range(-range, range);
    var dvy = random_range(-range, range);
    this.vx += dvx;
    this.vy += dvy;
    
    //alert("brownian step(" + range + "). bsx: " + bstep_x + " bsy: " + bstep_y);
    this.x += this.vx;
    if (this.x < -canvas_radius_x) {
        this.x = -canvas_radius_x;
        this.vx = 1;
    }
    if (this.x > canvas_radius_x) {
        this.x = canvas_radius_x;
        this.vx = -1;
    }
    this.y += this.vy;
    if (this.y < -canvas_radius_y) {
        this.y = -canvas_radius_y;
        this.vy = 1;
    }
    if (this.y > canvas_radius_y) {
        this.y = canvas_radius_y;
        this.vy = -1;
    }
}

Particle.prototype.to_string = function() {
    return "P{" + this.x + ", " + this.y + "} <" + this.width + " x " + this.height +">" + (this.fixed ? "F" : "");
}

function s(obj) {
    return obj.to_string();
}


function on_mousedown(ev) {
    //
    // Place a seed particle at the mouse.
    //
    mousing = true;
    var wx = get_world_coordinates_x(ev);
    var wy = get_world_coordinates_y(ev);
    if (!isNaN(wx) && !isNaN(wy)) {
        seed_particle(wx, wy);
    }
}

function seed_particle(wx, wy) {
    var particle = introduce_particle_at(wx, wy, true);
    //fix_particle(particle);
}


function get_world_coordinates_x(ev) {
    var cx;
    if (ev.layerX || ev.layerX == 0) { // Firefox
        cx = ev.layerX;
    } else if (ev.offsetX || ev.offsetX == 0) { // Opera
        cx = ev.offsetX;
    }
    var wx = cx * scale - canvas_radius_x;
    return wx
}

function get_world_coordinates_y(ev) {
    var cy;
    if (ev.layerY || ev.layerY == 0) { // Firefoy
        cy = ev.layerY;
    } else if (ev.offsetY || ev.offsetY == 0) { // Opera
        cy = ev.offsetY;
    }
    var wy = canvas_radius_y - cy * scale ;
    return wy
}

function log(x) {
    //   console.log(x);
}