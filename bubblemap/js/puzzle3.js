var g_testing = false;

var pz_canvas;  // main puzzle canvas
var pp; // main PuzzlePlayer
var bg_color = "#222"; // "#d0e0f1";
var play_input;
var found_words = [];
var found_words_elt;
var the_dictionary;

//
// settings & constants
//
var HIGHLIGHT_LEVEL_NONE          = 0;
var HIGHLIGHT_LEVEL_FAIL = FAIL   = -1;
var HIGHLIGHT_LEVEL_PATH = PREFIX = 1;
var HIGHLIGHT_LEVEL_WORD = WORD   = 2;
var HIGHLIGHT_LEVEL_DRAGGING      = 10;
var TWO_PI = Math.PI * 2;
var DEGREES_TO_RADIANS = Math.PI / 180.

var X=0;
var Y=1;
var Z=2;
var W=3;

var g_step_time = 60;  // ms
var g_annealing = false;
var g_rotating = true;
var nticks = 0;
var g_universe_radius = 25;
var num_mutations_per = 4;
var mutations = [];
var num_evolution_results = 4;
var mutation_players = [];

function play_current_game() {
    clear_found_words();
    display_word_state();
    play_input.focus();
}

function display_word_state() {
    var words_msg = "Found " + found_words.length + " out of " +
        pp.graph.num_words() + " words.";
    set_element_contents("main_puzzle_num_words", words_msg);
}

function new_letters_same_structure(evolution_steps) {
    if (!evolution_steps) {
        evolution_steps = 20;
    }
    var only_letters_keep = PuzzlePlayer.mutation_param_only_letters;
    PuzzlePlayer.mutation_param_only_letters = true;
    var word_fitness_keep = PuzzlePlayer.fitness_param_numwords;
    PuzzlePlayer.fitness_param_numwords = 1.0;
    //
    // evolve the current graph n generations, changing only the letters,
    // checking for number of words.
    //
    mutations = [];
    evolution_step(evolution_steps, null);
    // and take the best one. 
    make_mutation_main_puzzle(0);
    clear_found_words();
    display_word_state();
    //
    // restore the old values
    //
    PuzzlePlayer.mutation_param_only_letters = only_letters_keep;
    PuzzlePlayer.fitness_param_numwords = word_fitness_keep;
}

function test_3d_load(pz_id) {
    pz_canvas = document.getElementById(pz_id);
    pp = new PuzzlePlayer(pz_canvas, 450., 450., g_universe_radius);
    pz_canvas.pp = pp;
    test_3d();
    show_tab('play', ['tune', 'evolve']);
}

var mvMatrix;
var pMatrix;
var mvpMatrix;
var scale_recip = 2;
function setup_mats() {
    mvMatrix = mat4.create();
    pMatrix = mat4.create();
    mvpMatrix = mat4.create();

    mat4.perspective(45,   // vertical field of view
                     1.0, // aspect ratio
                     .1,  // near clip
                     10.0,  // far clip
                     pMatrix);
    mat4.identity(mvMatrix);
}

var xRot = 90;
var yRot = 45;
var zRot = 0;

function combine_matricies() {
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [40.0, 40.0, 10.0]);
    mat4.rotate(mvMatrix, degToRad(xRot), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(yRot), [0, 1, 0]);
    mat4.rotate(mvMatrix, degToRad(zRot), [0, 0, 1]);
    mat4.scale(mvMatrix, [2, 2, 2]);
    mat4.multiply(pMatrix, mvMatrix, mvpMatrix);
    
    //mat4.multiply(pMatrix, mvMatrix, mvpMatrix);
}

function xform_point_whoa(pp, v3) {
    var x4 = [0, 0, 0, 1];
    v3[3] = 1;
    console.log("xform pt (" + sv4(v3) + "). x4: " + sv4(x4));
    //console.log(" mvp: " + mat4.str(mvpMatrix));
    mat4.multiplyVec4(mvpMatrix, v3, x4);
    //mat4.multiplyVec3(pMatrix, x3);
    console.log("     x4 aft: " + sv4(x4));
    var z = x4[2];
    var h = x4[3];// Math.abs(x3[2]);
    var hinv = 1;
    if (h != 0) {
        hinv = 1/h;
    }
    log("   h: " + h + " hinv: " + hinv);
    //vec3.scale(x4, hinv);
    x4[0] = (x4[0] - z) * hinv;
    x4[1] = (x4[1] - z) * hinv;
    log("    x4 scaled: " + sv4(x4));
    vec3.add(x4, [100, 100, 0]);
    return x4;
}

function xform_point(pp, v3) {
    var x4 = [0, 0, 0, 1];
    v3[3] = 1;
    console.log("xform pt (" + sv4(v3) + "). x4: " + sv4(x4));
    //console.log(" mvp: " + mat4.str(mvpMatrix));
    mat4.multiplyVec3(mvpMatrix, v3, x4);
    vec3.add(x4, [100, 100, 0]);
    return x4;
}

function sign(x) {
    if (x < 0) {
        return -1;
    } else if (x > 0) {
        return 1;
    } else {
        return 0;
    }
}

function mv_point(pp, v3) {
    var x3 = vec3.create();
    //console.log("xform pt (" + svv(v3) + "). x3: " + x3);
    //console.log(" mvp: " + mat4.str(mvpMatrix));
    mat4.multiplyVec3(mvMatrix, v3, x3);
    //mat4.multiplyVec3(pMatrix, x3);
    //console.log("     x3 aft: " + svv(x3));
    return x3;
}

function xform_length(pp, length, point) {
    // how to do this?
    //    log("xform length.   point:" + svv(point) + " LENGTH: " + length);
    var point2 = vec3.create();
    vec3.add([length, length, 0], point, point2);
    //log("xform length.  point2:" + svv(point2));
    var xpoint = mv_point(pp, point);
    var xpoint2 = mv_point(pp, point2);
    //log("xform length.  xpoint:" + svv(xpoint));
    //log("xform length. xpoint2:" + svv(xpoint2));
    vec3.subtract(xpoint, xpoint2);
    //log("xform length. pointD:" + svv(xpoint));
    var xlength = vec3.length(xpoint);
    //log("xform length. xlength:" + xlength);
    return xlength;
}

