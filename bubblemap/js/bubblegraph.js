function Graph(universe_radius) {
    this.id = null;
    this.name = "";
    this.origin = null;
    this.nodes = new Array();  // associative array
    this.nodeids = [];
    this.zsorted_nodeids = [];
    this.edges = [];
    this.universe_radius = universe_radius;
    this.universe_width = 2 * universe_radius;
    this.next_node_id = 0;
    this.nce = -1;

    this.gravity = 1.0;
}

Graph.prototype.clone = function() {
    var dolly = new Graph(this.universe_radius);
    dolly.universe_radius = this.universe_radius;
    dolly.universe_width = 2 * this.universe_radius;
    dolly.next_node_id = this.next_node_id;
    dolly.id = this.id;
    dolly.name = this.name;
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
        dolly.add_edge(edge.from.id, edge.to.id, edge.preferred_distance);
    }
    return dolly;
}

Graph.prototype.num_nodes = function() {
    return this.nodeids.length;
}

Graph.prototype.z_sort_nodes = function(pp) {
    //log("z-sort nodes");
    var nn = this.num_nodes();
    if (nn == 0)  return;
    var node0 = this.get_node(0);
    //log("   z0sort. num_nodes: " + nn + " node0: " + node0 + " pp: " + pp);
    if (!node0)  return;
    //pp.cache_node_canvas_position(node0);
    zsorted_nodeids = [node0.id];
    for(var i=1; i < nn; i++) {
        var nodei = this.get_node(i);
        //var cxyz = pp.cache_node_canvas_position(nodei);
        var z = nodei.cpos[2]; //cxyz[2];
        this.zinsert_node(zsorted_nodeids, nodei, z);
    }
    this.zsorted_nodeids = zsorted_nodeids;
}

Graph.prototype.zinsert_node = function(zsorted_nodeids, nodei, z) {
    for(var s=0; s < zsorted_nodeids.length; s++) {
        var snodeid = zsorted_nodeids[s];
        var snode = this.nodes[snodeid];
        var snz = snode.cpos[2];
        if (snz < z) {
            zsorted_nodeids.splice(s, 0, nodei.id);
            return zsorted_nodeids;
        }
    }
    zsorted_nodeids.push(nodei.id);
    return zsorted_nodeids;
}

Graph.prototype.get_node_by_id = function(nodeid) {
    return this.nodes[nodeid];
}

Graph.prototype.get_node = function(i) {
    if (i >= this.nodeids.length) {
        return null;
    }
    return this.nodes[this.nodeids[i]];
}

