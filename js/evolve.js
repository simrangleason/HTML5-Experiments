var canvas_parent = null;
var ctx_parent = null;
var blackboard; // holder imagedata
var canvas_children = null; //[][];
var ctx_children = null; // ?? how to declare 2d array?[][];
var xforms = null;
var nchildren = 4;

var parent_canvas_height = 300;
var parent_canvas_width = 300;
var offset_x = 0; //-335;
var offset_y = 0; //-268;
var firefox = false;

var child_canvas_height = 150;
var child_canvas_width = 150;

var paint_colors = [16, 64, 25];
var paint_alpha = .8;
var brush_size = 10;
var painting = true;
var mousing = false;

var scale = 1.0;

function load(parent_canvas_id) {
    log("BD: " + BrowserDetect.browser);
    if (BrowserDetect.browser == "Firefox") {
        firefox = true;
        offset_x = -346;
        offset_y = -256;
    }

    if (window.console == undefined) {
        console = new FakeConsole();
    }
    canvas_parent = document.getElementById(parent_canvas_id);
    ctx_parent = canvas_parent.getContext("2d");
    canvas_parent.addEventListener('mousedown', on_mousedown, false);
    canvas_parent.addEventListener('mousemove', on_mousemove, false);
    canvas_parent.addEventListener('mouseup', on_mouseup, false);
    canvas_parent.addEventListener('mouseout', on_mouseout, false);

    blackboard =
        ctx_parent.createImageData(parent_canvas_height, parent_canvas_width);
    
    canvas_children = new Array();
    ctx_children = new Array();
    xforms = new Array();
    for(var i=0; i < nchildren; i++) {
        canvas_children[i] = new Array(nchildren);
        ctx_children[i] = new Array(nchildren);
        xforms[i] = new Array(nchildren);
        for(var j=0; j < nchildren; j++) {
            var chid = child_id(i, j);
            var child_canvas = document.getElementById(chid);
            if (child_canvas) {
                child_canvas.i = i;
                child_canvas.j = j;
                child_canvas.addEventListener('mousedown', child_mousedown, false);

                canvas_children[i][j] = child_canvas;
                ctx_children[i][j] = child_canvas.getContext("2d");
                //xforms[i][j] = new MatrixXForm(i, j, 2);
                xforms[i][j] = new SlurpXForm(i, j, 8, parent_canvas_width/8.);
            } else {
                canvas_children[i][j] = null;
                ctx_children[i][j] = null;
                xforms[i][j] = null;
            }
        }
    }

    show_tab('paint', ['evolve']);
    setup_palette();
    fill_palette();
    fill_value_slider();
    set_paint_colors(paint_colors);
}

function set_paint_colors(colors) {
    paint_color = rgba(colors[0], colors[1], colors[2], 255);
    set_brush_colors(paint_color);
}

function change_paint_color_value(new_value) {
    var max = Math.max(paint_colors[0], Math.max(paint_colors[1], paint_colors[2]));

    if (max == 0) {
        paint_colors[0] = paint_colors[1] = paint_colors[2] = 0;
    } else {
        var adjust = max / 255.;
        var r1 = paint_colors[0] / max;
        var g1 = paint_colors[1] / max;
        var b1 = paint_colors[2] / max;
        paint_colors[0] = Math.floor(r1 * new_value);
        paint_colors[1] = Math.floor(g1 * new_value);
        paint_colors[2] = Math.floor(b1 * new_value);
    }
    set_paint_colors(paint_colors);
}

var palette_width = 255.;
var palette_height = 255.;
var palette_value = 200;
var ctx_palette;
var palette_canvas;
var ctx_value;
var value_canvas;
var value_slider_height = 20;
function setup_palette() {
    palette_canvas = document.getElementById('palette');
    palette_canvas.addEventListener('mousedown', palette_mousedown, false);
    palette_canvas.addEventListener('mousemove', palette_mousemove, false);
    palette_canvas.addEventListener('mouseup', palette_mouseup, false);
    palette_canvas.addEventListener('mouseout', palette_mouseout, false);

    ctx_palette = palette_canvas.getContext("2d");

    value_canvas = document.getElementById('value_slider');
    ctx_value = value_canvas.getContext("2d");
    value_canvas.addEventListener('mousedown', value_mousedown, false);
    value_canvas.addEventListener('mousemove', value_mousemove, false);
    value_canvas.addEventListener('mouseup', value_mouseup, false);
    value_canvas.addEventListener('mouseout', value_mouseout, false);
}

