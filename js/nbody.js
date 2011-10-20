var g_running = false;
var ctx;
var nb_canvas;
var canvas_height;
var canvas_width;
var canvas_radius_x;
var canvas_radius_y;
var canvas_origin_x;
var canvas_origin_y;
var bg_color = "#000"; // "#d0e0f1";

var bodies = [];
var forces = [];
var nticks = 0;
var mass_min;
var mass_max;
var min_world_size;
var trails = 0.;

var BOUNDARY_TYPE_NONE = 0;
var BOUNDARY_TYPE_SPM = 1;
var BOUNDARY_TYPE_TORUS = 2;

//
// settings
var delta_t = 500; // units???
var G = 6.673E-11; // m^3/(kg s^2)
var g_step_time = 60;  // ms
var auto_add = -1;
var body_size_low = 1;
var body_size_high = 5;
var TWO_PI = Math.PI * 2;
var DEGREES_TO_RADIANS = Math.PI / 180.
var universe_radius = 50000;
var scale;
var scale_reciprocal;
var coefficient_of_elasticity = .999;
var boundary = BOUNDARY_TYPE_SPM;
var friction = 1.0;
var collision_detection = false;
var mousing = false;
var dragging_body = null;

//
// Some worlds
//
var g_worlds_json = {
    'test' : [
              [ 10000, 0, 1.2E14, 0, 0, "#a55"],
              [ 0, 10000, 1.2E14, 0, 0, "#5a5"],
              [-10000, 0, 1.2E14, 0, 0, "#55a"],
              [10000, -10000, 2.4E14, 0, 0, "#959"]
              ],
    'fourbit' : [
              [ 10000, 0, 4.2E14, 0, -2, "#a55"],
              [ 0, 10000, 4.2E14, 2, 0, "#5a5"],
              [-10000, 0, 4.2E14, 0, 2, "#55a"],
              [0, -10000, 4.2E14, -2, 0, "#959"]
                 ],
    'one_moon' : [
              [0, 0, 6.2E16, 0, 0, "#a55"],
              [16000, 16000, 6.2E14, 10.2, -10.2, "#5a5"]
                  ],
    'ringworld' : [
                   [28000,   0, 6.2E14, 2.87,  90, "#a55", "polar"],
                   [28000,  30, 6.2E14, 2.87, 120, "#a55", "polar"],
                   [28000,  60, 6.2E14, 2.87, 150, "#a55", "polar"],
                   [28000,  90, 6.2E14, 2.87, 180, "#5a5", "polar"],
                   [28000, 120, 6.2E14, 2.87, 210, "#5a5", "polar"],
                   [28000, 150, 6.2E14, 2.87, 240, "#5a5", "polar"],
                   [28000, 180, 6.2E14, 2.87, 270, "#55a", "polar"],
                   [28000, 210, 6.2E14, 2.87, 300, "#55a", "polar"],
                   [28000, 240, 6.2E14, 2.87, 330, "#55a", "polar"],
                   [28000, 270, 6.2E14, 2.87, 360, "#a5a", "polar"],
                   [28000, 300, 6.2E14, 2.87, 390, "#a5a", "polar"],
                   [28000, 330, 6.2E14, 2.87, 420, "#a5a", "polar"],
                 ],
    'big_crunch' : [
                   [ 0, 0, 4.3E15, 0, 0, "#112"],
                   [32000,   0, 6.2E14, 3.1415,  90, "#a55", "polar"],
                   [32000,  30, 6.2E14, 3.1415, 120, "#a55", "polar"],
                   [32000,  60, 6.2E14, 3.1415, 150, "#a55", "polar"],
                   [32000,  90, 6.2E14, 3.1415, 180, "#5a5", "polar"],
                   [32000, 120, 6.2E14, 3.1415, 210, "#5a5", "polar"],
                   [32000, 150, 6.2E14, 3.1415, 240, "#5a5", "polar"],
                   [32000, 180, 6.2E14, 3.1415, 270, "#55a", "polar"],
                   [32000, 210, 6.2E14, 3.1415, 300, "#55a", "polar"],
                   [32000, 240, 6.2E14, 3.1415, 330, "#55a", "polar"],
                   [32000, 270, 6.2E14, 3.1415, 360, "#a5a", "polar"],
                   [32000, 300, 6.2E14, 3.1415, 390, "#a5a", "polar"],
                   [32000, 330, 6.2E14, 3.1415, 420, "#a5a", "polar"],
                 ],
};
                   