var points;
var colors;
var lines;
function test_3d() {
    setup_mats();
    points =
        [
         vec3.create([0, 0, 0]),
         vec3.create([ 10,  10,  10]),
         vec3.create([-10,  10,  10]),
         vec3.create([-10,  10, -10]),
         vec3.create([ 10,  10, -10]),

         vec3.create([ 10, -10,  10]),
         vec3.create([-10, -10,  10]),
         vec3.create([-10, -10, -10]),
         vec3.create([ 10, -10, -10])
         ];
    lines = [
             [1, 2], [2, 3], [3, 4], [4, 1],
             [1, 5], [2, 6], [3, 7], [4, 8],
             [5, 6], [6, 7], [7, 8], [8, 5]
             ];
    colors = ["#FFF", "#a00", "#aa0", "#0a0", "#0aa", "#00a", "#a0a", "#Da6", "#DC3", "#5b2", "#5bD", "#6aD", "#3BC"];
    step_3d();
}

function tick_3d() {
    step_3d();
}
function onestep_3d() {
    step_3d();
}

var lastTime = 0;
function step_3d() {
    console.log("  XROT: " + xRot);
    console.log("  YROT: " + yRot);
    console.log("  ZROT: " + zRot);
    var timeNow = new Date().getTime();
    if (lastTime != 0 && g_rotating) {
        var elapsed = timeNow - lastTime;
        xRot += (4 * elapsed) / 5000.0;
        yRot += (3 * elapsed) / 5000.0;
        zRot += (1 * elapsed) / 5000.0;
    }    
    lastTime = timeNow;

    combine_matricies();
    // loop through world rotation
    pp.clear_canvas();
    //
    //display points
    var xpts = [];
    for(var i=0; i < points.length; i++) {
        var point = points[i];
        var xpt = xform_point(pp, point);
        xpts.push(xpt);
        var xside = xform_length(pp, 2, point);
        console.log("  [" + i + "] " + svv(point) + " => " + svv(xpt));
        //pp.ctx.fillStyle = colors[i];
        //pp.ctx.fillRect(xpt[0], xpt[1], xside, xside);
    }
    for(var i=0; i < lines.length; i++) {
        pp.ctx.strokeStyle = colors[i];
        var line = lines[i];
        var a = xpts[line[0]];
        var b = xpts[line[1]];
        pp.ctx.beginPath();
        pp.ctx.moveTo(a[0], a[1]);
        pp.ctx.lineTo(b[0], b[1]);
        pp.ctx.closePath();
        pp.ctx.stroke();
    }
}

function svv(vec3) {
    return "{" + round2(vec3[0]) + ", " + round2(vec3[1]) + ", " + round2(vec3[2]) + "}";
}

function sv4(vec4) {
    return "{" + round2(vec4[0]) + ", " + round2(vec4[1]) + ", " + round2(vec4[2]) + ", " + round2(vec4[3]) + "}";
}

function load(pz_id) {
    pz_canvas = document.getElementById(pz_id);
    pp = new PuzzlePlayer(pz_canvas, 450., 450., g_universe_radius);
    //log("LOAD. pp: " + pp);
    pz_canvas.pp = pp;
    show_tab('play', ['tune', 'evolve', 'fitness']);
    setup_input();
    setup_evolution_results();
    if (g_testing) {
        load_puzzle('backtracking_test');
    } else {
        load_puzzle('icosahedron');
    }
    
    setup_dictionary();
    //log(pp.graph.debug_string());
    clear();
    pp.graph.calculate_forces();
    pp.draw_graph();
    // let's start off with it annealing
    g_annealing = true;
    set_fitness_words(1.0);
    set_fitness_edges(0);
    set_fitness_average_tension(1.0);
    start_loop();
}

function log(msg) {
    console.log(msg);
}

function setup_input() {
    play_input = document.getElementById("play_input");
    play_input.focus();
    found_words_elt = document.getElementById("found_words");
}

function setup_evolution_results() {
    var results_elt = document.getElementById('evolution_results');
    if (!results_elt) return;
    var mutation_width = 200;
    var mutation_height = 200;
    for(var i=0; i < num_evolution_results; i++) {
        var mut_canvas = make_mutation_holder(results_elt, i, mutation_width, mutation_height);
        
        var mutation_player =
            new PuzzlePlayer(mut_canvas, mutation_width, mutation_width, g_universe_radius);
        mut_canvas.pp = mutation_player;
        mutation_player.ctx.scale(1.5, .75); // this seems like a hack???
        mutation_players.push(mutation_player);
        //log("Created Mutation Player[" + i + "]");
        //log(mutation_player.graph.debug_string());

        /*
        mutation_player.set_graph(mutation_player.graph.make_random_puzzle(6, 8));
        mutation_player.graph.calculate_forces();
        mutation_player.clear_canvas();
        mutation_player.draw_graph();
        */
    }
}

function setup_dictionary() {
    set_element_contents("dict_msg", "Loading dictionary.");
    the_dictionary = new Dictionary("biggerdict");
    console.log("Setting up dictionary. adding " + some_words.length + " words.");
    window.setTimeout('setup_dictionary2()', 1);
} 
function setup_dictionary2() {
    the_dictionary.add_words(some_words);
    console.log("Dictionary loaded. " + the_dictionary.num_words + " words, " + the_dictionary.duplicates + " duplicates.");
    set_element_contents("dict_msg", "Loaded dictionary: " + the_dictionary.num_words + " words.");
    pp.graph.invalidate_solution();
    clear_found_words();
    display_word_state();
}


function make_mutation_holder(results_elt, i, width, height) {
    var fitness_div_html =
        ["Origin: <span class='mgraph_data' id='mgraph_origin_", i, "'>  </span> ",
         " (<span class='mgraph_data' id='mgraph_mutations_", i, "'>0</span> mutations) <br/>",
         "&nbsp;&nbsp;Words: <span class='mgraph_data' id='fitness_words_",i, "'></span><br/>",
         "&nbsp;&nbsp;Crossed edges: <span class='mgraph_data' id='fitness_edges_", i,"'></span><br/>",
         "&nbsp;&nbsp;Fitness: <span class='mgraph_data' id='fitness_weighted_", i, "'></span>"
         ];
    var mut_div = document.createElement('div');
    mut_div.setAttribute('id', 'mut_holder_' + i);
    mut_div.setAttribute('class', 'mutation_holder');
    var fitness_div = document.createElement('div');
    fitness_div.setAttribute('id', 'fitness_' + i);
    fitness_div.setAttribute('class', 'fitness');
    fitness_div.innerHTML = fitness_div_html.join("");
    mut_div.appendChild(fitness_div);
    var mut_canvas = document.createElement('canvas');
    mut_canvas.setAttribute('id', "mutation_" + i);
    mut_canvas.setAttribute('class', "mutation_canvas");
    mut_canvas.style.width = width;
    mut_canvas.style.height = height;
    mut_div.appendChild(mut_canvas);
    var buttons_div = document.createElement('div');
    buttons_div.setAttribute('class', 'mutation_buttons');
    var buttons_html =
        ["<input type='button' ",
         "value='Mutate this' ",
         "onclick='mutate_again(", i, ")' />",
         "<input type='button' ",
         "value='Jostle' ",
         "onclick='jostle_puzzle(", i, ")' />",
         "<input type='button' ",
         "value='Play' ",
         "onclick='make_mutation_main_puzzle(", i, ")' />"
         ];
    buttons_div.innerHTML = buttons_html.join("");
    mut_div.appendChild(buttons_div);
    results_elt.appendChild(mut_div);
    return mut_canvas;
}

