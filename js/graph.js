function Graph(universe_radius) {
    this.name = "";
    this.origin = null;
    this.nodes = new Array();  // associative array
    this.nodeids = [];
    this.edges = [];
    this.universe_radius = universe_radius;
    this.universe_width = 2 * universe_radius;
    this.next_node_id = 0;
    this.nce = -1;
    this.num_mutations = 0;
}

Graph.prototype.clone = function() {
    var dolly = new Graph(this.universe_radius);
    dolly.universe_radius = this.universe_radius;
    dolly.universe_width = 2 * this.universe_radius;
    dolly.next_node_id = this.next_node_id;
    dolly.name = this.name;
    dolly.num_mutations = this.num_mutations;
    if (this.origin == null) {
        dolly.origin = this.name;
    } else {
        dolly.origin = this.origin;
    }
    for(var i=0; i < this.num_nodes(); i++) {
        var node = this.get_node(i);
        dolly.add_node(node.id, node.letter, node.position.clone());
    }
    for(var e=0; e < this.num_edges(); e++) {
        var edge = this.get_edge(e);
        dolly.add_edge(edge.from.id, edge.to.id);
    }
    return dolly;
}

Graph.prototype.num_nodes = function() {
    return this.nodeids.length;
}

Graph.prototype.get_node = function(i) {
    return this.nodes[this.nodeids[i]];
}

Graph.prototype.num_edges = function() {
    return this.edges.length;}


Graph.prototype.get_edge = function(i) {
    return this.edges[i];
}

Graph.prototype.generate_next_node_id = function() {
    this.next_node_id++;
    return this.next_node_id;
}

Graph.spring_coefficient = 10.;

Graph.prototype.fill_from_json = function(graphspec) {
    this.name = graphspec.name;
    var nodespecs = graphspec.nodes;
    for(var i=0; i < nodespecs.length; i++) {
        var nodespec = nodespecs[i];
        //log("adding nodespec: [" + nodespec + "]");
        var nodepos;
        if (nodespec.length > 2) {
            nodepos = make_vec3(nodespec[2]);
        } else {
            nodepos = this.random_node_position();
        }
        this.add_node(nodespec[0], nodespec[1], nodepos);
    }
    var edgespecs = graphspec.edges;
    for(var i=0; i < edgespecs.length; i++) {
        var edgespec = edgespecs[i];
        this.add_edge(edgespec[0], edgespec[1]);
    }
}

function make_vec3(coords) {
    return new Vec3(coords[0], coords[1], coords[2]);
}
            
Graph.prototype.add_node = function(nodeid, letter, pos) {
    var l = letter;
    if (l == '*' || l == '') {
        l = random_letter();
    }
    var node = new Node(nodeid, l);
    //log("Add Node: " + node.letter + node.id + " pos: <" + sn(pos) + ">");
    if (!pos || pos == '*') {
        pos = this.random_node_position();
    }
    node.set_position(pos);
    //log("Add Node (after move): " + sn(node));
    this.nodes[nodeid] = node;
    this.nodeids.push(nodeid);
    this.invalidate_solution();
    this.generate_next_node_id();
    return node;
}

Graph.prototype.add_edge = function(node_id1, node_id2) {
    //log("add edge: <" + node_id1 + " => " + node_id2 + ">");
    var node1 = this.nodes[node_id1];
    var node2 = this.nodes[node_id2];
    //log("add edge: " + s(node1) + " => " + s(node2));
    var edge = new Edge(node1, node2);
    node1.add_edge(edge);
    node2.add_edge(edge);
    this.edges.push(edge);
    this.invalidate_solution();
}

Graph.prototype.reset = function() {
    for(var i=0; i < this.nodeids.length; i++) {
        var node = this.nodes[this.nodeids[i]];
        node.reset_position();
        node.reset_velocity();
    }
}

Graph.prototype.centroid = function() {
    var position_sum = new Vec3(0, 0, 0);
    if (this.num_nodes() == 0) {
        return position_sum;
    }
    for(var i=0; i < this.num_nodes(); i++) {
        var node = this.get_node(i);
        position_sum.plus_equals(node.position);
    }
    position_sum.times_equals(1.0 / this.num_nodes());
    return position_sum;
}

