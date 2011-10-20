var board = null;
var ctx = null;

var board_height = 500;
var board_width = 500;

var wheel_blackboard = null;
var wheel_radius = 150;
var wheel_diameter = 2 * wheel_radius;
var wheel_x = 250;
var wheel_y = 300;

var swatches_x = 80;
var swatches_y = 80;
var swatch_width = 80;
var swatch_height = 60;
var swatch_margin_x = 10;
var swatch_margin_y = 10;


var current_value = 100;
var current_palette = null;
var palettes = [];

var scale = 1.0;

var bg_color = "#888"; //<"#111115";
var wheel_border_color = "#888";
var wheel_border_width = 12;

function load(id) {
    if (window.console == undefined) {
        console = new FakeConsole();
    }
    board = document.getElementById(id);
    ctx = board.getContext("2d");
    board.addEventListener('mousedown', on_mousedown, false);
    board.addEventListener('mousemove', on_mousemove, false);
    board.addEventListener('mouseup', on_mouseup, false);
    board.addEventListener('mouseout', on_mouseout, false);

    current_palette = new Palette(4);
    //show_tab('paint', ['evolve']);
    recapture_wheel();
    redraw_board();
}


function redraw_board() {
    clear_board();
    place_wheel(); // TODO: optimize into a data plonk

    draw_palette_hand(current_palette);
    draw_palette_colors(current_palette);
}

function clear_board() {
    ctx.fillStyle = bg_color;
    ctx.fillRect(0, 0, board_width, board_height);
}


function recapture_wheel() {
    clear_board();
    draw_wheel();
    capture_wheel();
}

function capture_wheel() {
    var wbr = (wheel_radius + wheel_border_width);
    var wx = wheel_x - wbr;
    var wy = (board_height - wheel_y) - wbr;
    wheel_blackboard = ctx.getImageData(wx, wy, 2 * wbr, 2*wbr);
}

function place_wheel() {
    var wbr = (wheel_radius + wheel_border_width);
    var wx = wheel_x - wbr;
    var wy = (board_height - wheel_y) - wbr;
    ctx.putImageData(wheel_blackboard, wx, wy);
}


function draw_wheel() {
    //clear_wheel_blackboard();
    var point_size = 1;
    var offset_x = 0;
    var offset_y = 0;
    ctx.fillStyle = wheel_border_color;
    ctx.beginPath();
    this.ctx.arc(wheel_x, (board_height - wheel_y), wheel_radius + wheel_border_width, 0, TWO_PI, false);
    ctx.closePath();
    ctx.fill();

    for(var wx = -wheel_radius; wx < wheel_radius; wx += point_size) {
        var x = wx + offset_x + wheel_x;
        for(var wy = -wheel_radius; wy < wheel_radius; wy += point_size) {
            var y = board_height - (wy + offset_y + wheel_y);
            var r = Math.sqrt(wx * wx + wy * wy);
            //log("w:[" + wx + ", " + wy + "]  C:[" + x + ", " + y + "]  rT: {" + r + ", " + "}");
            if (r < wheel_radius) {
                var theta = Math.atan2(wy, wx);
                var sat = 100 * r / wheel_radius;
                var hue = angleToHue360(theta);
                var rgb = hsvToRgb(hue, sat, current_value);
                var rgb_color = css_rgb_color(rgb);
                //log("   rt: {" + r + ", " + theta + "} => " + rgb_color);
                //log("  hsv: <" + hue + ", " + sat + ", " + current_value + ">");
                ctx.fillStyle = rgb_color;
                ctx.fillRect(x, y, point_size, point_size);
            }
        }
    }

}

function draw_palette_hand(palette) {
    for(var s = 0; s < palette.num_swatches; s++) {
        var swatch = palette.get_swatch(s);
        draw_swatch_finger(swatch);
    }
}