function load(nb_id) {
  nb_canvas = document.getElementById(nb_id);
  ctx = nb_canvas.getContext("2d");
  nb_canvas.addEventListener('mousedown', on_mousedown, false);
  nb_canvas.addEventListener('mouseup', on_mouseup, false);
  nb_canvas.addEventListener('mousemove', on_mousemove, false);
  nb_canvas.addEventListener('mouseout', on_mouseout, false);
  canvas_height = 450.;
  canvas_width  = 450.;
  canvas_radius_x = canvas_width / 2.;
  canvas_radius_y = canvas_height / 2.;
  canvas_origin_x = canvas_width / 2.;
  canvas_origin_y = canvas_height / 2.;
  scale = universe_radius / canvas_radius_x;
  scale_reciprocal = canvas_radius_x / universe_radius;
  body_min_radius = 10.0 * scale; // world coordinates for 10 pixels.
  clear();
  read_world('fourbit');
  nticks = 0;
  g_running = false;
  draw_bodies();
  start_loop();
}

function log(msg) {
    console.log(msg);
}
function read_world(world_name) {
    // TODO: turn world_name into a URI to find a body file,
    //       read it in, interpret as JSON, unpack it.
    clear();
    var world_json = g_worlds_json[world_name];
    unpack_bodies(world_json);
    draw_bodies();
}

function unpack_bodies(json_struct) {
    // json struct structure:
    //  [ [  x, y, mass, vx, vy, color],
    //    ...
    //  ]
    var x = 0;
    var y = 1;
    var mass = 2;
    var vx = 3;
    var vy = 4;
    var color = 5;
    var polar = 6;
    var r = 0;
    var theta = 1;
    var vr = 3;
    var vtheta = 4;
    
    mass_min = -1;
    mass_max = 0;
    for(var i=0; i < json_struct.length; i++) {
        var body_spec = json_struct[i];
        log(" unpacking body spec[" + i + " / " + json_struct.length + "]: [" + body_spec + "]");
        var position, velocity;
        if (body_spec.length > 6 && body_spec[polar] == 'polar') {
            position = new Vector(0, 0);
            position.set_polar(body_spec[r], body_spec[theta]);
            velocity = new Vector(0, 0);
            velocity.set_polar(body_spec[vr], body_spec[vtheta]);
        } else {
            position = new Vector(body_spec[x], body_spec[y]);
            velocity = new Vector(body_spec[vx], body_spec[vy]);
        }
        var body = new Body(position, 
                            velocity,
                            body_spec[mass]);
        body.color = body_spec[color];
        body.highlight_color = "#FFF"; // "#FE4";  // how to derive from the body color?
        add_body(body);
        if (mass_min == -1 || body.mass < mass_min) {
            mass_min = body.mass;
        }
        if (body.mass > mass_max) {
            mass_max = body.mass;
        }
        log("unpacked[" + i + "] P:(" + body.position.x + ", " + body.position.y + ") V: (" + body.velocity.x + ", " + body.velocity.y + ")");
    }
    
    //
    // reset the bodies' radii as a second pass, now that we know the min & max masses.
    //
    // 1. find the density that makes the smallest-mass body the right size
    //    for the body_min_radius (in world coordinates)
    //       density = V/m; V = dm
    //       V = 4/3 PI r^3
    //       dm = 4/3 PI r^3
    //     The density coefficient:
    //       d =  4/3 PI (body_min_radius)^3/mass_min,
    //
    //     But we can pre-compute much of that:
    //       r = cuberoot((3/4)* d * mass/PI), or r = cuberoot(d' * mass)
    //       where
    //         d' = (3d/4PI) = (body_min_radius)^3/mass_min
    //       
    body_density_coefficient = body_min_radius * body_min_radius * body_min_radius / mass_min;
    for(var i=0; i < bodies.length; i++) {
        bodies[i].reset_size();
    }
}

function add_body(body) {
    bodies.push(body);
    forces.push(new Vector(0, 0));
}