Graph.prototype.find_matching_nodes = function(char) {
    var matching_nodes = [];
    for(var i=0; i < this.nodeids.length; i++) {
        var node = this.nodes[this.nodeids[i]];
        if (node.letter == char) {
            matching_nodes.push(node);
        }
    }
    return matching_nodes;
}

Graph.prototype.walk = function(history, word_chars, current_node, level) {
    if (level > this.num_nodes()) {
        // this is a backup in case the loop checking fails for some reason
        //log("TOO MANY LEVELS: " + level + " while we only have " + this.num_nodes() + " nodes.");
        return;
    }
    //log(level + ": G.walk(" + s(current_node) + ") history: " + node_history_to_string(history))
    if (node_history_contains(history, current_node)) {
        return;
    }
    var new_history = copy_and_append(history, current_node);
    var new_word_chars = copy_and_append(word_chars, current_node.letter);
    //history.concat([current_node]); //history.push_and_return_a_copy(current_node);
    //log(level + ": New history: " + node_history_to_string(new_history));
    //var word = nodes_to_string(new_history);
    //log(level + ": testing new hist : " + node_history_to_string(new_history) + " new_word_chars: {" + new_word_chars + "}");
    var result = test_word_chars(new_word_chars, new_word_chars.length);
    //log("test(" + new_word_chars + ") ==> " + result);
    if (result == WORD) {
        //log("WORD: " + new_word_chars);
        this.register_word(new_word_chars.join(''));
    }
    //
    // If we know the current history is not a prefix of any words
    // in the dictionary, we don't have to recurse further from here.
    //   (and we can know that if we represent the dictionary as a sorted prefix trie).
    //
    if (result == WORD || result == PREFIX) {
        for(var i=0; i < current_node.edges.length; i++) {
            var edge = current_node.edges[i];
            var child_node = edge.get_node_that_isnt(current_node);
            //log(level + ": child: " + s(child_node));
            this.walk(new_history, new_word_chars, child_node, (level+1));
        }
    }
}

function node_history_contains(history, node) {
    for(var i=0; i < history.length; i++) {
        if (history[i] == node) {
            return true;
        }
    }
    return false;
}

function node_history_to_string(history) {
    var chars = [];
    for(var i=0; i < history.length; i++) {
        chars.push(s(history[i]));
    }
    return "[" + chars.join(", ") + "]";
}

Graph.prototype.register_word = function(word) {
    this.all_words.push(word);
}

function nodes_to_string(nodelist) {
    var chars = [];
    for(var i=0; i < nodelist.length; i++) {
        chars.push(nodelist[i].letter);
    }
    return chars.join("");
}   

Graph.prototype.debug_string = function() {
    var strs = [];
    strs.push("Name: " + this.name);
    strs.push("Nodes:");
    for(var i=0; i < this.nodeids.length; i++) {
        var node = this.nodes[this.nodeids[i]];
        var edgestrs = [];
        for(var e=0; e<node.edges.length; e++) {
            var ne = node.edges[e];
            edgestrs.push(ne.to_string());
        }
        strs.push(node.to_string() + " || " + edgestrs.join(" "));
    }
    strs.push("Edges:");
    for(var e=0; e < this.num_edges(); e++) {
        strs.push(sv(this.get_edge(e)));
    }
    return strs.join("\n");
}

Graph.prototype.find_all_words = function() {    
    this.all_words = [];
    this.solve();
    return this.all_words;
}

Graph.prototype.solve = function() {
    for(var i=0; i < this.num_nodes(); i++) {
        var node = this.get_node(i);
        //log("G.solve. start: " + s(node));
        this.walk([], [], node, 0);
    }
} 

Graph.prototype.find_solution = function(chars) {
    var char = chars[0];
    var first_nodes = this.find_matching_nodes(char);
    //log("G.find_solution(" + chars + ") first nodes: " + sl(first_nodes));
    if (first_nodes.length == 0) {
        return [];
    }
    this.unhighlight_all();
    var edgelist = [];
    for(var i=0; i < first_nodes.length; i++) {
        var first_node = first_nodes[i];
        //first_node.highlighted = HIGHLIGHT_LEVEL_PATH;
        edgelist.first_node = first_node;
        edgelist = this.walk_input(first_node, chars, 0, edgelist);
        if (edgelist.length > 0) {
            if (edgelist.state == FAIL || edgelist.state == WORD) {
                return edgelist;
            }
        }
    }
    return edgelist;
}

