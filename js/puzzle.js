var pz_canvas;  // main puzzle canvas
var pp; // main PuzzlePlayer
var bg_color = "#222"; // "#d0e0f1";
var play_input;
var found_words;
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

var g_step_time = 60;  // ms
var g_annealing = false;
var nticks = 0;
var g_universe_radius = 25;
var num_mutations_per = 4;
var mutations = [];
var num_evolution_results = 4;
var mutation_players = [];

function load(pz_id) {
    pz_canvas = document.getElementById(pz_id);
    pp = new PuzzlePlayer(pz_canvas, 450., 450., g_universe_radius);
    //log("LOAD. pp: " + pp);
    pz_canvas.pp = pp;
    show_tab('play', ['tune', 'evolve']);
    setup_input();
    setup_evolution_results();
    load_puzzle('popcorn');
    setup_dictionary();
    //log(pp.graph.debug_string());
    clear();
    pp.graph.calculate_forces();
    pp.draw_graph();
    // let's start off with it annealing
    g_annealing = true;
    set_fitness_words(.5);
    set_fitness_edges(.5);
    set_fitness_average_tension(.2);
    set_fitness_max_tension(0);
    
    start_loop();
}

function log(msg) {
    console.log(msg);
}

function setup_input() {
    play_input = document.getElementById("play_input");
    play_input.focus();
    found_words = document.getElementById("found_words");
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
    if (edgelist.length > 0 && edgelist.state == WORD) {
        play_input.value = "";
        //console.log("Entering word: " + word + " into found_words list");
        found_words.value += (word + "\n");
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

function onestep() {
    pp.anneal_step();
    for(var m=0; m < mutation_players.length; m++) {
        mutation_players[m].anneal_step();
    }
}

function clear() {
    pp.clear_canvas();
    found_words.value = "";
}


function tick() {
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
    found_words.value = "";
    found_words.value += "-- " + all_words.length + " words --\n";
    found_words.value += all_words.join("\n");
    found_words.value += "\n--------\n";
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
                  
function isWord(s) {
    return dictionary_contains(s);
}

function dictionary_contains(w) {
    for(var i=0; i < dictionary.length; i++) {
        if (dictionary[i] == w) {
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
var g_puzzles = {
    'popcorn': {
        name: "popcorn",
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
    }
};


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
    }
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
    mutate_puzzle(pp);
}

function mutate_again(nth) {
    var mut_canvas = document.getElementById('mutation_' + nth);
    var mut_player = mut_canvas.pp;
    if (mut_player) {
        mutate_puzzle(mut_player);
    }
}

function mutate_puzzle(ppuzzle) {
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
    for(var i=0; i < num_evolution_results; i++) {
        var bmut_graph_pair = best_mutations[i];
        //log("Showing best[" + i + "th] fitness: " + bmut_graph_pair[0]);
        show_mutated_graph(i, bmut_graph_pair[1]);
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
    var mut_canvas = document.getElementById('mutation_' + nth);
    var mut_player = mut_canvas.pp;
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

function round2(n) {
  return Math.floor(n * 100.) / 100.;
}