function draw_swatch_finger(swatch) {
    var eye_radius = 10;
    var wxy = hs_to_wheel_xy(swatch.hue, swatch.sat);
    var r = Math.sqrt(wxy[0] * wxy[0] + wxy[1] * wxy[1]);
    var stick_length =  (r - eye_radius) / r;
    var endX = wheel_x + wxy[0] * stick_length;
    var endY = board_height - (wheel_y + wxy[1] * stick_length);
    var stick_color = "#000";
    var stick_width = 1;
    if (swatch.dragging) {
        stick_color = "#FFF";
        stick_width = 2;
    }
    ctx.strokeStyle = stick_color;
    ctx.lineWidth = stick_width;
    ctx.beginPath();
    ctx.moveTo(wheel_x, (board_height - wheel_y));
    ctx.lineTo(endX, endY);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 2 * stick_width;
    this.ctx.arc((wheel_x + wxy[0]), (board_height - (wheel_y + wxy[1])), eye_radius, 0, TWO_PI, false);
    ctx.closePath();
    ctx.stroke();
    if (swatch.reference_swatch) {
        ctx.beginPath();
        ctx.lineWidth = 1.5 * stick_width;
        this.ctx.arc((wheel_x + wxy[0]), (board_height - (wheel_y + wxy[1])), .7 * eye_radius, 0, TWO_PI, false);
        ctx.closePath();
        ctx.stroke();
    }
}

function draw_palette_colors(palette) {
    for(var s = 0; s < palette.num_swatches; s++) {
        var swatch = palette.get_swatch(s);
        draw_swatch_block(s, swatch);
    }
}

function draw_swatch_block(nth, swatch) {
    var color = swatch.css_color_rgb();
    ctx.fillStyle = color;
    var sw_x = swatches_x + nth * (swatch_width + swatch_margin_x);
    var sw_y = board_height - swatches_y;
    ctx.fillRect(sw_x, sw_y, swatch_width, swatch_height);
}

function wheel_xy_to_r_theta_degrees(wx, wy) {
    var r = Math.sqrt(wx * wx + wy * wy);
    var theta = Math.atan2(wy, wx);
    var theta_deg = angleToHue360(theta);
    return [r, theta_deg];
}

function hs_to_wheel_xy(hue, sat) {
    var theta_rad = hue * DEGREES_TO_RADIANS;
    var r = sat * wheel_radius / 100.;
    var wx = r * Math.cos(theta_rad);
    var wy = r * Math.sin(theta_rad);
    return [wx, wy];
}

function set_pixel(data, width, x, y, r, g, b, a) {
    var offset = 4 * width * y + 4*x;
    //console.log("set_pixel(" + x + ", " + y + "). offset: " + offset + " data.length: " + data.length + " width*4: " + (width*4));
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
}

function css_rgb_color(rgb) {
    return "rgb(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")";
}

function css_rgba_color(rgb, a) {
    return "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", " + a + ")";
}

function angleToHue(angle) {
  if (angle > TWO_PI) {
    angle -= TWO_PI;
  } else if (angle < 0) {
    angle += TWO_PI;
  }
  return angle / TWO_PI;
}

function angleToHue360(angle_radians) {
    var hdeg = angle_radians * RADIANS_TO_DEGREES;
    if (hdeg > 360) {
        hdeg -= 360;
    } else if (hdeg < 0) {
        hdeg += 360;
    }
    return hdeg;
}

var dragging_swatch = null;
function on_mousedown(ev) {
    var wxy = canvas_to_wheel(ev);
    var sw = current_palette.point_hits_swatch(wxy[0], wxy[1], 10);
    if (sw) {
        dragging_swatch = sw;
        sw.dragging = true;
        redraw_board();
    }
}

function on_mousemove(ev) {
    if (dragging_swatch) {
        var wxy = canvas_to_wheel(ev);
        var rTheta = wheel_xy_to_r_theta_degrees(wxy[0], wxy[1]);
        var r = Math.min(rTheta[0], wheel_radius);
        var sat = 100 * r / wheel_radius;
        var hue = rTheta[1];
        if (dragging_swatch.reference_swatch) {
            current_palette.move_reference_swatch(hue, sat);
        } else {
            dragging_swatch.hue = hue;
            dragging_swatch.sat = sat;
        }
        redraw_board();
    }
}

function on_mouseup(ev) {
    if (dragging_swatch) {
        dragging_swatch.dragging = false;
        dragging_swatch = null;
        redraw_board();
    }
}

function on_mouseout(ev) {
    on_mouseup(ev);
}

function canvas_to_wheel(ev) {
    var cx, cy;
    if (ev.offsetX || ev.offsetX == 0) { // Opera
        cx = ev.offsetX;
        cy = ev.offsetY;
    } else if (ev.layerX || ev.layerX == 0) { // Firefox
        cx = ev.layerX;
        cy = ev.layerY;
    }
    var wx = (cx - wheel_x) * scale;
    var wy = ((board_height - cy) - wheel_y) * scale;
    //console.log("getWorldX. cx: " + cx + " wx: " + wx);
    return [wx, wy];
}