Graph.prototype.walk_input = function(node, chars, chindex, history) {
    //log("walk_input(" + s(node) + ") [" + chars + "]@chindex: "+chindex + " history: " + sl(history));
    var result = test_word_chars(chars, chindex + 1);
    // note that the results from the dictionary are crafted to
    // match the highlight states.
    //log("walk_cahrs. result: " + result);
    this.highlight_edgelist(history, result);
    if (chindex >= (chars.length - 1)) {
        history.state = result;
        if (result == WORD) {
            wiggle_node(node);
        }
        return history;
    }

    //
    // if we know we don't have any valid words from this prefix,
    // we know we'll never get a word unless the user backtracks a bit,
    // but we still want to keep highlighting the path.
    // so we trudge on.
    // It's only in the find-all-words case that we want to use the
    // PREFIX/FAIL distinction to prune the search tree.
    //
    var ch = chars[chindex+1];
    var matching_edges = node.find_matching_edges(ch);
    //log("  find_matching_edges ch[" + (chindex+1) + "]: " + ch + " edges: " + sl(matching_edges));
    for(var e=0; e < matching_edges.length; e++) {
        var edge = matching_edges[e];
        var next_node = edge.get_node_that_isnt(node);
        //log("  walk_input[" + ch + "] testing edge: " + sn(edge) + " (specifically next node: " + sn(next_node) + " against history: " + history);
        if (!edge_history_contains(next_node, history)) {
            //log("   => no loop. add edge " + sn(edge) + " to history");
            var newHistory = copy_and_append(history, edge);
            var result_edgelist = this.walk_input(next_node, chars, chindex+1, newHistory);
            if (result_edgelist.length > 0 && result_edgelist.state == WORD) {
                return result_edgelist;
            }
            // otherwise, we may need to backtrack.
        }
    }
    var empty = [];
    empty.state = FAIL;
    return empty;
}

function edge_history_contains(node, edgelist) {
    for(var i=0; i < edgelist.length; i++) {
        var edge = edgelist[i];
        if (node == edge.to || node == edge.from) {
            return true;
        }
    }
    return false;
}

Graph.prototype.highlight_edgelist = function(edgelist, highlight_level) {
    if (edgelist.length > 0) {
        this.unhighlight_all();
    }
    if (edgelist.first_node) {
        edgelist.first_node.highlighted = highlight_level;
    }
    for(var e=0; e < edgelist.length; e++) {
        var edge = edgelist[e];
        edge.highlighted = highlight_level;
        edge.to.highlighted = highlight_level;
        edge.from.highlighted = highlight_level;
    }
}

Graph.prototype.unhighlight_all = function() {
    for(var e=0; e < this.edges.length; e++) {
        var edge = this.edges[e];
        edge.highlighted = HIGHLIGHT_LEVEL_NONE;
    }
    for(var i=0; i < this.nodeids.length; i++) {
        var node = this.nodes[this.nodeids[i]];
        node.highlighted = HIGHLIGHT_LEVEL_NONE;
    }
}

function wiggle_edge(edge) {
    wiggle_node(edge.from);
    wiggle_node(edge.to);
}
    
function wiggle_node(node) {
    var wrange = node.radius;
    var wx = random_range(-wrange, wrange);
    var wy = random_range(-wrange, wrange);
    var wz = 0;
    node.position.x += wx;
    node.position.y += wy;
    node.position.z += wz;
}

Graph.prototype.highlight_node_and_edges = function(node, level) {
    node.highlighted = level;
    for(var i=0; i < node.edges.length; i++) {
        var edge = node.edges[i];
        edge.highlighted = level;
    }
}

Graph.prototype.random_node_position = function() {
    var range_low = .2 * 2 * this.universe_radius;
    var range_high = .7 * 2 * this.universe_radius;
    //log("random node pos. graph.universe_radius: " + this.universe_radius + " rlow: " + range_low + " rhigh: " + range_high);
    return new Vec3(random_range(range_low, range_high), random_range(range_low, range_high), 0);
}