function FakeConsole() {
   this.fake = "yes";
}

FakeConsole.prototype.log = function(foo) {
    // ignore foo
}

var palette_darkosity = .9;

function fill_palette() {
    palette_darkosity = (palette_value / 255.);
    ctx_palette.fillStyle = "#000";
    ctx_palette.fillRect(0, 0, palette_width, palette_width);
    for(var i=0; i < palette_width; i++) {
        for (var j=0; j < palette_height; j++) {
            var r = Math.floor(palette_darkosity * 255. * (i / palette_width));
            var g = Math.floor(palette_darkosity * 255. * (j / palette_width));
            var b = Math.floor(palette_darkosity * 255. * (palette_width - i) / palette_width);
            var color = rgba(r, g, b, 1);
            /*
            if (i < 10 && j < 10) {
                console.log("fillStyle(" + i + ", " + j + "): " + color);
            }
            */
            ctx_palette.fillStyle = color;
            ctx_palette.fillRect(i, j, 1, 1);
        }
    }
}

function fill_value_slider() {
    ctx_value.fillStyle="#FFF";
    ctx_value.fillRect(0, 0, palette_width, value_slider_height);
    
    for(var i=0; i < 255; i++) {
        var color = rgba(i, i, i, 1);
        ctx_value.fillStyle = color;
        ctx_value.fillRect(i, 2, 1, value_slider_height-4);
    }
    ctx_value.fillStyle="#a00";
    ctx_value.fillRect(palette_value, 0, 2, 2);
    ctx_value.fillRect(palette_value, value_slider_height-2, 2, 2);
}

function rgba(r, g, b, a) {
    return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
}

var dragging_palette = false;
function palette_mousemove(ev) {
    if (dragging_palette) {
        choose_palette_color(ev);
    }
}

function palette_mousedown(ev) {
    dragging_palette = true;
    choose_palette_color(ev);
}

function palette_mouseup(ev) {
    dragging_palette = false;
}

function palette_mouseout(ev) {
    dragging_palette = false;
}

var dragging_value = false;
function value_mousemove(ev) {
    if (dragging_value) {
        choose_palette_value(ev);
    }
}

function value_mousedown(ev) {
    dragging_value = true;
    choose_palette_value(ev);
}

function value_mouseup(ev) {
    dragging_value = false;
    fill_palette();
}

function value_mouseout(ev) {
    //dragging_value = false;
}


function choose_palette_value(ev) {
    var value_slider_canvas = document.getElementById('value_slider');
    var ctx_palette = palette_canvas.getContext("2d");
    var palette_width = 255;
    var palette_height = 255;
    var paletteImageData= ctx_palette.getImageData(0, 0, palette_width, palette_height);
    var xy = get_palette_coordinates(ev);
    var new_val = xy[0];
    palette_value = new_val;
    fill_value_slider();
    console.log("VAL. new:val: " + new_val);
    change_paint_color_value(new_val);
 }

function choose_palette_color(ev) {
    var palette_canvas = document.getElementById('palette');
    var ctx_palette = palette_canvas.getContext("2d");
    var palette_width = 255;
    var palette_height = 255;
    var paletteImageData= ctx_palette.getImageData(0, 0, palette_width, palette_height);
    var xy = get_palette_coordinates(ev);
    var pixel = get_pixel(paletteImageData, xy[0], xy[1]);
    //console.log(" palXY: " + xy + " pixel: " + pixel);
    var color = rgba(pixel[0], pixel[1], pixel[2], pixel[3]);
    paint_colors[0] = pixel[0];
    paint_colors[1] = pixel[1];
    paint_colors[2] = pixel[2];
    paint_color = color;
    set_paint_colors(paint_colors);
}