function split(word) {
    //log("pz.split(" + word + ")");
    var chars = [];
    for(var i=0; i < word.length; i++) {
        chars.push(word.charAt(i));
    }
    return chars;
}

function key_press() {
    var word = play_input.value;
    var edgelist = pp.test_and_highlight_input(word);
}

function word_submitted() {
    var word = play_input.value;
    //console.log("word submitted: " + play_input.value);
    var edgelist = pp.test_and_highlight_input(word);
    //console.log("edgelist.length: " + edgelist.length + " edgelist.state: " + edgelist.state + " el.first_wrod: " + edgelist.first_word);
    if (edgelist.length > 0 && edgelist.state == WORD) {
        play_input.value = "";
        //console.log("Maybe Entering word: " + word + " into found_words list");
        if (!contains(found_words, word)) {
            found_words.push(word);
            found_words_elt.value += (word + "\n");
            display_word_state();
        }
    }
    play_input.value = "";
}


function set_mode(mode) {
    var evolution_results = document.getElementById("evolution_results");
    if (mode == 'play') {
        play_input.focus();
        evolution_results.style.display="none";
    } else if (mode == 'tune') {
        evolution_results.style.display="none";
    } else if (mode == 'evolve') {
        mutate_main_puzzle();
        display_main_fitness_level();
        evolution_results.style.display="block";
    }
}

function set_friction(val) {
    PuzzlePlayer.friction = val;
}

function set_step_time(st) {
    g_step_time = st;
}

function set_delta_t(val) {
    PuzzlePlayer.delta_t = val;
}

function set_node_repulsion(val) {
    PuzzlePlayer.node_repulsion = val;
}

function set_trails(val) {
    PuzzlePlayer.trails = val;
}

function toggle_mutation_param_letters() {
  PuzzlePlayer.mutation_param_only_letters =
     !PuzzlePlayer.mutation_param_only_letters;
}

function set_fitness_params(numwords, crossing_edges) {
    PuzzlePlayer.fitness_param_numwords = numwords;
    PuzzlePlayer.fitness_param_crossings = crossing_edges;
    display_main_fitness_level();
}

function set_fitness_words(level) {
    PuzzlePlayer.fitness_param_numwords = level;
}

function set_fitness_edges(level) {
    PuzzlePlayer.fitness_param_edges = level;
}

function set_fitness_average_tension(level) {
    PuzzlePlayer.fitness_param_average_tension = level;
}

function set_fitness_max_tension(level) {
    PuzzlePlayer.fitness_param_max_tension = level;
}

function start_loop() {
    g_annealing = true;
    //log("start_loop");
    nticks = 0;
    step_and_continue();
}

function step_and_continue() {
    tick();
    if (g_annealing) {
        window.setTimeout('step_and_continue()', g_step_time);
    } else {
        pp.draw_graph();
    }
}

function stop() {
    g_annealing = false;
}

function reset() {
    pp.graph.reset();
    pp.draw_graph();
}

function zbump() {
    for(var i=0; i < pp.graph.num_nodes(); i++) {
        var node = pp.graph.get_node(i);
        node.position.z += random_range(-10, 10);
    }
}

function onestep() {
    pp.anneal_step();
    for(var m=0; m < mutation_players.length; m++) {
        mutation_players[m].anneal_step();
    }
}

function clear() {
    pp.clear_canvas();
    clear_found_words();
}

function clear_found_words() {
    found_words = [];
    clear_found_words_elt();
}

function clear_found_words_elt() {
    found_words_elt.value = "";
}

function tick() {
    pp.update_rotations();
    //log("tick[" + nticks + "]. bodies: " + bodies.length);
    if (pp.trails == 0) {
        pp.clear_canvas();
    } else if (pp.trails == -1) {
        // don't clear...
    } else {
        pp.clear_canvas_for_trails(pp.trails);
    }

    if (g_annealing) {
        pp.anneal_step();
        if (nticks % 10 == 0) {
            pp.graph.calculate_fitness();
            display_fitness_level(pp.graph, 'main');
        }
        for(var m=0; m < mutation_players.length; m++) {
            var mp = mutation_players[m];
            mp.anneal_step();
            if (nticks % 10 == 0) {
                mp.graph.calculate_fitness();
                display_fitness_level(mp.graph, m);
            }  
        }
    }
    nticks++;
}

function find_all_words() {
    var all_words = pp.graph.find_all_words();
    clear_found_words_elt();
    found_words_elt.value = "";
    found_words_elt.value += "-- " + all_words.length + " words --\n";
    found_words_elt.value += all_words.join("\n");
    found_words_elt.value += "\n--------\n";
}

function calculate_forces_once() {
    pp.graph.calculate_forces();
    pp.draw_graph();
}

    
function random_range(low, hi) {
    return low + (hi - low) * Math.random();
}

function random_chance(chance) {
    return  Math.random() < chance;
}

function random_percent(percent_chance) {
    return  100*Math.random() < percent_chance;
}

var all_letters="abcdefghijklmnopqrstuvwxyz";
// just faking the frequencies here. 
var all_letters_with_frequency = 
    "eeeeeeeetttttttttaaaaaaaaaaoooooooooiiiiiiiiinnnnnnnnnssssssshhhhhhhhrrrrrddddddddlllllluuuuuucccccmmmmfffffwwwwyyyypooovvvbbbgggkkkqqjxzz";
var all_letters_chars = split(all_letters_with_frequency);
function random_letter() {
    return all_letters_chars[Math.floor(random_range(0, all_letters_chars.length))];
}

//
//   Mouse Event handling
//

function get_world_coordinates(player, ev) {
    var cx, cy;
    if (ev.layerX || ev.layerX == 0) { // Firefox
        cx = ev.layerX;
        cy = ev.layerY;
    } else if (ev.offsetX || ev.offsetX == 0) { // Opera
        cx = ev.offsetX;
        cy = ev.offsetY;
    }

    return player.canvas_to_world(cx, cy);
}