Graph.prototype.make_random_puzzle = function(nnodes, nedges) {
    var g = new Graph(this.universe_radius);
    g.name = "Random<" + nnodes + ", " + nedges + ">";
    for(var i=0; i < nnodes; i++) {
        var nodepos = this.random_node_position();
        var letter = random_letter();
        //log("Make random node. letter: " + letter + " @: " + sv(nodepos));
        g.add_node(i, letter, nodepos);
    }
    var ne = 0;
    var max_edges = nnodes * (nnodes - 1) / 2;
    var sparseness = nedges / max_edges;
    log("make random edges. sparseness: " + sparseness);
    for(var i=0; i < nnodes; i++) {
        for(var j=i+1; j < nnodes; j++) {
            if (random_chance(sparseness)) {
                g.add_edge(i, j);
            }
        }
    }
    return g;
}
 
function factorial(x) {
    if (x <= 2)  return 1;
    var f = 1;
    for(var i=x; i >= 2; i--) {
        f *= i;
    }
    return f;
}

Graph.prototype.test_and_highlight_input = function(word) {
    //log("G.test_and_highlight_input(" + word + ")");
    var chars = split(word);
    this.unhighlight_all();
    var edgelist = this.find_solution(chars);
    //log("  edgelist: " + sl(edgelist) + " result: " + edgelist.state);
    if (edgelist.length > 0) {
        this.highlight_edgelist(edgelist, edgelist.state);
    }
    //log("test_and_highlight[" + word + "] => " + sl(edgelist));
    return edgelist;
}

Graph.prototype.anneal_step = function() {
    this.calculate_forces();
    this.move_nodes();
}

Graph.prototype.calculate_forces = function() {
    // zero out the net forces on the nodes
    for(var i=0; i < this.num_nodes(); i++) {
        this.get_node(i).net_force.zero();
    }
    //log("CALC FORCES: Edges");
    for(var e=0; e < this.edges.length; e++) {
        var edge = this.edges[e];
        var tension =
            this.apply_spring_force(edge.from, edge.to, edge.preferred_distance, false);
        edge.tension = tension;
        edge.tension_to_color(this.universe_radius);
    }
    if (PuzzlePlayer.node_repulsion > 0) {
        //log("CALC FORCES: node repulsion(" + PuzzlePlayer.node_repulsion + ")");
        for(var i=0; i < this.num_nodes(); i++) {
            for(var j=i+1; j < this.num_nodes(); j++) { 
                var nodei = this.get_node(i);
                var nodej = this.get_node(j);
                this.apply_spring_force(nodei, nodej, PuzzlePlayer.node_repulsion, true);
            }
        }
    }
}

Graph.prototype.move_nodes = function() {
    //log("Move nodes");
    for(var i=0; i < this.num_nodes(); i++) {
        var node = this.get_node(i);
        if (!node.fixed && !node.is_dragging) {
            //log("   Move " + sn(node));
            var force_mag = node.net_force.magnitude();
            //log("   NET force: " + sn(node.net_force) + " delta_t: " + PuzzlePlayer.delta_t);
            var A = node.net_force.times_equals(node.mass_reciprocal);
            node.velocity.plus_factor_equals(A, PuzzlePlayer.delta_t);
            node.position.plus_factor_equals(node.velocity, PuzzlePlayer.delta_t);
            node.velocity.times_equals(PuzzlePlayer.friction);
            //log("   A: " + sv(A));
            //log("   vel: " + sv(node.velocity));
            //log("  pos(after): " + sv(node.position));
            this.maybe_bounce(node);
        }
    }
}                             