function eyedropper_mousedown(ev) {
    var x = get_world_coordinates_x(ev);
    var y = get_world_coordinates_y(ev);
    var parentImageData =
        ctx_parent.getImageData(0, 0, parent_canvas_width, parent_canvas_height);
    var pixel = get_pixel(parentImageData, x, y);
    var color = rgba(pixel[0], pixel[1], pixel[2], pixel[3]);
    paint_color = color;
    set_brush_colors(paint_color);
}


function child_id(i, j) {
    return "child_" + i + "_" + j;
}

function set_paint_alpha(alpha) {
  paint_alpha = alpha;
}

var brush_sizes = [2, 5, 10, 20];
function set_brush_size(val) {
    brush_size = val;
    for(var i=0; i < brush_sizes.length; i++) {
        var brush_elt = document.getElementById("brush_holder_" + brush_sizes[i]);
        if (brush_elt) {
            if (brush_sizes[i] == val) {
                brush_elt.setAttribute("class", "brush_holder_selected");
            } else {
                brush_elt.setAttribute("class", "brush_holder");
            }
        }
    }
}

function set_brush_colors(color) {
    for(var i=0; i < brush_sizes.length; i++) {
        var brush_elt = document.getElementById("brush_" + brush_sizes[i]);
        if (brush_elt) {
            brush_elt.style.backgroundColor = color;
        }
    }
}

function clearBlackboard() {
    for(var x=0; x < parent_canvas_width; x++) {
        for(var y=0; y < parent_canvas_height; y++) {
            set_pixel(blackboard.data, blackboard.width, x, y, 0, 0, 0, 0);
        }
    }
}

function set_mode(mode) {
    console.log("set mode: " + mode);
    if (mode == 'evolve') {
        painting = false;
        evolve_one_round();
    } else if (mode == 'paint') {
        painting = true;
    } else {
        console.log("set_mode (huh?): " + mode);
    }
}

function evolve_one_round() {
    var processing_div = document.getElementById("processing");
    processing_div.style.visibility = "visible";
    console.log("evolve one round");
    window.setTimeout('evolve_one_round1()', 1);
}

function evolve_one_round1(processing_div) {
    console.log("evolve one round1");
    for(var i=0; i < nchildren; i++) {
        for(var j=0; j < nchildren; j++) {
            xform_parent_to_child(i, j);
        }
    }
    var processing_div = document.getElementById("processing");
    processing_div.style.visibility = "hidden";
}
 
function xform_parent_to_child(i, j) {
    var child_xform = xforms[i][j];
    if (child_xform != null) {
        xform_parent_to_blackboard(child_xform);
        place_blackboard_on_child(i, j);
    }
}

function xform_parent_to_parent(i, j) {
    console.log("XFORM parent to parent. xform#[" + i + ", " + j + "]");
    var child_xform = xforms[i][j];
    if (child_xform != null) {
        xform_parent_to_blackboard(child_xform);
        for(var x=0; x < 25; x++) {
            for(var y=0; y < 25; y++) {
                var bpx = get_pixel(blackboard, x, y);
                //console.log(" bpx[" + x + ", " + y + "] = {" + bpx + "}");
            }
        }
            
        place_blackboard_on_parent();
    }
}

function xform_parent_to_blackboard(xform) {
    var parentImageData = ctx_parent.getImageData(0, 0, parent_canvas_width, parent_canvas_height);
    var bb_data = blackboard.data;
    var bb_w = blackboard.width;
    for(var x=0; x < parent_canvas_width; x++) {
        for(var y=0; y < parent_canvas_height; y++) {
            var px = xform.xform_pixel(parentImageData, x, y);
            /*
            if (x < 10 && y < 10) {
                console.log("XF[" + x + " , " + y + "] => {" + px + "}");
            }
            */
            set_pixel(bb_data, bb_w, x, y, px[0], px[1], px[2], px[3]);
        }
    }
}