function on_mousedown(ev) {
    //log("mouse down. target: " + ev.target);
    //log("mouse down. target.pp: " + ev.target.pp);
    var player = ev.target.pp;
    player.mousing = true;
    var worldmouse = get_world_coordinates(player, ev);
    //log(" DOwn. worldmouse = " + sv(worldmouse));
    for(var i=0; i < player.graph.num_nodes(); i++) {
        var node = player.graph.get_node(i);
        //log("  testing node: " + sn(node) );
        if (node.point_hits_node(worldmouse)) {
            //log("   HIT");
            player.graph.highlight_node_and_edges(node, HIGHLIGHT_LEVEL_DRAGGING);
            player.dragging_node = node;
            player.draw_graph();
            return;
        }
    }
}

function on_mouseup(ev) {
    var player = ev.target.pp;
    if (player.mousing) {
        if (player.dragging_node) {
            player.graph.highlight_node_and_edges(player.dragging_node, HIGHLIGHT_LEVEL_NONE);
            player.draw_graph();
        }
    }
    player.mousing = false;
    player.dragging_node = null;
}

function on_mouseout(ev) {
    on_mouseup(ev);
}

function on_mousemove(ev) {
    var player = ev.target.pp;
    if (player.mousing) {
        var worldmouse = get_world_coordinates(player, ev);
        // Drag the body around if stopped,
        // fling the body if annealing.
        if (player.dragging_node) {
            player.dragging_node.move_to(worldmouse);
            player.graph.calculate_forces();
            player.draw_graph();
        }
    }
}


//////////////
/// puzzle solver

// Thanks!
// This was fun.
// -- Simran


var dictionary =
    [
     "pop", "corn", "pap", "con", "pan", "nap", "acorn", "nor",
     "cop", "popcorn", "apron", "pro", "capo", "can", "roc", "anchor",
     "horn", 
     "cor", "panda", "pad", "damp", "dart", "pat", "tap", "tarp",
     "part", "drop", "pod", "port", "spat", "past", "pats",
     "cap", "dog", "god", "gap", "tag", "gate", "cape",
     "fog", "fop", "pen", "apple", "epee",
     "fad", "far", "fart", "pot", "top", "crate", "create", "crap", "carp",
     "dot", "dote", "par", "rap", "part", "prat", "prate"
     ];
                  

function contains(list, w) {
    for(var i=0; i < list.length; i++) {
        if (list[i] == w) {
            return true;
        }
    }
    return false;
}


function is_word(chars) {
    return isWord(chars.join(""));
}

function test_word_chars(chars, upto_index) {
    if (the_dictionary) {
        return the_dictionary.test_chars(chars, upto_index);
    } else {
        return 0;
    }
}

var puzzles = new Array();
/*
         p1----o2
      /  |  X  |  \
    r3---n4----a5--p6
      \  |  X  |  /
         o7----c8
 */
var a1='a1', a2='a2', a3='a3';
var b1='b1', b2='b2', b3='b3';
var c1='c1', c2='c2', c3='c3';
var d1='d1', d2='d2', d3='d3';
var e1='e1', e2='e2', e3='e3';
var f1='f1', f2='f2', f3='f3';
var g1='g1', g2='g2', g3='g3';
var h1='h1', h2='h2', h3='h3';
var i1='i1', i2='i2', i3='i3';
var j1='j1', j2='j2', j3='j3';