Graph.prototype.maybe_bounce = function(node) {
    var r = node.radius;
    if (node.position.x < r) {
        node.position.x = r;
        node.velocity.x = .001;
        //log("maybe_bounce. X < 0. " + sn(node) + " vel: " + sn(node.velocity))
    } else if (node.position.x > this.universe_width - r) {
        node.position.x = this.universe_width - r;
        node.velocity.x = -.001;
        //log("maybe_bounce. X > Uw  " + sn(node) + " vel: " + sn(node.velocity))
    }
    if (node.position.y < r) {
        node.velocity.y = .001;
        node.position.y = r;
    } else if (node.position.y > this.universe_width - r) {
        node.velocity.y = -.001;
        node.position.y = this.universe_width - r;
    }
    if (node.position.z > 0 && node.position.z < r) {
        node.velocity.z = .001;
        node.position.z = r;
    } else if (node.position.z > this.universe_width - r) {
        node.velocity.z = -.001;
        node.position.z = this.universe_width - node.radius;
    }
}

Graph.prototype.apply_spring_force =
       function(from_node, to_node, preferred_distance, repulsion_only) {
    var difference = to_node.position.minus(from_node.position);
    var magnitude = difference.magnitude();
    magnitude = Math.max(1, magnitude);
    if (!repulsion_only || magnitude < preferred_distance) {
        var tension = (magnitude - preferred_distance) / preferred_distance;
        //console.log("  SF. mag[" + sn(from_node) + " => " +sn(to_node) + "]: diff: " + sv(difference) + " mag: " + magnitude + " pref: " + preferred_distance + " tension: " + tension);
        var mag_force = tension * Graph.spring_coefficient / magnitude;
        var force = difference.times_equals(mag_force);
        from_node.net_force.plus_equals(force);
        to_node.net_force.minus_equals(force);
        return tension;
    }
}    

////////////////////////////////
//// Evolution stuffs       ////
////////////////////////////////



Graph.prototype.calculate_fitness = function() {
    var fitness = 0;
    if (PuzzlePlayer.fitness_param_numwords > 0) {
        this.fitness_words = this.num_words();
        fitness +=
            this.fitness_words * PuzzlePlayer.fitness_param_numwords;
    }
    if (PuzzlePlayer.fitness_param_crossings > 0) {
        this.fitness_crossing_edges = this.num_crossing_edges();
        fitness += 2.5 * (150 - this.fitness_crossing_edges) * PuzzlePlayer.fitness_param_crossings;
    }

    if (PuzzlePlayer.fitness_param_average_tension > 0) {
        this.fitness_average_tension = this.find_average_tension();
        fitness += (100 - 100 * this.fitness_average_tension) * PuzzlePlayer.fitness_param_average_tension;
    }
    

    fitness -= this.num_singleton_nodes() * 10;
    fitness -= this.num_antenna_nodes() * 5;
    // todo: how disconnected is the graph?
    this.fitness = fitness;
    return this.fitness;
}

Graph.prototype.mutate_remove_an_edge = function() {
    //log(" MUTATE. remove an edge");
    if (this.num_edges() == 0) {
        return;
    }
    var nth_edge = Math.floor(random_range(0, this.num_edges()));
    this.remove_nth_edge(nth_edge);
}

Graph.prototype.mutate_add_a_node = function() {
    var letter = random_letter();
    //log(" MUTATE. add a node: " + letter);
    var nn = this.num_nodes();
    // NOTE: using num_nodes() as the new node's ID doesn't work if the
    //       node list expands & contracts.
    //       maybe we need a graph.gensym?
    var connect_to = null;
    if (nn > 0) {
        var nconnect = Math.floor(random_range(0, nn));
        connect_to = this.get_node(nconnect);
    }
    var new_node_id = this.generate_next_node_id();
    var new_node = this.add_node(new_node_id, letter, this.random_node_position());
    
    if (connect_to) {
        this.add_edge(new_node.id, connect_to.id);
    }
}
            
Graph.prototype.mutate_remove_a_node = function() {
    //log(" MUTATE. remove a node");
    if (this.num_nodes() == 0) {
        return;
    }
    var a_node =
        this.get_node(Math.floor(random_range(0, this.num_nodes())));
    this.remove_node(a_node);
}

Graph.prototype.mutate_change_a_nodes_letter = function() {
    //log(" MUTATE. change a node's letter");
    if (this.num_nodes() == 0) {
        return;
    }
    var a_node =
        this.get_node(Math.floor(random_range(0, this.num_nodes())));
    var a_letter = random_letter();
    a_node.letter = a_letter;
    this.invalidate_solution();
}


