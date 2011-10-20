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

var sines_datasource = null;
var current_datasource = null;
var current_datasource_name = null;
var current_datasource_size = 15;

function load(pz_id) {
    pz_canvas = document.getElementById(pz_id);
    // TODO: use canvas's actual size. 
    pp = new Mapper(pz_canvas, 500., 500., g_universe_radius);
    //log("LOAD. pp: " + pp);
    pz_canvas.pp = pp;
    show_tab('datasets', ['tune']);
    set_current_datasource('random');
    create_bubbles_from_datasource(current_datasource);
    display_dataset(current_datasource);

    /*
    if (g_testing) {
        load_bubbles(make_random_bubbles(2, 5, 50));
    } else {
        load_bubbles(make_random_bubbles(20, 1, 30));
        for(var i=0; i < 9; i++) {
            add_bubble(pp.graph, ('s' + i), ('S' + i), random_range(1, 2), 1, 30);
        }
        pp.graph.recombobulate_value_ranks();
    }
    */
    //log(pp.graph.debug_string());
    clear();
    pp.graph.calculate_forces();
    pp.draw_graph();
    // let's start off with it annealing
    g_annealing = true;
    start_loop();
}

function set_current_datasource(name) {
    current_datasource_name = name;
    if (name == 'random') {
        log("RAND!");
        current_datasource = new RandomDataSource(current_datasource_size);
    } else if (name == 'random_sines') {
        current_datasource = new RandomSinesDataSource(current_datasource_size);
    }
    swap_in_datasource(current_datasource);
}

function set_current_datasource_size(size) {
    current_datasource_size = size;
    set_current_datasource(current_datasource_name);
}

function swap_in_datasource(datasource) {
    if (!pp.graph || pp.graph.num_nodes == 0) {
        create_bubbles_from_datasource(datasource);
    } else {
        pp.graph.ensure_center_node();
        //
        // first target all the current bubbles down to negative,
        // so they'll disapparate.
        //
        pp.graph.target_nodes_to_negative();
        
        //
        // then add all the bubbles from this datasource
        //
        add_bubbles_from_datasource(datasource);
    }

}

function set_mode(mode) {
    if (mode == 'play') {
    } else if (mode == 'tune') {
    }
}

function set_friction(val) {
    Mapper.friction = val;
}

function set_step_time(st) {
    g_step_time = st;
}

function set_delta_t(val) {
    Mapper.delta_t = val;
}

function set_node_repulsion(val) {
    Mapper.node_repulsion = val;
}