var g_puzzles = {
    'popcorn': {
        name: "popcorn",
        zbump: false,
        zrotate: true,
        initialevolve: false,
        nodes: [[1, 'p',  [20, 30, 0]], // left-to-right, top-down (reading order)
                [2, 'o',  [30, 30, 0]],
                [3, 'r',  [10, 20, 0]],
                [4, 'n',  [20, 20, 0]],
                [5, 'a',  [30, 20, 0]],
                [6, 'p',  [40, 20, 0]],
                [7, 'o',  [20, 10, 0]],
                [8, 'c',  [30, 10, 0]]
                ],
        edges: [[1, 2], [1, 3], [1, 4], [1, 5],
                [2, 4], [2, 5], [2, 6],
                [3, 4], [3, 7],
                [4, 3], [4, 5], [4, 7], [4, 8],
                [5, 6], [5, 7], [5, 8],
                [6, 8],
                [7, 8]
                ]
    },
    'popcorn2': {
        name: "popcorn, too",
        zbump: false,
        zrotate: false,
        initialevolve: false,
        nodes: [[1, 'p',  [20, 30, 0]], // left-to-right, top-down (reading order)
                [2, 'o',  [30, 30, 0]],
                [3, 'r',  [10, 20, 0]],
                [4, 'n',  [20, 20, 0]],
                [5, 'a',  [30, 20, 0]],
                [6, 'p',  [40, 20, 0]],
                [7, 'o',  [20, 10, 0]],
                [8, 'c',  [30, 10, 0]],
                [9, 'h',  [25, 5, 0]]
                ],
        edges: [[1, 2], [1, 3], [1, 4], [1, 5],
                [2, 4], [2, 5], [2, 6],
                [3, 4], [3, 7],
                [4, 3], [4, 5], [4, 7], [4, 8],
                [5, 6], [5, 7], [5, 8],
                [6, 8],
                [7, 8], [7, 9],
                [8, 9]
                ]
    },
    'panda': {
        name: "panda",
        zbump: false,
        zrotate: true,
        initialevolve: false,
        nodes: [[1, 'a', ],
                [2, 'p', ],
                [3, 'a', ],
                [4, 'n', ],
                [5, 'a', ],
                [6, 'd', ],
                [7, 'c', ],
                [8, 'r', ],
                [9, 'd', ],
                [10, 'f',],
                [11, 'e',],
                [12, 'i',],
                [13, 'g',],
                [14, 'p',],
                [15, 'o',],
                [16, 't',],
                ],
        edges: [[ 1,  2], [1,  4], [1,  5], [1, 9],
                [ 2, 14], [2, 16], 
                [ 3,  4], [3,  8], [3, 12], [3, 14], [3, 16], 
                [ 4,  6], [4,  7], [4,  8], [4, 11], 
                [ 5,  6],
                [ 6, 10], [6, 10], 
                [ 7,  8],
                [ 9, 10], [9, 13], [9, 15],
                [10, 15], 
                [11, 14], [11, 16],
                [12, 13], 
                [13, 14], [13, 15],
                [14, 15],
                [15, 16], 
                ]
    },
    'octohedron': {
        zbump: true,
        zrotate: true,
        initialevolve: true,
        nodes: [[1, 'p', [15, 15, -10]],
                [2, 'a', [10, 20, 0]],
                [3, 'n', [20, 20, 0]],
                [4, 'a', [20, 10, 0]],
                [5, 't', [10, 10, 0]],
                [6, 'd', [15, 15, 10]]
                ],
        edges: [[1, 2], [1, 3], [1, 4], [1, 5],
                [2, 3], [3, 4], [4, 5], [5, 2],
                [2, 6], [3, 6], [4, 6], [5, 6]
                ]
    },
    'd10' : {
        zbump: true,
        initialevolve: true,
        zrotate: true,
        nodes: [[ 1, 'a', [20, 20, -20]],
                [ 2, 'r', [30, 30,   5]],
                [ 3, 't', [30, 25,   5]],
                [ 4, 's', [20, 20,   5]],
                [ 5, 'o', [10, 25,   5]],
                [ 6, 'e', [15, 30,   5]],

                [ 7, 'h', [20, 35,  -5]],
                [ 8, 'n', [35, 30,  -5]],
                [ 9, 'i', [22, 18,  -5]],
                [10, 'e', [ 8, 18,  -5]],
                [11, 'd', [ 8, 27,  -5]],
                [12, 'p', [20, 20,  20]]
                ],
        edges: [[1,  2], [1,  3], [1,  4], [1,  5], [1, 6],
                [2,  8], [8,  3], [3,  9], [9,  4],
                [4, 10], [10, 5], [5, 11], [11, 6],
                [6,  7], [7,  2],
                [7, 12], [8, 12], [9, 12], [10, 12], [11, 12]
                ]
    },
    'icosahedron' : {
        zbump: true,
        initialevolve: true,
        zrotate: true,
        nodes: [[ 1, 'a', [20, 20, -20]],
                [ 2, 'r', [30, 30,   5]],
                [ 3, 't', [30, 25,   5]],
                [ 4, 's', [20, 20,   5]],
                [ 5, 'o', [10, 25,   5]],
                [ 6, 'e', [15, 30,   5]],

                [ 7, 'h', [20, 35,  -5]],
                [ 8, 'n', [35, 30,  -5]],
                [ 9, 'i', [22, 18,  -5]],
                [10, 'e', [ 8, 18,  -5]],
                [11, 'd', [ 8, 27,  -5]],
                [12, 'p', [20, 20,  20]]
                ],
        edges: [[1,  2], [1,  3], [1,  4], [1,  5], [1,  6],
                [2,  3], [3,  4], [4,  5], [5,  6], [6,  2],
                [2,  8], [8,  3], [3,  9], [9,  4],
                [4, 10], [10, 5], [5, 11], [11, 6],
                [6,  7], [7,  2],
                [7,  8], [8,  9], [9, 10], [10, 11], [11,  7],
                [7, 12], [8, 12], [9, 12], [10, 12], [11, 12]
                ]
    },
    'icosahedron_flat' : {
        name: "Flat Icosahedron",
        zbump: false,
        initialevolve: true,
        zrotate: true,
        nodes: [[ 1, 'a' ],
                [ 2, 'r' ],
                [ 3, 't' ],
                [ 4, 's' ],
                [ 5, 'o' ],
                [ 6, 'e' ],

                [ 7, '*' ],
                [ 8, '*' ],
                [ 9, 'i' ],
                [10, 'e' ],
                [11, '*' ],
                [12, '*' ]
                ],
        edges: [[1,  2], [1,  3], [1,  4], [1,  5], [1,  6],
                [2,  3], [3,  4], [4,  5], [5,  6], [6,  2],
                [2,  8], [8,  3], [3,  9], [9,  4],
                [4, 10], [10, 5], [5, 11], [11, 6],
                [6,  7], [7,  2],
                [7,  8], [8,  9], [9, 10], [10, 11], [11,  7],
                [7, 12], [8, 12], [9, 12], [10, 12], [11, 12]
                ]
    },
    'dodecahedron_flat' : {
        name: "Flat Dodecahedron",
        zbump: true,
        initialevolve: true,
        zrotate: true,
        nodes: [[ 1, 't'],
                [ 2, 'u'],
                [ 3, 's'],
                [ 4, 'i'],
                [ 5, 'z'],
                [ 6, 'e'],
                [ 7, 'o'],
                [ 8, 'r'],
                [ 9, 'e'],
                [10, '*'],
                [11, 'c'],
                [12, 'n'],
                [13, 'p'],
                [14, 'o'],
                [15, '*'],
                [16, '*'],
                [17, '*'],
                [18, 'h'],
                [19, 'a'],
                [20, '*']
                ],
        edges: [[ 1,  2], [ 1,  3], [ 1,  4],

                [ 2,  5], [ 5,  6], [ 6,  3],
                [ 3,  7], [ 7,  8], [ 8,  4],
                [ 4,  9], [ 9, 10], [10,  2],

                [ 5, 11], [11, 17], [17, 12], [12,  6],
                [ 7, 13], [13, 18], [18, 14], [14,  8],
                [ 9, 15], [15, 19], [19, 16], [16, 10],

                [16, 11], [12, 13], [14, 15],
                [17, 20], [18, 20], [19, 20]
                ]
    },
    'stellated_dodecahedron' : {
        name: "Stellated Dodecahedron",
        zbump: true,
        initialevolve: true,
        zrotate: true,
        nodes: [[ 1, 't'],
                [ 2, 'u'],
                [ 3, 's'],
                [ 4, 'i'],
                [ 5, 'z'],
                [ 6, 'e'],
                [ 7, 'o'],
                [ 8, 'r'],
                [ 9, 'e'],
                [10, '*'],
                [11, 'c'],
                [12, 'n'],
                [13, 'p'],
                [14, 'o'],
                [15, '*'],
                [16, '*'],
                [17, '*'],
                [18, 'h'],
                [19, 'a'],
                [20, '*'],

                [21, '*'], 
                [22, '*'], 
                [23, '*'], 
                [24, '*'], 
                [25, '*'], 
                [26, '*'], 
                [27, '*'], 
                [28, '*'], 
                [29, '*'], 
                [30, '*'], 
                [31, '*'], 
                [32, '*'], 
                ],
        edges: [[ 1,  2], [ 1,  3], [ 1,  4],

                [ 2,  5], [ 5,  6], [ 6,  3],
                [ 3,  7], [ 7,  8], [ 8,  4],
                [ 4,  9], [ 9, 10], [10,  2],

                [ 5, 11], [11, 17], [17, 12], [12,  6],
                [ 7, 13], [13, 18], [18, 14], [14,  8],
                [ 9, 15], [15, 19], [19, 16], [16, 10],

                [16, 11], [12, 13], [14, 15],
                [17, 20], [18, 20], [19, 20],

                // stellations (outside)
                [21, 1], [21, 2], [21, 5], [21, 6], [21, 3],
                [22, 1], [22, 3], [22, 7], [22, 8], [22, 4],
                [23, 1], [23, 4], [23, 9], [23, 10], [23, 2],

                [24,  2], [24, 10], [24, 16], [24, 11], [24,  5],
                [25,  3], [25,  6], [25, 12], [25, 13], [25,  7],
                [26,  4], [26,  8], [26, 14], [26, 15], [26,  9],

                [27,  9], [27, 15], [27, 19], [27, 16], [27, 10],
                [28,  5], [28, 11], [28, 17], [28, 12], [28,  6],
                [29,  7], [29, 13], [29, 18], [29, 14], [29,  8],

                [30, 16], [30, 19], [30, 20], [30, 17], [30, 11],
                [31, 12], [31, 17], [31, 20], [31, 18], [31, 13],
                [32, 14], [32, 18], [32, 20], [32, 19], [32, 15]
                ]
    },
    'truss' : {
        name: "Truss",
        zbump: true,
        initialevolve: true,
        zrotate: true,
        nodes: [ [a1, 'a'], [a2, 'b'], [a3, 'c'],
                 [b1, 'd'], [b2, 'e'], [b3, 'f'],
                 [c1, 'g'], [c2, 'h'], [c3, 'i'],
                 [d1, 'j'], [d2, 'k'], [d3, 'l'],
                 [e1, 'm'], [e2, 'n'], [e3, 'o'],
                 [f1, 'p'], [f2, 'q'], [f3, 'r'],
                 [g1, 's'], [g2, 't'], [g3, 'u'],
                 [h1, 'v'], [h2, 'w'], [h3, 'x'],
                 [i1, 'x'], [i2, 'y'], [i3, 'z'],
                 ],
        edges: [ [a1, a2], [a2, a3], [a3, a1],
                 [a1, b1], [a2, b2], [a3, b3],
                 [a3, b2], [a2, b1], [a1, b3],
                 
                 [b1, b2], [b2, b3], [b3, b1],
                 [b1, c1], [b2, c2], [b3, c3],
                 [b3, c2], [b2, c1], [b1, c3],
                 
                 [c1, c2], [c2, c3], [c3, c1],
                 [c1, d1], [c2, d2], [c3, d3],
                 [c3, d2], [c2, d1], [c1, d3],
                 
                 [d1, d2], [d2, d3], [d3, d1],
                 [d1, e1], [d2, e2], [d3, e3],
                 [d3, e2], [d2, e1], [d1, e3],
                 
                 [e1, e2], [e2, e3], [e3, e1],
                 [e1, f1], [e2, f2], [e3, f3],
                 [e3, f2], [e2, f1], [e1, f3],
                 
                 [f1, f2], [f2, f3], [f3, f1],
                 [f1, g1], [f2, g2], [f3, g3],
                 [f3, g2], [f2, g1], [f1, g3],
                 
                 [g1, g2], [g2, g3], [g3, g1],
                 [g1, h1], [g2, h2], [g3, h3],
                 [g3, h2], [g2, h1], [g1, h3],
                 
                 [h1, h2], [h2, h3], [h3, h1],
                 [h1, i1], [h2, i2], [h3, i3],
                 [h3, i2], [h2, i1], [h1, i3],
                 
                 [i1, i2], [i2, i3], [i3, i1]
                 
                 ]
    },
    'ring_truss' : {
        name: "Ring Truss",
        zbump: true,
        initialevolve: true,
        zrotate: true,
        nodes: [ [a1, 'a'], [a2, 'b'], [a3, 'c'],
                 [b1, 'd'], [b2, 'e'], [b3, 'f'],
                 [c1, 'g'], [c2, 'h'], [c3, 'i'],
                 [d1, 'j'], [d2, 'k'], [d3, 'l'],
                 [e1, 'm'], [e2, 'n'], [e3, 'o'],
                 [f1, 'p'], [f2, 'q'], [f3, 'r'],
                 [g1, 's'], [g2, 't'], [g3, 'u'],
                 [h1, 'v'], [h2, 'w'], [h3, 'x'],
                 [i1, 'x'], [i2, 'y'], [i3, 'z'],
                 [j1, 'x'], [j2, 'y'], [j3, 'z'],
                 ],
        edges: [ [a1, a2], [a2, a3], [a3, a1],
                 [a1, b1], [a2, b2], [a3, b3],
                 [a3, b2], [a2, b1], [a1, b3],
                 
                 [b1, b2], [b2, b3], [b3, b1],
                 [b1, c1], [b2, c2], [b3, c3],
                 [b3, c2], [b2, c1], [b1, c3],
                 
                 [c1, c2], [c2, c3], [c3, c1],
                 [c1, d1], [c2, d2], [c3, d3],
                 [c3, d2], [c2, d1], [c1, d3],
                 
                 [d1, d2], [d2, d3], [d3, d1],
                 [d1, e1], [d2, e2], [d3, e3],
                 [d3, e2], [d2, e1], [d1, e3],
                 
                 [e1, e2], [e2, e3], [e3, e1],
                 [e1, f1], [e2, f2], [e3, f3],
                 [e3, f2], [e2, f1], [e1, f3],

                 [f1, f2], [f2, f3], [f3, f1],
                 [f1, g1], [f2, g2], [f3, g3],
                 [f3, g2], [f2, g1], [f1, g3],
                 
                 [g1, g2], [g2, g3], [g3, g1],
                 [g1, h1], [g2, h2], [g3, h3],
                 [g3, h2], [g2, h1], [g1, h3],
                 
                 [h1, h2], [h2, h3], [h3, h1],
                 [h1, i1], [h2, i2], [h3, i3],
                 [h3, i2], [h2, i1], [h1, i3],
                 
                 [i1, i2], [i2, i3], [i3, i1],
                 [i1, j1], [i2, j2], [i3, j3],
                 [i3, j2], [i2, j1], [i1, j3],
                 
                 [j1, j2], [j2, j3], [j3, j1],
                 [j1, a1], [j2, a2], [j3, a3],
                 [j3, a2], [j2, a1], [j1, a3],
                 ]
    },
    'box_springs' : make_box_springs(4, 4),
    'gobble_3x3' : make_gobble(3, 3),
    'gobble_4x4' : make_gobble(4, 4),
    'gobble_5x5' : make_gobble(5, 5),
    'gobble_3x5' : make_gobble(3, 5),
    'backtracking_test': {
        name: "backtracking test",
        zbump: false,
        zrotate: false,
        initialevolve: false,
        nodes: [[11, 'o'], [21, 'v'], [31, 'r'],
                [12, 'm'], [22, 'o'], [32, 'x'],
                [13, 'v'], [23, 'e'], [33, 'm']
                ],
        edges: [[11, 21], [21, 31],
                [12, 22], [22, 32],
                [13, 23], [23, 33],

                [11, 12], [12, 13],
                [21, 22], [22, 23],
                [31, 32], [32, 33],

                [11, 22], [12, 21], [21, 32], [22, 31],
                [12, 23], [13, 22], [22, 33], [23, 32]
                ]
    }

};