function draw_body(body) {
    if (body.highlighted > 0) {
        draw_body_highlighted(body);
        body.highlighted -= 1;
    } else {
        ctx.beginPath();
        // can we do the scale in the canvas?
        var sx = body.position.x * scale_reciprocal + canvas_origin_x;
        var sy = -body.position.y * scale_reciprocal + canvas_origin_y;
        var sradius = body.radius * scale_reciprocal;
        //log("draw. [" + sx + ", " + sy + "] x " + sradius);
        //log(" scale: " + scale + " 1/sc: " + scale_reciprocal);
        ctx.arc(sx, sy, sradius, 0, TWO_PI, false);
        ctx.closePath();
        ctx.strokeStyle = body.color;
        ctx.stroke();
    }
}

function draw_body_highlighted(body) {
    var sx = body.position.x * scale_reciprocal  + canvas_origin_x;
    var sy = -body.position.y * scale_reciprocal  + canvas_origin_y;
    var sradius = body.radius * scale_reciprocal;
    ctx.beginPath();
    ctx.arc(sx, sy, sradius, 0, TWO_PI, false);
    ctx.closePath();
    ctx.fillStyle = body.color; //body.highlight_color;
    ctx.fill();
    /*
    ctx.fillStyle = body.color; //body.highlight_color;
    ctx.fillRect(sx-sradius, sy-sradius, 2*sradius,2*sradius);
    */
    log("draw highlighted. P:" + sv(body.position) + " [" + sx + ", " + sy + "] r: " + sradius);
}

function introduce_body() {
    /* not yet...
    var px = random_range(-canvas_radius_x, canvas_radius_x);
    var py = random_range(-canvas_radius_y, canvas_radius_y);
    var mass = random_range(mass_range_low, mass_range_high);
    var px = random_range(-canvas_radius_x, canvas_radius_x);
    var py = random_range(-canvas_radius_y, canvas_radius_y);
    //var size = 20;
    var body = new Body(px, py, mass, vx, vy);
    bodies.push(body);
    draw_body(body);
    */
}


function set_friction(val) {
    friction = val;
}

function set_step_time(st) {
    g_step_time = st;
}

function set_delta_t(val) {
    delta_t = val;
}

function set_boundary(type) {
    boundary = type;
}

function set_body_size_range(low, high) {
    body_size_low = low;
    body_size_high = high;
}

function set_collision_threshold(val) {
    collision_threshold = val;
}

function set_trails(val) {
    trails = val;
}

function start_loop() {
    g_running = true;
    log("start_loop");
    nticks = 0;
    step_and_continue();
}

function step_and_continue() {
    tick();
    if (g_running) {
        window.setTimeout('step_and_continue()', g_step_time);
    }
}

function stop() {
    g_running = false;
}

function reset() {
    stop();
    for(var i=0; i < bodies.length; i++) {
        bodies[i].reset();
    }
    draw_bodies();
}

function onestep() {
    tick();
}

function clear() {
    bodies = [];
    forces = [];
    clear_canvas();
}

function clear_canvas() {
    ctx.fillStyle = bg_color; //dla_canvas.style.bgColor;
    ctx.fillRect(0, 0, canvas_width, canvas_height);
}

function clear_canvas_for_trails(alpha) {
    var alpha_keep = ctx.globalAlpha;
    ctx.globalAlpha = alpha;
    clear_canvas();
    ctx.globalAlpha = alpha_keep;
}    

var trailsImageData = null;
function copy_trails_image() {
    trailsImageData = ctx.getImageData(0,0, canvas_width, canvas_height)
}

function paste_trails_image(alpha) {
    var alpha_keep = ctx.globalAlpha;
    //ctx.globalAlpha = alpha;
    var nd = adjust_alpha(trailsImageData, alpha);
    ctx.putImageData(nd, 0, 0);
    //ctx.globalAlpha = alpha_keep;
    trailsImageData = null;
}

function adjust_alpha(image_data, alpha) {
   var image_data_data = image_data.data;
   for(var i = 0; i < image_data_data.length; i+= 4 ) {
       image_data_data[i+3] = 255.*alpha;
   }
   return image_data;
}

function tick() {
    //log("tick[" + nticks + "]. bodies: " + bodies.length);
    if (trails == 0) {
        clear_canvas();
    } else if (trails == -1) {
        // don't clear...
    } else {
        //copy_trails_image();
        clear_canvas_for_trails(trails);
        //paste_trails_image(trails);
    }
        
    for(var i=0; i < bodies.length; i++) {
        forces[i].zero();
    }
    for(var i=0; i < bodies.length; i++) {
        var body_i = bodies[i];
        update_body_forces(body_i, i);
    }
    for(var i=0; i < bodies.length; i++) {
        var body_i = bodies[i];
        move_body(body_i, i);
        draw_body(body_i);
    }
    nticks++;
}