function place_blackboard_on_child(i, j) {
    var ctx_child = ctx_children[i][j];
    ctx_child.fillStyle = "#000";
    ctx_child.fillRect(0, 0, child_canvas_width, child_canvas_height);
    console.log("Place BB on child(" + i + ", " + j + "). ctx_child: " + ctx_child);
    var childImageData = ctx_child.getImageData(0, 0, child_canvas_width, child_canvas_height);
    interpolate_data_to_child(blackboard, childImageData, ctx_child);
    console.log("placed.");
}
    
function place_blackboard_on_parent() {
    ctx_parent.putImageData(blackboard, 0, 0);
}

function test_copy_all() {
    for(var i=0; i < nchildren; i++) {
        for(var j=0; j < nchildren; j++) {
            var ctx_child = ctx_children[i][j];
            if (ctx_child) {
                copy_child_pixels(ctx_child);
            }
        }
    }
}

function test_copy_child(i, j) {
    var ctx = ctx_children[i][j];
    copy_child_pixels(ctx);
}

function test_copy_pixels(child_canvas_id) {
    var child = document.getElementById(child_canvas_id);
    var ctx_child = child.getContext("2d");
    copy_child_ctx(ctx_child);
}

function copy_child_pixels(ctx_child) {
    ctx_child.fillStyle = "#000";
    ctx_child.fillRect(0, 0, child_canvas_width, child_canvas_height);
    var parentImageData = ctx_parent.getImageData(0, 0, parent_canvas_width, parent_canvas_height);
    var childImageData = ctx_child.getImageData(0, 0, child_canvas_width, child_canvas_height);
    interpolate_data_to_child(parentImageData, childImageData, ctx_child);
}

function interpolate_data_to_child(parentImageData, childImageData, ctx_child) {
    var wp = parentImageData.width; //wp = 4;
    var hp = parentImageData.height;// hp = 4;
    var wc = childImageData.width; // assuming a factor of .5
    var parent_data = parentImageData.data;
    var child_data = childImageData.data;
    for(var i=0; i < wp; i+= 2) {
        //console.log("pr: "+ i);
        for(var j=0; j < hp ; j+= 2) {
            average4_pixels(parent_data, parent_canvas_width,
                            child_data, child_canvas_width, i, j);
        }
    }
    ctx_child.putImageData(childImageData, 0, 0);
}

function clear_parent() {
    ctx_parent.fillStyle = "#000";
    ctx_parent.fillRect(0, 0, parent_canvas_width, parent_canvas_height);
}

function test_pixel_line(child_canvas_id) {
    //var child = document.getElementById(child_canvas_id);
    //var ctx_child = child.getContext("2d");
    var parentImageData = ctx_parent.getImageData(0, 0, parent_canvas_width, parent_canvas_height);
    //var childImageData = ctx_child.getImageData(0, 0, child_canvas_width, child_canvas_height);
    var parent_data = parentImageData.data;
    for(var i=0; i < parent_canvas_width; i++) {
        var px = get_pixel1(parent_data, parent_canvas_width, i, i);
        console.log(" i: " + i + " [" + px + "]");
    }
    
    for(var i=0; i < parent_canvas_width; i++) {
        set_pixel(parent_data, parent_canvas_width, i, i, 255, 255, 0, 255);
    }
    ctx_parent.putImageData(parentImageData, 0, 0);
}


function child_mousedown(ev) {
    var child_canvas = ev.target;
    //console.log("Child mouse down. canvas: " + child_canvas);
    //console.log("Child mouse down. canvas.i: " + child_canvas.i + " child_canvas.j: " + child_canvas.j);
    if (!painting) {
      xform_parent_to_parent(child_canvas.i, child_canvas.j);
      evolve_one_round();
    }
}
        
function on_mousedown(ev) {
    //
    // Place a seed particle at the mouse.
    //
    mousing = true;
    var wx = get_world_coordinates_x(ev);
    var wy = get_world_coordinates_y(ev);
    //console.log("mousedown. wx: " + wx + " wy: " + wy);
    if (painting) {
        if (ev.ctrlKey || ev.optionKey) {
            eyedropper_mousedown(ev);
        } else {
            start_stroke(wx, wy);
            paint_one(ev, wx, wy);
        }
    }
}

