var g_setup = false;
var g_running = false;
var g_blobs = [];
var g_bounds_width = 400;
var g_bounds_height = 400;
var g_gravity = 9.8; // meters per second squared
var g_pixels_per_meter = 10; // pixels per meter
var g_delta_t = .005;  // simulated seconds per tick
var g_step_time = 100; // ms
var g_friction_factor = .99;
var c_elasticity = .95;

var seed_blobs1 =
    [
  // [x,  y,  w, h, color,  vx, vy, soundbank]
     [ 15, 335, 20, 20, "#a88",  1,  1, "bells1"],
     [115, 335, 10, 10, "#a88",  1, -1, "bells1"],
     [215, 335, 15, 15, "#a88",  1, -1, "bells1"],
     [150, 350, 25, 25, "#8a8", -2, -3, "bells2"],
     [150, 250, 25, 25, "#8a8", -3, -2, "bells2"],
     [150, 150, 25, 25, "#8a8",  0,  0, "bells2"],
     [315, 100, 10, 10, "#88a", .5,  0, "vibes"],
     [215, 100, 10, 10, "#88a", .9,  0, "vibes"],
     [115, 10,  10, 10, "#88a", -.2, 0, "vibes"]
     ];
var soundbanks = {};
var soundbank_names = ["bells1", "bells2", "vibes"];

var xylophone_colors =
    ["#944", "#994", "#494", "#499", "#449", "#949", "#a46", "#a66", "#aa3", "#6a4", "#49a", "#4aa", "#9aa"];
var xylophone_colors_highlight =
    ["#b77", "#bb7", "#7b7", "#7bb", "#77b", "#b7b", "#c79", "#c99", "#cc7", "#9c7", "#7ac", "#7cc", "#acc"];
var xylophone = [];
var xylophone_highlights = [];

function load(bfid) {
    setup_soundbanks(bfid);
    var boingfield = document.getElementById(bfid);
    clear_boing_field(boingfield);
}

function start_boing(bfid) {
    if (!g_setup) {
        setup_soundbanks(bfid);
    }
    if (!g_blobs || g_blobs.length == 0) {
        seed_blobs(bfid);
    }
    //alert("start boing");
    g_running = true;
    window.setTimeout('step_and_continue()', g_step_time);
}

function clear_blobs(bfid) {
    var boingfield = document.getElementById(bfid);
    clear_boing_field(boingfield);
}

function setup_add_random_blobs(bfid, n) {
    var boingfield = document.getElementById(bfid);
    if (!g_blobs) {
        g_blobs = [];
    }
    for(var i=0; i < n; i++) {
        var blob_spec = random_blob_spec();
        var blob = add_blob(boingfield, blob_spec);
    }
}

function seed_blobs(bfid) {
    var boingfield = document.getElementById(bfid);
    //alert("setup boing. field[" + bfid + "]: " + boingfield);
    clear_boing_field(boingfield);
    for(var i=0; i < seed_blobs1.length; i++) {
        var blobspec = seed_blobs1[i];
        var blob = add_blob(boingfield, blobspec);

        //alert("adding blob spec: " + blobspec + " blob: " + blob);
    }
}

var player_scale = [];
function setup_soundbanks(bfid) {
    var boingfield = document.getElementById(bfid);
    //alert("setup boing. field[" + bfid + "]: " + boingfield);
    clear_players();
    create_soundbanks();
    draw_xylophone(boingfield);
    g_setup = true;
}

function draw_xylophone(boingfield) {
    var bar_margin = 5;
    var bar_width = g_bounds_width / scale.length - bar_margin;
    var bar_height = 20;
    xylophone = [];
    xylophone_highlights = [];
    for(var i=0; i < scale.length; i++) {
        var bar = document.createElement('div');
        bar.setAttribute('class', 'xylophone_bar');
        bar.style.width = bar_width + 'px';
        bar.style.height = bar_height + 'px';
        var x = (bar_width + bar_margin) * i;
        var y = g_bounds_height;// - bar_height;
        bar.style.left = x + 'px';
        bar.style.top = y + 'px';
        bar.style.background = xylophone_colors[i];
        bar.appendChild(document.createTextNode(scale[i]));
        //alert("draw_xylophone[" + i + "]. bar[" + scale[i] + "] (" + x + ", " + y + ") color: " + xylophone_colors[i]);
        boingfield.appendChild(bar);
        xylophone.push(bar);
        xylophone_highlights.push(0);
    }
}