function draw_bodies() {
    clear_canvas();
    for(var i=0; i < bodies.length; i++) {
        draw_body(bodies[i]);
    }

}

var Pji = new Vector(0, 0);
function update_body_forces(body_i, i) {
    var g_body_i_mass = G * body_i.mass;
    var v_i_mag_ce = body_i.velocity.magnitude() * coefficient_of_elasticity;
    //log("UpdateFORCE[" + i + "].  forces[i]: " + sv(forces[i]));
    for(var j=i+1; j < bodies.length; j++) {
        var body_j = bodies[j];
        // F = G MiMj u{Bj.pos - Bi.pos}  (the pull from j to i)
        //     ------------------------
        //            r * r
        //      where u{vec} is the unit vector, and r is |Bj - Bi|
        //      Now we know that (V1-V2) == u{V1-V2} * |V1 - V2}
        //      so we can save a division here by rewriting this:
        //  Fji = G MiMj (Bj.pos - Bi.pos) / r*r*r
        //  Then the force is symmetric between i & j, so we have:
        //    F[i] += Fji
        //    F[j] -= Fji (or maybe that's vice-versa). We'll see.
        //    And then we only have to run the above equation n(n-1)/2 times.
        //  We do need to allocate a position difference vector for (Bj-Bi),
        //  but we can re-use the same vector over & over.
        Pji.zero();
        Pji.plus_equals(body_j.position);
        Pji.minus_equals(body_i.position);
        var r = Pji.magnitude();
        //log("   j: " + j + " :: Pji"+sv(Pji) + " r: " + r);
        //
        // if r is "too small," this means that they've collided,
        // and we don't want to calculate the force between them,
        // because the inverse square law will be too big.
        // However, we do want to make them "bounce."
        //   I propose the following:
        //    * leave this pair out of the attractions on i&j
        //    * subtract the unit vector Pji * |velocity vector| from
        //      each body's velocity vector, mitigated by an
        //      elastic coefficient, e.g. "
        //        Vi -= Pji * |Vi| * cEi
        //        Vj -= Pji * |Vj| * cEj
        //    ** unfortunately, this doesn't take into account the
        //       physics of the transfer of momentum. Someday, I guess,
        //       I'll go look that up.
        //       I think what we'd do is calculate the force imparted by
        //       the collision (given conservation of momentum),
        //       and add that in to the force vector rather than dealing
        //       with the velocities directly here.
        if (collision_detection && r <= (body_i.radius + body_j.radius)) {
            log("COLLISION!")
                handle_collision(body_i, v_i_mag_ce, body_j, Pji);
            body_i.highlight = 10;
            body_j.highlight = 10;
        } else {
            var f = g_body_i_mass * body_j.mass / (r * r * r);
            Pji.times_equals(f);
            forces[i].plus_equals(Pji);
            forces[j].minus_equals(Pji);
        }
    }
}

function move_body(body, i) {
    // F = mA; A = dV/dt; V = dP/dt
    //   A = F/m  (vector)
    //   V1 = V0 + A * delta_t :: V = V + F * (dt/m)
    //   P1 = P0 + V * delta_t
    //   Note that the body's mass and delta_t are known at body creation time,
    //   so we can store (1/m)*delta_t in the body.
    //     var Ai = forces[i].times_equals(body.mass_reciprocal_dt);
    //log("move_body[" + i + "] B4. forces: {" + forces[i].x + ", " + forces[i].y + "} P:(" + body.position.x + ", " + body.position.y + ") V: (" + body.velocity.x + ", " + body.velocity.y + ")");
    body.velocity.plus_factor_equals(forces[i], body.mass_reciprocal_dt);
    body.position.plus_factor_equals(body.velocity, delta_t);
    body.velocity.times_equals(friction);
    //log("move_body[" + i + "] P:(" + body.position.x + ", " + body.position.y + ") V: (" + body.velocity.x + ", " + body.velocity.y + ")");
    maybe_bounce(body);
}