var stroke = null;
function start_stroke(wx, wy) {
    stroke = [wx, wy];
    stroke.deltaT = -1;
    stroke.travel = -1;
    stroke.timestamp = new Date().getTime();
    stroke.alpha = 0;
}

function update_stroke(wx, wy) {
    if (stroke == null) {
        start_stroke();
        return;
    }
    var wx0 = stroke[0];
    var wy0 = stroke[1];
    var dx = wx - wx0;
    var dy = wy - wy0;
    stroke.travel = Math.sqrt(dx * dx + dy * dy);
    
    var timestamp = new Date().getTime();
    stroke.deltaT = timestamp - stroke.timestamp;
    stroke.timestamp = timestamp;
    if (stroke.deltaT == 0) {
        stroke.rate = 0;
    } else {
        stroke.rate = stroke.travel / stroke.deltaT;
    }

    var newAlpha;
    if (stroke.rate == 0) {
        newAlpha = 0;
    } else {
        newAlpha = Math.min(1.0, .5 / stroke.rate);
    }
    stroke.alpha = stroke.alpha * .9 + newAlpha * .1;
    //console.log("stroke.rate: " + stroke.rate + " alpha: " + stroke.alpha);
}

function on_mouseup(ev) {
    if (mousing) {
    }
    mousing = false;
}

function on_mouseout(ev) {
    mousing = false;
}
  
function on_mousemove(ev) {
    if (mousing) {
        var wx = get_world_coordinates_x(ev);
        var wy = get_world_coordinates_y(ev);
        //log("MOSSE{" + wx + ", " + wy + "}");
        // Drag the body around if stopped,
        // fling the body if running.
        if (painting) {
            update_stroke(wx, wy);
            paint_one(ev, wx, wy);
        }
    }
}

function paint_one(ev, wx, wy) {
    var a = ctx_parent.globalAlpha;
    ctx_parent.globalAlpha = stroke.alpha; // paint_alpha;
    ctx_parent.fillStyle = paint_color;
    ctx_parent.fillRect(wx, parent_canvas_height - wy, brush_size,brush_size);
    ctx_parent.globalAlpha = a;
}


function get_world_coordinates_x(ev) {
    var cx;
    if (firefox) {
        cx = ev.layerX;
    } else if (ev.offsetX || ev.offsetX == 0) { // Opera
        cx = ev.offsetX;
    } else if (ev.layerX || ev.layerX == 0) { // Firefox
        cx = ev.layerX;
    }
    var wx = (cx + offset_x) * scale;
    //console.log("getWorldX. cx: " + cx + " wx: " + wx);
    return wx
}

function get_world_coordinates_y(ev) {
    var cy;
    if (firefox) {
        cy = ev.layerY;
    } else if (ev.offsetY || ev.offsetY == 0) { // Opera
        cy = ev.offsetY;
    } else if (ev.layerY || ev.layerY == 0) { // Firefoy
        cy = ev.layerY;
    }
    var wy = parent_canvas_height - (cy + offset_y) * scale;
    //console.log("getWorldY. cy: " + cy + " (cy+offset): " + (cy + offset_y) + " wy: " + wy);
    return wy
}

function get_palette_coordinates(ev) {
    var cx;
    var cy;
    if (ev.offsetX || ev.offsetX == 0) { // Opera, chrome
        cx = ev.offsetX;
        cy = ev.offsetY;
    }  else  if (ev.layerX || ev.layerX == 0) { // Firefox
        cx = ev.layerX;
        cy = ev.layerY;
    }
    var wx = (cx + offset_x) * scale;
    return [cx, cy];
}

function get_pixel(imageData, x, y) {
    if (imageData == null) {
        return null;
    }
    if (x < 0 || x >= imageData.width ||
        y < 0 || y >  imageData.height) {
        return null;
    }
    return get_pixel1(imageData.data, imageData.width, x, y);
}