function set_trails(val) {
    Mapper.trails = val;
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

function clear() {
    pp.clear_canvas();
}

function onestep() {
    pp.anneal_step();
}

function tick() {
    //log("tick[" + nticks + "]. pp.trails: " + pp.trails);
    pp.clear_canvas();
    /*
    if (pp.trails == 0) {
        pp.clear_canvas();
    } else if (pp.trails == -1) {
        // don't clear...
    } else {
        pp.clear_canvas_for_trails(pp.trails);
    }
    */
    pp.graph.animate_values();
    if (nticks % 15 == 0) {
        update_bubbles_from_datasource(current_datasource);
        display_dataset(current_datasource);
    }

    if (g_annealing) {
        pp.anneal_step();
    }
    nticks++;
}

function calculate_forces_once() {
    pp.graph.calculate_forces();
    pp.draw_graph();
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
    log("mouse down. target: " + ev.target);
    log("mouse down. target.pp: " + ev.target.pp);
    var player = ev.target.pp;
    player.mousing = true;
    var worldmouse = get_world_coordinates(player, ev);
    log(" DOwn. worldmouse = " + sv(worldmouse));
    for(var i=0; i < player.graph.num_nodes(); i++) {
        var node = player.graph.get_node(i);
        log("  testing node: " + sn(node) );
        if (node.point_hits_node(worldmouse)) {
            log("   HIT: [" + node.caption + "]");
            node.highlighted = HIGHLIGHT_LEVEL_DRAGGING;
            player.dragging_node = node;
            node.is_dragging = true;
            player.draw_graph();
            return;
        }
    }
}

function on_mouseup(ev) {
    var player = ev.target.pp;
    if (player.mousing) {
        if (player.dragging_node) {
            player.dragging_node.highlighted = HIGHLIGHT_LEVEL_NONE;
            player.draw_graph();
        }
    }
    player.mousing = false;
    if (player.dragging_node) {
        player.dragging_node.is_dragging = false;
    }
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
                  
function load_bubbles(bmap_json) {
    var bmap_id = bmap_json['id'];
    log("load_bubbles[" + bmap_id + "]: " + dump(bmap_json));
    if (bmap_json) {
        pp.graph = new Graph(g_universe_radius);
        pp.graph.fill_from_json(bmap_id, bmap_json);
        //log(pp.graph.debug_string());
        //pp.graph.calculate_fitness();
        pp.draw_graph();
        g_rotating = false;
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

function create_bubbles_from_datasource(datasource) {
    pp.graph = new Graph(g_universe_radius);
    pp.graph.add_center_node();
    log("create bubbels");
    add_bubbles_from_datasource(datasource);
}
function add_bubbles_from_datasource(datasource) { 
    var now = new Date().getTime();
    var names_ids = datasource.getDataNamesAtTime(now);
    log("add bubbels. names: " + names_ids);
    for(var i=0; i < names_ids.length; i++) {
        var id_name = names_ids[i];
        var id = id_name[0];
        var caption = id_name[1];
        var value = datasource.getValueAtTime(now, id);
        log("   Cbub[" + name + "] => " + value);
        add_bubble(pp.graph, id, caption, value);
    }
    pp.graph.recombobulate_value_ranks();
}

var last_time = -1;
function update_bubbles_from_datasource(datasource) {
    var now = new Date().getTime();
    var target_time;
    if (last_time > 0) {
        target_time = now - last_time;
    } else {
        target_time = 120; // ms?
    }
    last_time = now;
    var names_ids = datasource.getDataNamesAtTime(now);
    var changed = false;
    for(var i=0; i < names_ids.length; i++) {
        var id_name = names_ids[i];
        var id = id_name[0];
        var caption = id_name[1];
        var value = datasource.getValueAtTime(now, id);
        var bubble = pp.graph.get_node_by_id(id);
        if (bubble) {
            if (value < 0) {
                pp.graph.remove_node(bubble);
                changed = true;
            } else {
                bubble.set_target_value(value, target_time, g_step_time);
            }
        } else {
            add_bubble(pp.graph, id, caption, value);
            changed = true;
        }
    }
    if (changed) {
        pp.graph.recombobulate_value_ranks();
    } else {
        //pp.graph.recombobulate_value_ranks();
        //pp.graph.update_value_ranks();
    }
}

function display_dataset(datasource) {
    var dataset_elt = document.getElementById('dataset');
    var now = new Date().getTime();
    var lines = [];
    lines.push("<table><tr>");
    var names_ids = datasource.getDataNamesAtTime(now);
    for(var i=0; i < Math.floor(names_ids.length/2) + 1; i++) {
        lines.push("<th align='left'>" + names_ids[i][1] + "</th>");
    }
    lines.push("</tr>");
    lines.push("<tr>");
    for(var i=0; i < names_ids.length; i++) {
        var name_id = names_ids[i];
        var id = name_id[0];
        var caption = name_id[1];
        var value = datasource.getValueAtTime(now, id);
        lines.push("<td>" + round2(value) + "</td>");
        if (i == Math.floor(names_ids.length/2)) {
            lines.push("</tr>");
            lines.push("<tr>");
            for(var j=i+1; j < names_ids.length; j++) {
                lines.push("<th align='left'>" + names_ids[j][1] + "</th>");
            }
            lines.push("</tr>");
            lines.push("<tr>");
        }
    }
    lines.push("</tr>");
    dataset_elt.innerHTML = lines.join('');
}
                            