function maybe_bounce(body) {
    if (boundary == BOUNDARY_TYPE_SPM) {
        if (Math.abs(body.position.x) > universe_radius) {
            body.velocity.x *= -1.;
        }
        if (Math.abs(body.position.y) > universe_radius) {
            body.velocity.y *= -1.;
        }
    } else if (boundary == BOUNDARY_TYPE_TORUS) {
        if (Math.abs(body.position.x) > universe_radius) {
            body.position.x *= -1.;
        }
        if (Math.abs(body.position.y) > universe_radius) {
            body.position.y *= -1.;
        }
    }
}

function handle_collision(body_i, v_i_mag_ce, body_j, Pji) {
    // a bit tricky to do this without allocating an extra vector.
    // so we'll unpack the first equation, and let the second stand as
    // a vector equation (since the vector equation is destructive)
    //        Vi -= Pji * |Vi| * cEi
    //        Vj -= Pji * |Vj| * cEj
    body_i.velocity.set(body_i.velocity.x - Pji.x * v_i_mag_ce,
                        body_i.velocity.y - Pji.y * v_i_mag_ce);
    var v_j_mag_ce = body_j.velocity.magnitude() * coefficient_of_elasticity;
    Pji.times_equals(v_j_mag_ce);
    body_j.velocity.minus_equals(Pji);
}

    
function random_range(low, hi) {
    return low + (hi - low) * Math.random();
}

/* Body class */

function body_mass_to_size(body, mass) {
    var radius = Math.pow(body_density_coefficient * mass, (1.0/3.0));
    return radius;
}        

function Body(pos, vel, mass) {
    this.color = "#348";
    this.highlight_color = "#FFF"; //"#8AD";
    this.position = pos;
    this.velocity = vel;
    this.mass = mass;
    this.mass_reciprocal_dt = (delta_t / mass);
    this.radius = body_min_radius;
    this.original_spec = [pos.x, pos.y, vel.x, vel.y];
    this.highlighted = 0;
}

Body.prototype.reset_size = function() {
    this.radius = body_mass_to_size(this, this.mass);
}
    
Body.prototype.reset = function() {
    this.position.x = this.original_spec[0];
    this.position.y = this.original_spec[1];
    this.velocity.x = this.original_spec[2];
    this.velocity.y = this.original_spec[3];
}

Body.prototype.point_inside = function(point) {
    // TODO: use the actual distance.
    //     For now: within the bounding box...
    var dx = Math.abs(this.position.x - point.x);
    var dy = Math.abs(this.position.y - point.y);
    return (dx <= this.radius && dy <= this.radius);
}

Body.prototype.move_to_point = function(point) {
    this.position.x = point.x;
    this.position.y = point.y;
}
    
Body.prototype.collides_with = function(body) {
    var size_threshold = collision_threshold * Math.max(this.size, body.size);
    var dx = Math.abs(this.x - body.x);
    var dy = Math.abs(this.y - body.y);
    var grabbed =
    ((dx < size_threshold || dx < size_threshold) &&
     (dy < size_threshold || dy < size_threshold));
    //alert("grabs: dx: " + dx + " dy: " + dy + " this.size: " + this.size + " p.size: " + body.size);
    return grabbed;
}

Body.prototype.brownian_step = function(range) {
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

function Vector(x, y) {
    this.x = x;
    this.y = y;
}

Vector.prototype.zero = function() {
    this.x = 0;
    this.y = 0;
}

    
Vector.prototype.set = function(x, y) {
    this.x = x;
    this.y = y;
}

Vector.prototype.set_to = function(vec) {
    this.x = vec.x;
    this.y = vec.y;
}

Vector.prototype.set_polar = function(r, theta_degrees) {
    var theta_radians = theta_degrees * DEGREES_TO_RADIANS;
    var x = r * Math.cos(theta_radians);
    var y = r * Math.sin(theta_radians);
    log("set_polar. r: " + r + " th: " + theta_degrees + " theta_rad: " + theta_radians + " x: " + x + " y: " + y);
    this.set(x, y);
}
        
Vector.prototype.plus_equals = function(vec) {
    this.x += vec.x;
    this.y += vec.y;
    return this;
}

// this += V * factor;
Vector.prototype.plus_factor_equals = function(vec, factor) {
    this.x += vec.x * factor;
    this.y += vec.y * factor;
    return this;
}

Vector.prototype.minus_equals = function(vec) {
    this.x -= vec.x;
    this.y -= vec.y;
    return this;
}

Vector.prototype.times_equals = function(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
}

Vector.prototype.magnitude = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
}