function get_pixel_wrapped(imageData, x, y) {
    if (imageData == null) {
        return null;
    }
    if (x < 0) {
        x += imageData.width;
    } else if ( x >= imageData.width ) {
        x -= imageData.width;
    } 
    if (y < 0) {
        y += imageData.width;
    } else if ( y >= imageData.width ) {
        y -= imageData.width;
    } 
    return get_pixel1(imageData.data, imageData.width, x, y);
}

function get_pixel1(data, width, x, y) {
    var offset = 4 * width * y + 4*x;
    return [data[offset], data[offset+1], data[offset+2], data[offset+3]];
}

function set_pixel(data, width, x, y, r, g, b, a) {
    var offset = 4 * width * y + 4*x;
    //console.log("set_pixel(" + x + ", " + y + "). offset: " + offset + " data.length: " + data.length + " width*4: " + (width*4));
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
}

function average4_pixels(data1, width1, data2, width2, x, y) {
    var offset1 = 4 * width1 * y + 4*x;
    var offset2 = 4 * width2 * (y/2) + 4*(x/2);
    //console.log("avg4. off1: " + offset1 + " off2: " + offset2);
    var r = data1[offset1];
    var g = data1[offset1 + 1];
    var b = data1[offset1 + 2];
    var a = data1[offset1 + 3];
    //   console.log("    rgba1: " + r + " : " + g + " : " + b + " : " + a);
    offset1 = 4 * width1 * y + 4*(x+1);
    r += data1[offset1];
    g += data1[offset1 + 1];
    b += data1[offset1 + 2];
    a += data1[offset1 + 3];
    //    console.log("    rgba2: " + r + " : " + g + " : " + b + " : " + a);

    offset1 = 4 * width1 * (y+1) + 4*(x);
    r += data1[offset1];
    g += data1[offset1 + 1];
    b += data1[offset1 + 2];
    a += data1[offset1 + 3];
    //    console.log("    rgba3: " + r + " : " + g + " : " + b + " : " + a);

    offset1 = 4 * width1 * (y+1) + 4*(x+1);
    r += data1[offset1];
    g += data1[offset1 + 1];
    b += data1[offset1 + 2];
    a += data1[offset1 + 3];
    //    console.log("    rgba4: " + r + " : " + g + " : " + b + " : " + a);

    data2[offset2] = r/4;
    data2[offset2 + 1] = g/4;
    data2[offset2 + 2] = b/4;
    data2[offset2 + 3] = a/4;
}

function SlurpXForm(i, j, numslurps, range) {
    this.i = i;
    this.j = j;
    this.numslurps = numslurps;
    this.slurps = new Array();
    if (i+j == 0) {
        this.origin_weight = 1;
    } else {
        this.origin_weight = random_range(0, i+j) / (i + j);
    }
    //console.log("SLURP. XFORM[" + i + ", " + j + "]. ");
    for(var n=0; n < numslurps; n++) {
        this.slurps[n] = new Slurp(i, j, n, range);
    }
}

function Slurp(i, j, nth, range) {
    this.i = i;
    this.j = j;
    this.nth = nth;
    this.range = range;
    this.random_weight = (i + j) * random_range(0, 2);
    this.xoffset_base = (2-i) * range + nth * Math.cos((i + random_range(0, 2)) * Math.PI/2);
    this.yoffset_base = (2-j) * range + nth * Math.sin((j + random_range(0, 2)) * Math.PI/2);
    //console.log("SLURP[" + i + ", " + j + "]@ " + nth);
    //console.log("   range: " + range + " weight: " + this.random_weight + " offset: " + this.xoffset_base + ", " + this.yoffset_base + ")");
    //this.sense = sign(4 - (i + j));
    
}

function sign(n) {
    if (n == 0) {
        return 0;
    } else {
        return Math.abs(n) / n;
    }
}

Slurp.prototype.slurp_pixel = function(data, x, y) {
    var xprime =
        Math.floor(x + this.xoffset_base + this.random_weight + random_range(0, this.range));
    var yprime =
        Math.floor(y + this.yoffset_base + this.random_weight + random_range(0, this.range));
    /*
    if (x<11 && y < 11) {
        console.log("Slurp. xy: (" + x + ", " + y + ") => (" + xprime + ", " + yprime + ")");
    }
    */
    return get_pixel_wrapped(data, xprime, yprime);
}
    