//
// available mutations:
//    add_an_edge
//    remove_an_edge
//    add_a_node
//    remove_a_node
//    change_a_nodes_letter
//
    var mcount = 0;
Graph.prototype.make_a_mutation = function() {
    if (PuzzlePlayer.mutation_param_only_letters) {
        this.mutate_change_a_nodes_letter();
        return;
    }
    //var m = Math.floor(random_range(0, 5));
    // for now, we rotate through them so we can test them all. 
    var m = mcount;
    mcount++; if (mcount > 9) mcount = 0;
    //log("Make a mutation: " + m);
    switch(m) {
    case 0:
        this.mutate_add_an_edge();
        break;
    case 1:
        this.mutate_remove_an_edge();
        break;
    case 2:
        this.mutate_add_a_node();
        break;
    case 3:
        this.mutate_remove_a_node();
        break;
    case 4:
        this.mutate_change_a_nodes_letter();
        break;
    case 5:
        this.mutate_move_two_nodes_to_corners();
        break;
    case 6:
        this.mutate_move_two_nodes_to_corners();
        break;
    case 7:
        this.mutate_move_two_nodes_to_corners();
        break;
    case 8:
        this.mutate_move_two_nodes_randomly();
        break;
    }
    this.num_mutations += 1;
}


Graph.prototype.remove_nth_edge = function(nth_edge) {
    this.edges.splice(nth_edge, 1)
    this.invalidate_solution();
}

Graph.prototype.remove_node = function(node) {
    var nth_node = this.find_node_position(node);
    if (nth_node >= 0) {
        for(var i=this.num_edges() - 1; i >= 0; i--) {
            var edge = this.get_edge(i);
            if (edge.from == node || edge.to == node) {
                this.remove_nth_edge(i);
            }
        }
        this.nodeids.splice(nth_node, 1);
        this.nodes[node.id] = null;
    }
    this.invalidate_solution();
}

Graph.prototype.find_node_position = function(node) {
    for(var i=0; i < this.num_nodes(); i++) {
        if (this.nodes[this.nodeids[i]] == node) {
            return i;
        }
    }
    return -1;
}


Graph.prototype.num_words = function() {
    if (this.all_words == null) {
        this.find_all_words();
    }
    return this.all_words.length;
}

Graph.prototype.invalidate_solution = function() {
    this.all_words = null;
}

Graph.prototype.mutate_move_two_nodes_to_corners = function() {
    this.mutate_move_one_node_to(new Vec3(0, 0, 0));
    this.mutate_move_one_node_to(new Vec3(this.universe_width, this.universe_width, 0));
}

Graph.prototype.mutate_move_two_nodes_randomly = function() {
    this.mutate_move_one_node_to(this.random_node_position());
    this.mutate_move_one_node_to(this.random_node_position());
}

Graph.prototype.mutate_move_one_node_to = function(pos) {
    var nn = this.num_nodes();
    var node = this.get_node(Math.floor(random_range(0, nn)));
    node.move_to(pos);
}

Graph.prototype.mutate_add_an_edge = function() {
    //log(" MUTATE. add an edge");
    var nn = this.num_nodes();
    for(var tryout=0; tryout < 3; tryout++) {
        var n1 = Math.floor(random_range(0, nn));
        var n2 = Math.floor(random_range(0, nn));
        if (n1 != n2) {
            var node1 = this.get_node(n1);
            var node2 = this.get_node(n2);
            if (!this.has_edge(node1, node2)) {
                this.add_edge(node1.id, node2.id);
                return;
            }
        }
    }
}

Graph.prototype.has_edge = function(node1, node2) {
    for(var e = 0; e < this.num_edges(); e++) {
        var edge = this.get_edge(e);
        if ((edge.from == node1 && edge.to == node2) ||
            (edge.from == node2 && edge.to == node2)) {
            return true;
        }
    }
    return false;
}        

Graph.prototype.num_singleton_nodes = function() {
  var singletons = 0;
  for(var i=0; i < this.num_nodes(); i++) {
      var node = this.get_node(i);
      if (node.edges.length == 0) {
          singletons++;
      }
  }
  return singletons;
}