function make_gobble(x, y) {
    var _nodes = [];
    var _edges = [];
    for(var i=0; i < x; i++) {
        for(var j=0; j < y; j++) {
            _nodes.push(['g' + i + j, '*']);
            // rectilinear grid edges
            if (i < x-1) {
                _edges.push(['g' + i + j, 'g' + (i+1) + '' + j]);
            }
            if (j < y-1) {
                _edges.push(['g' + i + j, 'g' + i + '' + (j+1)]);
            }
            // kitty-corner grid edges
            if ((i < x-1) && (j < y-1)) {
                    _edges.push(['g' + i + j, 'g' + (i+1) + '' + (j+1)]);
                    _edges.push(['g' + (i+1) + '' + j, 'g' + i + '' + (j+1)]);
            }
        }
    }
    return {name: "gobble_" + x + 'x' + y,
            zbump: false,
            initialevolve: true,
            zrotate: false,
            nodes: _nodes,
            edges: _edges}
}            
            
function make_box_springs(x, y) {
    var _nodes = [];
    var _edges = [];
    for(var i=0; i < x; i++) {
        for(var j=0; j < y; j++) {
            _nodes.push(['a' + i + j, '*']);
            _nodes.push(['b' + i + j, '*']);
            if (i < x-1) {
                _edges.push(['a' + i + j, 'a' + (i+1) + '' + j]);
                _edges.push(['b' + i + j, 'b' + (i+1) + '' + j]);
            }
            if (j < y-1) {
                _edges.push(['a' + i + j, 'a' + i + '' + (j+1)]);
                _edges.push(['b' + i + j, 'b' + i + '' + (j+1)]);
            }
            var bij = 'b' + i + j;
            for(var ii=i; ii <= i+1; ii++) {
                if (ii < x) {
                    for(var jj=j; jj <= j+1; jj++) {
                        if (jj < y) {
                            _edges.push([bij, 'a' + ii + jj]);
                        }
                    }
                }
            }
        }
    }
    log("box springs(" + x + ", " + y + ").  nodes: " + _nodes);
    return {name: "box springs",
            zbump: true,
            initialevolve: true,
            zrotate: true,
            nodes: _nodes,
            edges: _edges}
}
            