SlurpXForm.prototype.xform_pixel = function(data, x, y) {
    var running_pixel = get_pixel(data, x, y);
    for(var i=0; i < 4; i++) {
        running_pixel[i] *= this.origin_weight;
    }
    for(var n=0; n < this.numslurps; n++) {
        var slurp = this.slurps[n];
        var slurped = slurp.slurp_pixel(data, x, y);
        for(var i=0; i < 4; i++) {
            // simple average for now. no notion of add/subtract.
            running_pixel[i] += slurped[i] / (this.numslurps + this.origin_weight);
        }
    }
    return running_pixel;
}
        
///////////////////

function MatrixXForm(i, j, neighborhood) {
    this.i = i;
    this.j = j;
    this.neighborhood = neighborhood;
    this.matrix = new Array();
    this.matrix_size = 2 * neighborhood + 1;
    console.log("MAT XFORM[" + i + ", " + j + "]. ");
    for(var n=-neighborhood; n <= neighborhood; n++) {
        this.matrix[n+neighborhood] = new Array(this.matrix_size);
    }
    this.fill(this.i, this.j, this.neighborhood);
}

MatrixXForm.prototype.fill = function(i, j, neighborhood) {
    var rbias = (3-j)/2;
    var gbias = (3-i)/2;
    var bbias = j/2;
    var abias = .25 + i/2;
    for(var x=-neighborhood; x <= neighborhood; x++) {
        for(var y=-neighborhood; y <= neighborhood; y++) {
            var xform_pixel = [random_range(rbias * x, gbias * y),
                               random_range(gbias * x, bbias * y),
                               random_range(bbias * x, rbias * y),
                               abias +  random_range(abias * x, abias * y)
                               ];
            console.log("XFORM[" + i + ", " + j + "]. fill(" + x + ", " + y + ") with: [" + xform_pixel + "]");
            this.matrix[x+neighborhood][y+neighborhood] = xform_pixel;
        }
    }
    
}

MatrixXForm.prototype.xform_pixel = function(data, x, y) {
    var running_pixel = [10, 10, 10, 45];
    var prev_pixel = [0, 0, 0, 0];
    var center_pixel = get_pixel(data, x, y);
    var neighborhood = this.neighborhood
    for(var i=-neighborhood; i <= neighborhood; i++) {
        for(var j=-neighborhood; j <= neighborhood; j++) {
            var pix = get_pixel(data, x+i, y+j);
            if (pix) {
                var xf = this.matrix[i+neighborhood][j+neighborhood];
                this.apply_pixel_xform(running_pixel, center_pixel, xf, pix, i, j);
                prev_pixel = pix;
            }
        }
    }
    for(var p=0; p< 4; p++) {
        if (running_pixel[p] > 255) {
            running_pixel[p] = random_range(0, 255);
        } else if (running_pixel[p] < 0) {
            running_pixel[p] *= -1;
        }
    }

    return running_pixel;
}

var D255_TO_RADIANS = 2 * Math.PI / 255.0;
MatrixXForm.prototype.apply_pixel_xform =
    function(running_pixel, reference_pixel, xf, pixel, i, j) {
    for(var p=0; p< 4; p++) {
        var b4 = running_pixel[p];
        var diff_radians = (pixel[p] - reference_pixel[p]) * D255_TO_RADIANS;
        var adjust = (i * Math.sin(diff_radians) +
                      j * Math.cos(diff_radians));
        running_pixel[p] += xf[p] * pixel[p] * adjust;
        //console.log("apx[" + p + "]  b4: " + b4 + " += xf: " + xf[p] + " * pixel: " + pixel[p] + " ==> " + running_pixel[p]);
        
    }
}

function random_range(low, hi) {
    return low + (hi - low) * Math.random();
}


function log(x) {
    console.log(x);
}