Graph.prototype.num_antenna_nodes = function() {
  var antennae = 0;
  for(var i=0; i < this.num_nodes(); i++) {
      var node = this.get_node(i);
      if (node.edges.length == 1) {
          antennae++;
      }
  }
  return antennae;
}
    
Graph.prototype.num_crossing_edges = function() {
    //log("NCE:");
    this.nce = 0;
    for(var i=0; i < this.num_edges(); i++) {
        var edgei = this.get_edge(i);
        for(var j=i+1; j < this.num_edges(); j++) {
            var edgej = this.get_edge(j);
            //log("  NCE: testing " + sv(edgei) + " :: " + sv(edgej));
            if (edgei.crosses_edge(edgej)) {
                this.nce++;
            } else {
            }
        }
    }
    //log("NCE: " + this.nce); 
    return this.nce;
}

Graph.prototype.find_average_tension = function() {
    var sum_tension = 0;
    for(var e=0; e < this.num_edges(); e++) {
        var edge = this.get_edge(e);
        if (edge.tension > 0) {
            sum_tension += edge.tension;
        }
    }
    return sum_tension / this.num_edges();
}


    

   
// Node class
function Node(id, letter) {
    this.edges = [];
    this.id = id;
    this.letter = letter;
    this.highlighted = HIGHLIGHT_LEVEL_NONE;
    this.original_position = new Vec3(0, 0, 0);
    this.position = new Vec3(0, 0, 0);
    this.fill_color = "#44a";
    this.stroke_color = "#99F";
    this.fill_color_highlight = "#F99";
    this.stroke_color_highlight_drag = "#c66";
    this.stroke_color_highlight_path = "#e66";
    this.stroke_color_highlight_no_prefix = "#a00";
    this.stroke_color_highlight_word = "#FE4";
    this.radius = 2; // in world coordinates.

    //
    // the annealing stuffs
    //
    this.net_force = new Vec3(0, 0, 0);
    this.velocity =  new Vec3(0, 0, 0);
    this.mass = 10000;
    this.mass_reciprocal = 1.0 / this.mass;
}


Node.prototype.move_to = function(new_position) {
    this.position.set_to(new_position);
}

Node.prototype.set_position = function(new_position) {
    this.position.set_to(new_position);
    this.original_position.set_to(new_position);
}

Node.prototype.reset_position = function() {
    this.position.set_to(this.original_position);
}

Node.prototype.reset_velocity = function() {
    this.velocity.zero();
}
    
Node.prototype.add_edge = function(edge) {
    var other_node = edge.to;
    if (other_node == this) {
        other_node = edge.from;
    }
    //log("ADD EDGE. node " + sn(this) + " " + sn(edge) + " other: " + sn(other_node));
    if (!this.connected_to(other_node)) {
        this.edges.push(edge);
    }
}

Node.prototype.connected_to = function(node) {
    if (node == this) {
        return false;
    }
    for(var i=0; i < this.edges.length; i++) {
        var edge = this.edges[i];
        if (edge.from == node || edge.to == node) {
            return true;
        }
    }
    return false;
}

Node.prototype.find_matching_edges = function(char) {
    var matching_edges = [];
    for(var i=0; i < this.edges.length; i++) {
        var edge = this.edges[i];
        if ((edge.to == this && edge.from.letter == char) ||
            (edge.from == this && edge.to.letter == char)) {
            matching_edges.push(edge);
        }
    }
    return matching_edges;
}


Node.prototype.point_hits_node = function(point) {
    var deltaP = point.minus(this.position);
    var distance = deltaP.magnitude();
    //log("Point" + sv(point) + " hits node: " + sn(this) + " dist: " + distance + " radius: " + this.radius);
    if (distance <= this.radius * 1.5) {
        //log("HIT! " + sn(this));
        return true;
    }
    return false;
}

Node.prototype.to_string = function() {
    return "node{" + this.id + ":" + this.letter + "}. pos: " + sv(this.position);
}

function s(node) {
    return node.letter + "" + node.id;
}