Vector.prototype.plus = function(vec) {
    return new Vector(this.x + vec.x, this.y + vec.y);
}

Vector.prototype.minus = function(vec) {
    return new Vector(this.x - vec.x, this.y - vec.y);
}

Vector.prototype.times = function(scalar) {
    return new Vector(this.x * scalar, this.y * scalar);
}

Vector.prototype.to_string = function() {
    return "{" + this.x + ", " + this.y + "}";
}

function sv(vector) {
    return vector.to_string();
}

//
//   Mouse Event handling
//

function get_world_coordinates(ev) {
    var cx, cy;
    if (ev.layerX || ev.layerX == 0) { // Firefox
        cx = ev.layerX;
        cy = ev.layerY;
    } else if (ev.offsetX || ev.offsetX == 0) { // Opera
        cx = ev.offsetX;
        cy = ev.offsetY;
    }
    var wx = cx * scale - universe_radius;
    var wy = universe_radius - cy * scale;
    log("getWorld C: (" + cx + ", " + cy + ") ==> W:  (" + wx + ", " + wy + ")");
    return new Vector(wx, wy);
}

function on_mousedown(ev) {
    mousing = true;
    var worldmouse = get_world_coordinates(ev);
    for(var i=0; i < bodies.length; i++) {
        var body = bodies[i];
        if (body.point_inside(worldmouse)) {
            body.highlighted = 10;
            dragging_body = body;
            if (g_running) {
                fling_setup(dragging_body, worldmouse);
            } else {
                draw_bodies();
            }
            return;
        }
    }
}

function on_mouseup(ev) {
    if (mousing && g_running) {
        fling_finish(dragging_body);
    }
    mousing = false;
    dragging_body = null;
}

function on_mouseout(ev) {
    mousing = false;
    dragging_body = null;
    cancel_fling();
}

function on_mousemove(ev) {
    if (mousing) {
        var worldmouse = get_world_coordinates(ev);
        // Drag the body around if stopped,
        // fling the body if running.
        if (dragging_body) {
            if (g_running) {
                dragging_body.move_to_point(worldmouse);
                dragging_body.highlighted = 10;
                fling_drag(dragging_body, worldmouse);
            } else {
                dragging_body.move_to_point(worldmouse);
                dragging_body.highlighted = 10;
                draw_bodies();
            }
        }
    }
}

var fling_points = [];
function fling_setup(body, worldpoint) {
    fling_points = [];
}

function fling_drag(body, worldpoint) {
    worldpoint.timestamp = new Date().getTime();
    // TODO: we could optimize this by making a circular buffer of fling points,
    //       but this is just a little javascript demo, so we'll leave that as
    //       an exercise for the reader. 
    fling_points.push(worldpoint);
}

function cancel_fling() {
    fling_points = [];
}

function fling_finish(body) {
    //
    // find the sum of the last n worldpoints (excluding the last two)
    //   (we can get the sum by just taking the vector from the first to
    //    last)
    // then use that to determine the new velocity of the body.
    //    Tworld        Treal
    //    ------   =   -------
    //    delta_t      g_step_time
    //
    //    Tworld = (Treal * delta_t) / g_step_time
    //    V = DragVector / Tworld;
    //
    var fling_window = 5;
    var fling_ignore = 2;
    if (fling_points.length < fling_window + fling_ignore) {
        return;
    }
    var interval_start = fling_points.length - fling_window - fling_ignore;
    var start_point = fling_points[interval_start];
    var interval_end = fling_points.length - fling_ignore - 1;
    var end_point = fling_points[interval_end];
    var interval_time_real = (end_point.timestamp - start_point.timestamp)/1000.0;  // seconds
    var drag_vector = end_point.minus_equals(start_point);
    //log("FF: sp: " + sv(start_point) + " ep: " + sv(end_point) + " dv: " + sv(drag_vector));
    var t_world = interval_time_real * delta_t / (g_step_time / 1000.);
    //log("FF: drag_vector: " + sv(drag_vector) + " Treal: " + interval_time_real + " Tworld: " + t_world);
    body.velocity.set_to(drag_vector.times_equals(1.0 / t_world));
    //log("FF: body.velocify(AFTER): " + sv(body.velocity));
    fling_points = [];
}