function sn(node) {
    return node.to_string();
}

function sl(list) {
    var strs = [];
    for(var i=0; i < list.length; i++) {
        strs.push(list[i].to_string());
    }
    return strs.join(", ");
}
                       



/*
function nodes_to_string(nodelist) {
    var chars = [];
    for(var i=0; i < nodelist.length; i++) {
        var node = nodelist[i];
        chars.push(node.letter);
    }
    return chars.join();
}
*/
function load_puzzle(name) {
    var puzzle_json = g_puzzles[name];
    //log("load_+puzzle " + name + " : " + puzzle_json);
    if (puzzle_json) {
        pp.graph = new Graph(g_universe_radius);
        pp.graph.fill_from_json(puzzle_json);
        //log(pp.graph.debug_string());
        //pp.graph.calculate_fitness();
        pp.draw_graph();
        if (puzzle_json.zbump) {
            zbump();
        }
        if (puzzle_json.initialevolve) {
            new_letters_same_structure(10);
        }

        if (puzzle_json.zrotate) {
            g_rotating = true;
        } else {
            g_rotating = false;
            xRot = 0;
            yRot = 0;
            zRot = 0;
        }            
    }
    play_current_game();
}

function load_random_puzzle(nnodes, nedges) {
    var g_annealing_keep = g_annealing;
    stop();
    var grand = pp.graph.make_random_puzzle(nnodes, nedges);
    log("made random graph");
    log(grand.debug_string());
    pp.graph = grand;
    pp.graph.calculate_forces();
    pp.graph.calculate_fitness();
    pp.draw_graph();
    if (g_annealing_keep) {
        start_loop();
    }
}


function copy_and_append(list, elt) {
    var dolly = [];
    for(var i=0; i < list.length; i++) {
        dolly.push(list[i]);
    }
    dolly.push(elt);
    return dolly;
}


//
// this isn't quite right. the basic evolution process needs to be
// something like this:
//   1. create a set of child mutations from the parent(s)
//   2. anneal them for a bit, then take the fitness function of each
//   3. sort them by fitness (include the parents in that set)
//   4. choose the n best as the new set of parents.
//   5. display those n best
//   6. allow the user to choose another round or to select
//      from that set to direct the evolution.
//   (there may be a specified number of steps (1-4) before displaying
//    and allowing the users to choose).
//
//   So we'll need to decouple the mutation-and-anneal step from the display,
//   which means that the evolution needs to be done at the graph level rather
//   than the player level, so I guess we have another refactorin' to do...
//
//    in the meantime, though, we can try to mutate a single one.
// TODO: refactor this to us ehte graph rather than the player. then
//       display the graph in the player after sorting

function evolve_puzzle() {
    var gen_elt = document.getElementById('generations');
    var generations = parseInt(gen_elt.value);
    evolution_step(generations, mutation_players);
}

function evolution_step(generations, mut_players) {
    var anneal_steps = 25;
    var fitness_window = 10;

    if (!mutations || mutations.length == 0) {
        mutations = [pp.graph, pp.graph, pp.graph];
    }
    for(var n=0; n < generations; n++) {
        log("Evolution step. generation " + n);
        mutations = spawn_n_mutations_per(num_mutations_per, mutations, anneal_steps);
        var sorted_mutations = sort_mutations(mutations, fitness_window);
        mutations = [];
        for(var i=0; i < num_evolution_results; i++) {
            var bmut_graph_pair = sorted_mutations[i];
            var surviving_mutation = bmut_graph_pair[1];
            mutations.push(surviving_mutation);
            //log("Showing best[" + i + "th] fitness: " + bmut_graph_pair[0]);
            show_mutated_graph(i, surviving_mutation);
        }
    }
}

function mutate_main_puzzle() {
    mutate_puzzle(pp, true);
}

function mutate_again(nth) {
    var mut_canvas = document.getElementById('mutation_' + nth);
    var mut_player = mut_canvas.pp;
    if (mut_player) {
        mutate_puzzle(mut_player, true);
    }
}