function Edge(node1, node2) {
    this.from = node1;
    this.to = node2;
    this.highlighted = HIGHLIGHT_LEVEL_NONE;
    this.force = new Vec3(0, 0, 0);
    this.stroke_color = "#ccc";
    this.stroke_color_highlight_drag = "#E69";
    this.stroke_color_highlight_path = "#e66";
    this.stroke_color_highlight_no_prefix = "#a00";
    this.stroke_color_highlight_word = "#FE4";
    this.line_width = 2;
    this.line_width_highlight = 3;
    this.tension = 0;

    this.preferred_distance = 15;
}

Edge.prototype.to_string = function() {
    return "E{" + this.from.letter + this.from.id + " => " + this.to.letter + this.to.id + "}";
}

    
Edge.prototype.get_node_that_isnt = function(node) {
    if (node != this.to) {
        return this.to;
    }
    if (node != this.from) {
        return this.from;
    }
    return null;
}

Edge.prototype.tension_to_color = function(universe_radius) {
    var r = 140;
    var g = 140;
    var b = 140;
    var color_range_up = 255 - r;
    var color_range_down = r;
    if (this.tension < 0) {
        // compression ranges from -1 to 0.
        var diffup = (this.tension * -color_range_up);
        var diffdown = (this.tension * color_range_down);
        b += diffup;
        r += diffdown;
        g += diffdown;
        //log("COMPRESSION. " + this.tension + "{ r: " + r + " g: " + g + " b: " + b + "}");
    } else {
        var max_tension = (universe_radius - this.preferred_distance) / this.preferred_distance;
        var diffup = (this.tension / max_tension) * color_range_up;
        var diffdown = (this.tension / max_tension) * color_range_down;
        r += diffup;
        g -= diffdown;
        b -= diffdown;
        //log("TENSION. " + this.tension + " Max: " + max_tension + "{ r: " + r + " g: " + g + " b: " + b + "}");
        if (r > 255) r = 255;
    }
    this.stroke_color = rgba(r, g, b, 255);
}

// determine if two edges intersect (but don't have a common node)
//
Edge.prototype.crosses_edge = function(edge) {
  if (edge.from == this.from || edge.from == this.to ||
      edge.to   == this.from || edge.to   == this.to) {
      //log("EDGE CROSS. common node. rejected.");
      return false;
  }
  var A = this.from.position;
  var B = this.to.position;
  var C = edge.from.position;
  var D = edge.to.position;
  //log("EDGE CROSS. " + sv(this) + "::" + sv(edge));
  //log("             A: " + sv2(A) + " B: " + sv2(B) + " C: " + sv2(C) + " D: " + sv2(D));
  //
  // use the vector math found here:
  // http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
  //   E = B - A
  //   F = D - C
  //      A + gE = C + hF   (if not parallel, then there is
  //                         an extension such that they intersect)
  //   set P | P*E == 0   (* is dot product) => P = [-Ey, Ex]
  //      A*P + gE*P = C*P + hF*P; gE*P == 0
  //      h = (A-C)*P / F*P
  //   set Q | Q*F == 0 => Q = [-Fy, Fx]
  //      A*Q + gE*Q = C*Q + hF*Q; hF*Q == 0
  //      g = (C-A)*Q / E*Q
  var E = B.minus(A);
  var F = D.minus(C);
  var P = new Vec3(-E.y, E.x, 0);
  var FdotP = F.dot(P);
  //log("      FdotP: " + FdotP);
  //log("      EdotP: " + E.dot(P) + " (should be zero)");
  if (FdotP == 0) {
      return false;
  }
  var Q = new Vec3(-F.y, F.x, 0);
  var EdotQ = E.dot(Q);
  //log("      EdotQ: " + EdotQ);
  //log("      FdotQ: " + F.dot(Q) + " (should be zero)");
  if (EdotQ == 0) {
      return false;
  }
  var A_C = A.minus(C);
  var C_A = C.minus(A);
  var h = A_C.dot(P) / FdotP;
  var g = C_A.dot(Q) / EdotQ;
  //log("      h: " + h + " g: " + g);
  if  ((0 < h && h < 1) &&
       (0 < g && g < 1)) {
      //log("    CROSS!");
      return true;
  } else {
      //log("    miss...");
      return false;
  }
}

function rgba(r, g, b, a) {
    return "rgb(" + Math.floor(r) + ", " + Math.floor(g) + ", " + Math.floor(b) +")";
}