function reset_xylophone_colors() {
    for(var i=0; i < xylophone.length; i++) {
        if (xylophone_highlights[i] < 1) {
            xylophone[i].style.background = xylophone_colors[i];
        } else {
            xylophone_highlights[i] -= 1;
        }
    }
}

function highlight_xylophone_bar(i) {
    if (xylophone[i]) {
        xylophone[i].style.background = xylophone_colors_highlight[i];
        xylophone_highlights[i] = 10;
    }
}

function test_players() {
    test_players1(0);
}
function test_players1(nth) {
    if (nth >= player_scale.length) {
        return;
    }
    player_scale[nth].play();
    window.setTimeout('test_players1('+(nth+1)+')', 1000);
}
    

function clear_boing_field(boingfield) {
    clear_children(boingfield);
    g_blobs = [];
    draw_xylophone(boingfield);
}

function clear_players() {
    var players = document.getElementById("players");
    clear_children(players);
}

function clear_children(elt) {
    if (elt.hasChildNodes() ) {
        while (elt.childNodes.length >= 1 ) {
            elt.removeChild(elt.firstChild );       
        }
    }
}

function add_blob(boingfield, blobspec) {
  // [x,  y,  w, h, color,  vx, vy, soundbank]
    var blob = document.createElement('div');
    blob.style.position = "absolute";
    blob.x = blobspec[0];
    blob.y = blobspec[1];
    move_blob_to(blob, blob.x, blob.y);
    //blob.style.left = blob.x;
    //blob.style.top = blob.y;

    blob.width = blobspec[2];
    blob.height = blobspec[3];
    blob.style.height = blob.height+'px'; 
    blob.style.width = blob.width+'px';
    blob.style.background=blobspec[4];

    blob.vx = blobspec[5];
    blob.vy = blobspec[6];
    blob.soundbank = blobspec[7];
    
    boingfield.appendChild(blob);
    g_blobs.push(blob);
    return blob;
}


function step_and_continue() {
    boing_tick(null, g_blobs);
    if (g_running) {
        window.setTimeout('step_and_continue()', g_step_time);
    }
}

function stop_boing(bfid) {
  var boingfield = document.getElementById(bfid);
  //alert("stop boing");
  g_running = false;
}

function find_blobs(boingfield) {
  // todo: use jquery to find them.
  //       for now, hack the ids.
    get_blob("1");
    get_blob("2");
    get_blob("3");
}

function get_blob(id_suffix) {
  var b = document.getElementById("blob"+id_suffix);
  if (b) {
      b.x = b.offsetLeft;
      b.y = g_bounds_height - b.offsetTop;
      b.vx = random_range(-2, 5);
      b.vy = 0;
      b.width = 20;
      b.height = 20;
      g_blobs.push(b);
  }
}

function boing_step(bfid) {
  var boingfield = document.getElementById(bfid);
  boing_tick(boingfield, g_blobs);
}
  
function boing_tick(boingfield, blobs) {
    for(var i=0; i < blobs.length; i++) {
        var blob = blobs[i];
        move_blob(boingfield, blob);
        reset_xylophone_colors();
    }
}