Graph.prototype.get_z_sorted_node = function(i) {
    if (i >= this.zsorted_nodeids.length) {
        return null;
    }
    return this.nodes[this.zsorted_nodeids[i]];
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

Graph.prototype.fill_from_json = function(id, graphspec) {
    this.name = graphspec.name;
    this.id = id;

    var nodespecs = graphspec.nodes;
    for(var i=0; i < nodespecs.length; i++) {
        var nodespec = nodespecs[i];
        log("adding nodespec: [" + dump(nodespec) + "]");
        log(" nodespec['value']: {" + nodespec['value'] + "}");
        var nodepos;
        if (nodespec.length > 2) {
            nodepos = make_vec3(nodespec[2]);
        } else {
            nodepos = this.random_node_position();
        }
        if ('offset' in graphspec) {
            var offset = graphspec.offset;
            nodepos.x += offset[0];
            nodepos.y += offset[1];
            nodepos.z += offset[2];
        }
        var node = this.add_node(nodespec[0], nodespec[1], nodepos);
        if ('show' in nodespec) {
            node.show = nodespec['show'];
        }
        node.set_value(nodespec['value']);
        if (nodespec['fixed']) {
            node.fixed = nodespec['fixed'];
        }
        node.value_to_radius(1, 50); // TODO: set in graph... (or have post-process step).
    }
    var edgespecs = graphspec.edges;
    for(var i=0; i < edgespecs.length; i++) {
        var edgespec = edgespecs[i];
        var edge_length_factor = 1.;
        if (edgespec.length > 2) {
            edge_length_factor = edgespec[2];
        }
        this.add_edge(edgespec[0], edgespec[1], DEFAULT_EDGE_PREFERRED_DISTANCE * edge_length_factor);
    }
}

function make_vec3(coords) {
    return new Vec3(coords[0], coords[1], coords[2]);
}

Graph.prototype.target_nodes_to_negative = function() {
    for(var i=0; i < this.num_nodes(); i++) {
        var node = this.get_node(i);
        log("targetNEG[" + node.caption + "]  val: " + node.value);
        node.set_target_value(-1, 200 * (i+1), g_step_time);
    }
}

Graph.prototype.ensure_center_node = function() {
    var n0 = this.get_node(0);
    if (!n0) {
        this.add_center_node();
    } else {
        if (n0.id == 'C') {
            return; // we're good!
        } else {
            // TODO: insert a new center node at position 0.
        }
    }
}
            
Graph.prototype.add_center_node = function() {
    var ptolemy =
    this.add_node('C', 'CENTER', new Vec3(this.universe_radius, this.universe_radius, 0));
    ptolemy.show = false;
    ptolemy.fixed = false;
    ptolemy.radius = .1;
    return ptolemy;
}

Graph.prototype.add_node = function(nodeid, caption, pos) {
    var node = new Node(nodeid);
    if (!pos || pos == '*') {
        pos = this.random_node_position();
    }
    node.set_position(pos);
    node.caption = caption;
    log("Add Node: " + node.caption + node.id + " pos: <" + sn(pos) + ">");

    //log("Add Node (after move): " + sn(node));
    this.nodes[nodeid] = node;
    this.nodeids.push(nodeid);
    this.zsorted_nodeids.push(nodeid);
    this.generate_next_node_id();
    return node;
}

Graph.prototype.add_edge = function(node_id1, node_id2, preferred_distance) {
    log("add edge: <" + node_id1 + " => " + node_id2 + ">");
    var node1 = this.nodes[node_id1];
    var node2 = this.nodes[node_id2];
    log("add edge: " + s(node1) + " => " + s(node2));
    var edge = new Edge(node1, node2);
    node1.add_edge(edge);
    node2.add_edge(edge);
    if (preferred_distance) {
        edge.preferred_distance = preferred_distance;
    }
    this.edges.push(edge);
}

Graph.prototype.find_edge = function(node1, node2) {
    for(var i=0; i < this.num_edges(); i++) {
        var edge = this.get_edge(i);
        if ((edge.to == node1 && edge.from == node2) ||
            (edge.from == node1 && edge.to == node2)) {
            return edge;
        }
    }
    return null;
}        

Graph.prototype.animate_values = function() {
    for(var i=1; i < this.num_nodes(); i++) {
        var node = this.get_node(i);
        if (node && node.value != node.target_value && node.delta_val) {
            // handle case where it's close (within a deltaV),
            // but the rounding error would make it overshoot.
            var deltaTarg = Math.abs(node.target_value - node.value);
            //log("   deltaTarg: " + deltaTarg);
            if (deltaTarg <= node.delta_val || deltaTarg < node.value / 100) {
                node.value = node.target_value;
                node.delta_val = null;
                //log("animate[" + node.caption + "] <TOOCLOSE> val: " + node.value + " target: " + node.target_value + " deltaV: " + node.delta_val);
            } else {
                //log("animate[" + node.caption + "] val: " + node.value + " target: " + node.target_value + " deltaV: " + node.delta_val);
                node.value += node.delta_val;
                //log("    => " + node.value);
            }
            node.value_to_radius(this.min_val, this.max_val);
        }
        // TODO: do we get an animate_colors?
    }    
}

Graph.prototype.recombobulate_value_ranks = function() {
    var min_val = null;
    var max_val = 0;
    var center_node = this.get_node(0);
    for(var i=1; i < this.num_nodes(); i++) {
        var node = this.get_node(i);
        if (min_val == null || node.value < min_val) {
            min_val = node.value;
        }
        if (node.value > max_val) {
            max_val = node.value;
        }
    }
    //log("Graph.recombobulate. min: " + min_val + " max: " + max_val);
    //min_val *= .8;
    max_val *= 1.2;
    //
    // TODO: only update the graph's min & max val if they get too far off.
    //
    this.min_val = min_val;
    this.max_val = max_val;
    this.update_value_ranks();
}

    // leave a little headroom.
Graph.prototype.update_value_ranks = function() {
    var center_node = this.get_node(0);
    for(var i=1; i < this.num_nodes(); i++) {
        var node = this.get_node(i);
        node.value_to_radius(this.min_val, this.max_val);
        var centripetal = this.find_edge(center_node, node);
        if (centripetal) {
            var edge_length_factor = (1 + node.value_rank)/2;
            centripetal.preferred_distance = DEFAULT_EDGE_PREFERRED_DISTANCE * edge_length_factor;
        }
    }
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

function ppg() {
    log("pp.graph: " + pp.graph + " :: " + pp.graph.hash);
    log(fitness_string(pp.graph));
    return pp.graph.debug_string();
}

Graph.prototype.debug_string = function() {
    var strs = [];
    strs.push("Name: " + this.name);
    strs.push("  Mutations: " + this.num_mutations);
    strs.push("  Nodes:");
    for(var i=0; i < this.nodeids.length; i++) {
        var node = this.nodes[this.nodeids[i]];
        var edgestrs = [];
        for(var e=0; e<node.edges.length; e++) {
            var ne = node.edges[e];
            edgestrs.push(ne.to_string());
        }
        strs.push("    " + node.to_string() + " || " + edgestrs.join(" "));
    }
    strs.push("  Edges:");
    for(var e=0; e < this.num_edges(); e++) {
        strs.push("    " + sv(this.get_edge(e)));
    }
    return strs.join("\n");
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

Graph.prototype.random_node_position = function() {
    var range_low = .2 * 2 * this.universe_radius;
    var range_high = .7 * 2 * this.universe_radius;
    //log("random node pos. graph.universe_radius: " + this.universe_radius + " rlow: " + range_low + " rhigh: " + range_high);
    return new Vec3(random_range(range_low, range_high), random_range(range_low, range_high), 0);
}

Graph.prototype.anneal_step = function() {
    this.calculate_forces();
    this.move_nodes();
}

Graph.prototype.calculate_forces = function() {
    // zero out the net forces on the nodes
    for(var i=0; i < this.num_nodes(); i++) {
        var node = this.get_node(i);
        if (node) {
            node.net_force.zero();
        }
    }
    //log("\n\nCALC FORCES: Edges");
    for(var e=0; e < this.edges.length; e++) {
        var edge = this.edges[e];
        var tension =
            this.apply_spring_force(edge, edge.from, edge.to, edge.preferred_distance);
        edge.tension = tension;
        edge.tension_to_color(this.universe_radius);
    }
    if (Mapper.node_repulsion > 0) {
        //log("CALC FORCES: node repulsion(" + Mapper.node_repulsion + ")");
        // don't apply to center node (always node 0)
        for(var i=1; i < this.num_nodes(); i++) {
            for(var j=i+1; j < this.num_nodes(); j++) { 
                var nodei = this.get_node(i);
                var nodej = this.get_node(j);
                this.apply_repulsion_force(nodei, nodej, Mapper.node_repulsion);
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
            //log("   NET force: " + sn(node.net_force) + " delta_t: " + Mapper.delta_t);
            var A = node.net_force.times_equals(node.mass_reciprocal);
            node.velocity.plus_factor_equals(A, Mapper.delta_t);
            node.position.plus_factor_equals(node.velocity, Mapper.delta_t);
            node.velocity.times_equals(Mapper.friction);
            //log("   A: " + sv(A));
            //log("   vel: " + sv(node.velocity));
            //log("  pos(after): " + sv(node.position));
            this.maybe_bounce(node);
        }
    }
}                             

Graph.prototype.maybe_bounce = function(node) {
    var r = node.radius / 2;
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
       function(edge, from_node, to_node, preferred_distance) {
    var difference = to_node.position.minus(from_node.position);
    //
    // cache points just slightly off the endpoints.
    //log("ASF. edge: " + sv(edge) + " sp: " + edge.startpoint + " ep: " + edge.endpoint);
    if (edge) {
        edge.startpoint.set_to(from_node.position);
        edge.startpoint.plus_factor_equals(difference, .1);
        edge.endpoint.set_to(to_node.position);
        edge.endpoint.plus_factor_equals(difference, -.1);
        edge.drawn = false;
    }
    var magnitude = difference.magnitude();
    magnitude = Math.max(1, magnitude);
    var tension = (magnitude - preferred_distance) / preferred_distance;
    //console.log("  SF. mag[" + sn(from_node) + " => " +sn(to_node) + "]: diff: " + sv(difference) + " mag: " + magnitude + " pref: " + preferred_distance + " tension: " + tension);
    var mag_force = tension * Graph.spring_coefficient / magnitude;
    var force = difference.times_equals(mag_force);
    from_node.net_force.plus_equals(force);
    to_node.net_force.minus_equals(force);
    return tension;
}

Graph.prototype.apply_repulsion_force =
       function(from_node, to_node, repulsion_factor) {
    var difference = to_node.position.minus(from_node.position);
    var magnitude = difference.magnitude();
    var sum_radii = from_node.radius + to_node.radius;
    var personal_space = sum_radii * 1.1;
    var minimum_space = personal_space - sum_radii;
    magnitude = Math.max(1, magnitude);
    var encroachment = (personal_space - magnitude);
    //log("REPULSE[" + sn(from_node) + "r: " + from_node.radius + ", " + sn(to_node) + "r: " + to_node.radius + "]  encroach: " + encroachment);
    if (magnitude < personal_space) {
        var too_close_factor = Math.pow(1.2,(1+encroachment)) / 2;
        var tension =  -(encroachment*too_close_factor) / minimum_space;
        //console.log("  REPULSE.. mag[" + sn(from_node) + " => " +sn(to_node) + "]: diff: " + sv(difference) + " mag: " + magnitude + " encroach: " + encroachment + "min_space: " + minimum_space + " tension: " + tension);
        var mag_force = tension * repulsion_factor * Graph.spring_coefficient / minimum_space;
        var rank_sum = from_node.value_rank + to_node.value_rank;
        var log_rank_sum = Math.log(5 + rank_sum);
        //log("rank_sum: " + rank_sum + " log(rs) : " + log_rank_sum);
        var force = difference.times_equals(mag_force * log_rank_sum);
        from_node.net_force.plus_equals(force);
        to_node.net_force.minus_equals(force);
        // if they're actually touching, we can zero out their velocities so they
        // don't bounce around so much there.
        if (magnitude < sum_radii) {
            from_node.velocity.zero();
            to_node.velocity.zero();
        } else {
            from_node.velocity.times_equals(.8);
            to_node.velocity.times_equals(.8);
        }
      return tension;
    }
}    


Graph.prototype.remove_nth_edge = function(nth_edge) {
    this.edges.splice(nth_edge, 1)
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
}

Graph.prototype.find_node_position = function(node) {
    for(var i=0; i < this.num_nodes(); i++) {
        if (this.nodes[this.nodeids[i]] == node) {
            return i;
        }
    }
    return -1;
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
function Node(id) {
    this.value = 0;
    this.value_rank = 1;
    this.target_value = 0;
    this.delta_val = 0;
    this.caption = "";
    this.fixed = false;
    this.edges = [];
    this.id = id;
    this.highlighted = HIGHLIGHT_LEVEL_NONE;
    this.original_position = new Vec3(0, 0, 0);
    this.position = new Vec3(0, 0, 0);
    this.cpos = [0, 0, 0];
    this.zed_ratio = 1.0;
    this.fill_color = "#99F"; // TODO: use rgba()
    this.stroke_color = "#407";
    this.fill_color_highlight = "#F99";
    this.stroke_color_highlight = "#700";
    this.fill_color_highlight_drag = "#407";
    this.stroke_color_highlight_drag = "#99F";
    this.fill_color_highlight_selected = "#A09954";
    this.stroke_color_highlight_selected = "#339";
    this.radius = 2; // in world coordinates.
    this.cradius = this.radius * pp.scale_reciprocal; // in canvas coordinates.

    //
    // the annealing stuffs
    //
    this.net_force = new Vec3(0, 0, 0);
    this.velocity =  new Vec3(0, 0, 0);
    this.set_mass(NODE_BASE_MASS);
}

Node.prototype.set_mass = function(mass) {
    this.mass = mass;
    this.mass_reciprocal = 1.0 / this.mass;
}


Node.prototype.set_value = function(val) {
    this.value = val;
    this.target_value = val;
    this.delta_val = 0;
}

Node.prototype.set_target_value = function(target_val, target_time, step_time) {
    this.target_value = target_val;
    var num_steps = target_time / step_time;
    this.delta_val = (this.target_value - this.value) / num_steps;
    //log("\n\nNODE[" + this.caption + "] set target(" + target_val + " from: " + this.value + ") time: " + target_time + " step_time: " + step_time + " => steps: " + num_steps + " deltaV: " + this.delta_val);
}

Node.max_radius = g_universe_radius * .4;
Node.min_radius = .8;
Graph.use_square_root = false;

Node.prototype.value_to_radius = function(minval, maxval) {
    if (!this.value) {
        this.value = 0;
    }
    // TODO: normalize for negatives?
    var min = (Graph.use_square_root ? Math.sqrt(minval) : minval);
    var max = (Graph.use_square_root ? Math.sqrt(maxval) : maxval);
    var val = (Graph.use_square_root ? Math.sqrt(this.value) : this.value);
    var value_range = max - min;
    var radius_range;
    if (Graph.use_square_root) {
        //radius_range = Math.sqrt(Node.max_radius) - Math.sqrt(Node.min_radius);
        radius_range = Node.max_radius - Node.min_radius;
    } else {
        radius_range = Node.max_radius - Node.min_radius;
    }
    this.value_rank = (val - min) / value_range;
    if (this.value_rank < 0) {
        this.value_rank = 0;
    }
    this.set_mass(NODE_BASE_MASS * (1+this.value_rank));
    this.radius = Node.min_radius + this.value_rank * radius_range;
    this.cradius = this.radius * pp.scale_reciprocal; // in canvas coordinates.
    //log("NODE[" + this.caption + ":" + val + "] val2rad  min: " + min + " val_range: " + value_range + " rank: " + this.value_rank);
    //log("  NODE val2rad  rad_range: " + radius_range);
    //log("  NODE val2rad => r: " + this.radius + " cr: " + this.cradius);
    return this.radius;
}


Node.prototype.move_to = function(new_position) {
    this.position.set_to(new_position);
}

Node.prototype.move_by = function(dx, dy) {
        this.position.x += dx;
        this.position.y += dy;
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
        return null;
    }
    for(var i=0; i < this.edges.length; i++) {
        var edge = this.edges[i];
        if (edge.from == node || edge.to == node) {
            return edge;
        }
    }
    return null;
}


Node.prototype.point_hits_node = function(world_point) {
    if (this.fixed) {
        return false;
    }
    var deltaP_x = this.position.x - world_point.x;
    var deltaP_y = this.position.y - world_point.y;
    var distance = Math.sqrt(deltaP_x * deltaP_x + deltaP_y * deltaP_y);
    log("Node::Point" + sv2(world_point) + " hits node[" + this.id + "] pos[" + round2(this.position.x) + ", " + round2(this.position.y) + "] dist: " + round2(distance) + " radius: " + this.radius);
    if (distance <= this.radius) {
        //log("HIT! " + sn(this));
        return true;
    }
    return false;
}

Node.prototype.to_string = function() {
    return "node{" + this.id + "}. pos: " + sv(this.position);
}

function s(node) {
    if (!node) {
        return "null";
    }
    return node.id + "<" + node.caption + ">";
}

function Edge(node1, node2) {
    this.from = node1;
    this.to = node2;
    this.highlighted = HIGHLIGHT_LEVEL_NONE;
    this.force = new Vec3(0, 0, 0);
    this.stroke_color = "#ccc";
    this.stroke_color_highlight_drag = "#E69";
    this.stroke_color_highlight_path = "#090";
    this.stroke_color_highlight_no_prefix = "#F00";
    this.stroke_color_highlight_word = "#FE4";
    this.stroke_color_highlight_word_repeated = "#A0A"; 
    this.line_width = 2 * line_width_factor;
    this.line_width_highlight = 3 * line_width_factor;
    this.tension = 0;
    this.preferred_distance = DEFAULT_EDGE_PREFERRED_DISTANCE;

    //
    // cache some drawing values
    //
    // calculate start & endpoints slightly away from the actual node
    // positions, to leave some room for the letter to be drawn.
    //  (do this in the calculate_tension routine, since that's when we've calcuated
    //   the difference vector).
    this.startpoint = new Vec3(0, 0, 0); 
    this.endpoint = new Vec3(0, 0, 0);
    this.drawn = false;
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