function mutate_puzzle(ppuzzle, show_results) {
    var anneal_steps = 25;
    var fitness_window = 10;
    mutations =
        spawn_n_mutations_per(2 * num_mutations_per,
                              [ppuzzle.graph],
                              anneal_steps);
    var best_mutations = sort_mutations(mutations, fitness_window);
    /*
    for(var i=0; i < best_mutations.length; i++) {
        log("sorted mut: [" + best_mutations[i][0] + ", " + best_mutations[i][1].name + "]");
    }
    */
    if (show_results) {
        for(var i=0; i < num_evolution_results; i++) {
            var bmut_graph_pair = best_mutations[i];
            //log("Showing best[" + i + "th] fitness: " + bmut_graph_pair[0]);
            show_mutated_graph(i, bmut_graph_pair[1]);
        }
    }
}

function spawn_n_mutations_per(nmut, graphs, anneal_steps) {
    var mutations = [].concat(graphs);
    for(var i=0; i < graphs.length; i++) {
        var original_graph = graphs[i];
        for(var m=0; m < nmut; m++) {
            var gcopy = original_graph.clone();
            mutations.push(gcopy);
            //log("Cloned graph. universe_radius: " + gcopy.universe_radius);
            //log(gcopy.debug_string());
            gcopy.make_a_mutation();
            for(var s=0; s < anneal_steps; s++) {
                gcopy.anneal_step();
            }
        }
    }
    return mutations;
}

function sort_mutations(mutations, fitness_window) {
    // simple insertion sort. 
    var sorted_pairs = [];
    for(var m=0; m < mutations.length; m++) {
        var mutation = mutations[m];
        var avg_fitness = 0;
        for(var s=0; s < fitness_window; s++) {
            mutation.anneal_step();
            var fitness = mutation.calculate_fitness();
            avg_fitness += fitness;
        }
        avg_fitness = fitness / fitness_window;
        //log("mutation[" + m + "]. avg_fitness: " + avg_fitness);
        var pair = [avg_fitness, mutation];
        insert_pair(pair, sorted_pairs);
    }
    return sorted_pairs;
}

function insert_pair(pair, sorted_pairs) {
    for(var i=0; i < sorted_pairs.length; i++) {
        var spair = sorted_pairs[i];
        if (pair[0] > spair[0]) {
            sorted_pairs.splice(i, 0, pair);
            return sorted_pairs;
        }
    }
    sorted_pairs.push(pair);
    return sorted_pairs;
}

function test_insert_pair() {
    var unsorted =
        [[34, "34"], [12, "12"], [8, "8"], [9, "9"],
         [1, "1"], [7, "7"], [15, "15"]
         ];
    var sorted = [];
    log("testing insert_pair()");
    for(var i=0; i < unsorted.length; i++) {
        log(" inserting: " + unsorted[i]);
        insert_pair(unsorted[i], sorted);
        log("    sorted(after): " + sorted);
    }
    log("tested insert_pair()");
}

function jostle_puzzle(nth) {
    var mut_player;
    if (nth == 'main') {
        mut_player = pp;
    } else {   
        var mut_canvas = document.getElementById('mutation_' + nth);
        mut_player = mut_canvas.pp;
    }

    if (mut_player) {
        mut_player.graph.mutate_move_two_nodes_to_corners();
    }
}

function make_mutation_main_puzzle(nth) {
    var mut_canvas = document.getElementById('mutation_' + nth);
    var mut_player = mut_canvas.pp;
    if (mut_player) {
        pp.graph = mut_player.graph;
        pp.graph.reset();
        pp.graph.calculate_forces();
        pp.graph.move_nodes();
        pp.graph.calculate_fitness();
        pp.draw_graph();
    }
    show_tab('play', ['tune', 'evolve']);
    play_input.focus();
}

function show_mutated_graph(nth, mgraph) {
    var mut_canvas = document.getElementById('mutation_' + nth);
    var mut_player = mut_canvas.pp;
    if (mut_player) {
        mut_player.graph = mgraph;
        mut_player.graph.reset();
        mut_player.graph.calculate_forces();
        mut_player.graph.move_nodes();
        mut_player.graph.calculate_fitness();
        mut_player.draw_graph();
        display_fitness_level(mut_player.graph, nth);
    }
}

function mutate_once(nth) {
    /*
    var mut_canvas = document.getElementById('mutation_' + nth);
    var mut_player = mut_canvas.pp;
    */
    var mut_player = pp;
    mut_player.graph.make_a_mutation();
    recombobulate(mut_player, nth);
}
function recombobulate(mut_player, nth) {
    mut_player.graph.calculate_forces();
    mut_player.graph.move_nodes();
    mut_player.graph.calculate_fitness();
    mut_player.draw_graph();
    display_fitness_level(mut_player.graph, nth);
}

function test_mutate_remove_node(nth) {
    var mut_player = pp;
    mut_player.graph.mutate_remove_a_node();
    recombobulate(mut_player, nth);
}

function test_mutate_add_node(nth) {
    var mut_player = pp;
    mut_player.graph.mutate_add_a_node();
    recombobulate(mut_player, nth);
}

function test_mutate_add_edge(nth) {
    var mut_player = pp;
    mut_player.graph.mutate_add_an_edge();
    recombobulate(mut_player, nth);
}

function test_mutate_remove_edge(nth) {
    var mut_player = pp;
    mut_player.graph.mutate_remove_an_edge();
    recombobulate(mut_player, nth);
}

function test_mutate_change_letter(nth) {
    var mut_player = pp;
    mut_player.graph.mutate_change_a_nodes_letter();
    recombobulate(mut_player, nth);
}

function display_main_fitness_level() {
    pp.graph.calculate_fitness();
    display_fitness_level(pp.graph, 'main');
}

function display_fitness_level(graph, nth) {
    var origin_elt = document.getElementById("mgraph_origin_" + nth);
    var mutations_elt = document.getElementById("mgraph_mutations_" + nth);
    var fitness_words_elt = document.getElementById("fitness_words_" + nth);
    var fitness_edges_elt = document.getElementById("fitness_edges_" + nth);
    var fitness_weighted_elt = document.getElementById("fitness_weighted_" + nth);
    origin_elt.innerHTML = graph.origin; 
    mutations_elt.innerHTML = "" + graph.num_mutations;
    fitness_words_elt.innerHTML = "" + graph.fitness_words;
    fitness_edges_elt.innerHTML = "" + graph.fitness_crossing_edges;
    fitness_weighted_elt.innerHTML = "" + round2(graph.fitness);
}

function make_some_mutations(mut_player) {
    var nmut = random_range(1, 4);
    for(var i=0; i < nmut; i++) {
        mut_player.graph.make_a_mutation();
    }
}

function set_element_contents(id, value) {
    var elt = document.getElementById(id);
    if (elt) {
        elt.innerHTML = "" + value;
    }
}

var DEGREES_TO_RADIANS = Math.PI / 180;
function degToRad(degrees) {
    return degrees * DEGREES_TO_RADIANS;
}