function move_blob(boingfield, blob) {
    var x = blob.x;
    var y = blob.y;
    //alert("move_blob. blob: P(" + x + ", " + y + ") V(" + blob.vx + ", " + blob.vy + ") WxH(" + blob.style.width + " x " + blob.style.height + ")");
    //
    // maybe bounce
    //
    if ((x + blob.width >= g_bounds_width) ||
            (x < 0)) {
        blob.vx *= (-1. * c_elasticity);
    }
    if (y + blob.height >= g_bounds_height) {
        blob.vy *= (-1. * c_elasticity); 
    }
    if (y < blob.height) {
        blob.vy *= (-1. * c_elasticity);
        bottom_collide(blob);
    }
    //
    // friction step
    //
    blob.vx *= g_friction_factor;
    blob.vy *= g_friction_factor;

    // gravity step
    //        m/s*s * pixels/m * seconds/tick
    var dVy = (g_gravity * g_delta_t);
    blob.vy -= dVy;

    //alert("before move_blob_to("+x + ", " + y + ") blob:(" + blob.style.left + ", " + blob.style.top + ") V:(" + blob.vx + ", " + blob.vy + ")");
    if (x < 0) x = 1;
    if ((x + blob.width) > g_bounds_width) x = g_bounds_width - blob.width - 1;
    if (y < 0) y = 1;
    if ((y + blob.height) > g_bounds_height) y = g_bounds_height - blob.height - 1;
    x += blob.vx * g_pixels_per_meter;
    y += blob.vy * g_pixels_per_meter;
    move_blob_to(blob, x, y);
}  

function move_blob_to(blob, x, y) {
    var y_prime = g_bounds_height - y;
    blob.x = x;
    blob.y = y;
    blob.style.left = x + 'px';
    blob.style.top = y_prime + 'px';
    //alert("after move_blob_to("+x + ", " + y + ") => (" + blob.style.left + ", " + blob.style.top + ")");
}

function random_range(low, hi) {
    return low + (hi - low) * Math.random();
}

var scale = ["C3", "Eb3", "E3", "F#3", "G3", "A3", "B3", "C4"];

function bottom_collide(blob) {
    //
    // note in scale is determined by x position.
    var x_ratio = Math.min(1.0, Math.max(0, blob.x / g_bounds_width));
    var place_in_scale = Math.round(x_ratio * scale.length);
    var note = scale[place_in_scale];
    highlight_xylophone_bar(place_in_scale);
    play_note(blob.soundbank, note);
}

function play_note(soundbank_name, note_name) {
    if (note_name && soundbank_name) {
        var soundbank = soundbanks[soundbank_name];
        var note_player = soundbank[note_name];
        note_player.play();
    }
}
    

function create_soundbanks() {
    soundbanks = {};
    var players = document.getElementById("players");
    var sb_table = document.createElement('table');
    sb_table.border=0;
    var header_row = document.createElement('tr');
    for(var i =0; i < soundbank_names.length; i++) {
        var th = document.createElement('th');
        th.appendChild(document.createTextNode(soundbank_names[i]));
        header_row.appendChild(th);
    }
    sb_table.appendChild(header_row);
    var sb_row = document.createElement('tr');
    sb_table.appendChild(sb_row);
    for(var i =0; i < soundbank_names.length; i++) {
        var soundbank = {};
        var soundbank_name = soundbank_names[i];
        var sb_td = document.createElement('td');
        sb_row.appendChild(sb_td);
        for(var j=0; j < scale.length; j++) {
            var note_name = scale[j];
            var suffix = "ogg";
            var note_path = "notes/" + soundbank_name + "/" + note_name + "." + suffix;
            var player = document.createElement('audio');
            player.setAttribute('src', note_path);
            player.controls=true;
            player.load();
            soundbank[note_name] = player;
            var ddiv = document.createElement('div');
            var name_elt = document.createElement('div');
            name_elt.setAttribute('class', 'note_name');
            name_elt.appendChild(document.createTextNode(note_name));
            ddiv.appendChild(name_elt);
            ddiv.appendChild(player);
            sb_td.appendChild(ddiv);
        }
        soundbanks[soundbank_name] = soundbank;
    }
    players.appendChild(sb_table);
}

function random_blob_spec() {
    var x = random_range(0, g_bounds_width);
    var y = random_range(0, g_bounds_height);
    var w = random_range(5, 30);
    var h = random_range(w-5, w+5);
    var sbi = Math.floor(random_range(0, soundbank_names.length));
    var sb_colors = ["#966", "#696", "#669", "#996", "#969", "#699"];
    var soundbank = soundbank_names[sbi];
    var color = sb_colors[sbi];
    var vx = random_range(-2, 2);
    var vy = random_range(-4, 2);
    return [x, y, w, h, color, vx, vy, soundbank];
}

