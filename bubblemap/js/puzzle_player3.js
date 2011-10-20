function PuzzlePlayer(canvas, width, height, universe_radius) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.messages = null;
    this.score_message1 = null;
    this.score_message2 = null;
    this.canvas.addEventListener('mousedown', on_mousedown, false);
    this.canvas.addEventListener('mouseup', on_mouseup, false);
    this.canvas.addEventListener('mousemove', on_mousemove, false);
    this.canvas.addEventListener('mouseout', on_mouseout, false);
    this.universe_radius = universe_radius;
    this.universe_width = 2 * this.universe_radius;
    this.canvas_width = width;
    this.canvas_radius = width/2;
    this.canvas_height = height;
    this.scale = this.universe_width / width;
    this.scale_reciprocal = width / this.universe_width;
    if (width < 200) {
        this.node_font = "8pt ";
    } else if (width >= 200 && width < 300) {
        this.node_font = "12pt Tahoma";
    } else if (width >= 300 && width < 400) {
        this.node_font = "14pt Tahoma";
    } else {
        this.node_font = "16pt Lucida Grande";  // TODO: make the font scale
    }
    this.ctx.font = this.node_font;
    this.ctx.strokeStyle = "#a00";
    this.ctx.fillStyle = "#Fdd";

    this.graph = null; // new Graph(this.universe_radius);
    this.dragging_node = null;
    this.click_find_dragging_node = null;
    this.click_find_edgelist = [];
    this.click_find_dragline_dest = null;

    this.mousing = false;
    this.ctx.scale(1.0, 1.0);

    this.mvMatrix = mat4.create();
    this.pMatrix = mat4.create();
    this.mvpMatrix = mat4.create();
    this.xRot = 0;
    this.yRot = 0;
    this.zRot = 0;
    this.setup_matricies();
    this.combine_matricies();
}

PuzzlePlayer.prototype.set_message = function(msg) {
    this.messages = [msg];
}

PuzzlePlayer.prototype.add_message = function(msg) {
    if (!this.messages) {
        this.messages = [msg];
    } else {
        this.messages.push(msg);
    }
}

PuzzlePlayer.prototype.clear_messages = function() {
    this.messages = null;
}
    
PuzzlePlayer.prototype.clear_scores = function() {
    this.score_message1 = null;
    this.score_message2 = null;
}

PuzzlePlayer.prototype.set_score_messages = function(line1, line2) {
    this.score_message1 = line1;
    this.score_message2 = line2;
}


PuzzlePlayer.prototype.setup_matricies = function() {
    mat4.perspective(45,   // vertical field of view
                     1.0, // aspect ratio
                     .1,  // near clip
                     10.0,  // far clip
                     this.pMatrix);
    mat4.identity(this.mvMatrix);
}

    var centroid = new Vec3(0, 0, 0);
PuzzlePlayer.prototype.combine_matricies = function() {
    mat4.identity(this.mvpMatrix);
    if (!this.graph) return;
    if (!this.dragging_node) {
        /**/
        var ephemeral_centroid = this.graph.centroid();
        // move the centroid of the graph back to the center of view gradually
        centroid.x = centroid.x * .95 + ephemeral_centroid.x * .05;
        centroid.y = centroid.y * .95 + ephemeral_centroid.y * .05;
        centroid.z = centroid.z * .95 + ephemeral_centroid.z * .05;
    }
    //log("==>centroid: " + sv(centroid));
    // translate back
    //
    //mat4.translate(this.mvMatrix, [this.universe_radius, this.universe_radius, 0]);
    // looks like we need a scale?
    // make some rotations
    //mat4.translate(this.mvpMatrix, [-this.universe_radius, this.universe_radius, 0]);

    // OK. I guess we have to multiply the matricies in reverse order that we want them applied...
    mat4.scale(this.mvpMatrix, [this.scale_reciprocal*.3, this.scale_reciprocal*.3, this.scale_reciprocal*.3]);
    mat4.multiply(this.pMatrix, this.mvpMatrix, this.mvpMatrix);
    mat4.rotate(this.mvpMatrix, degToRad(this.xRot), [1, 0, 0]);// TODO: factor the degtorad out. 
    mat4.rotate(this.mvpMatrix, degToRad(this.yRot), [0, 1, 0]);
    mat4.rotate(this.mvpMatrix, degToRad(this.zRot), [0, 0, 1]);
    mat4.translate(this.mvpMatrix, [-centroid.x, -centroid.y, -centroid.z]);

    //mat4.scale(this.mvMatrix, [.3, .3, .3]);
    // translate graph to origin
    //mat4.translate(this.mvMatrix, [-this.universe_radius, -this.universe_radius, 0.0]);
    //mat4.translate(this.mvMatrix, [0, this.universe_radius, 0.0]);
    //
    // perspective
    //
    // scale to canvas
    //   (or do we do this before the perspective??)
    //mat4.translate(this.mvpMatrix, [this.universe_radius, -this.universe_radius, 0]);

    //mat4.translate(this.mvpMatrix, [-this.canvas_radius, -this.canvas_radius, 0]);
}

PuzzlePlayer.prototype.combine_matricies_old = function() {
    mat4.identity(this.mvMatrix);
    var centroid = this.graph.centroid();
    //log("==>centroid: " + sv(centroid));
    // translate back
    //
    //mat4.translate(this.mvMatrix, [this.universe_radius, this.universe_radius, 0]);
    // looks like we need a scale?
    // make some rotations
    mat4.translate(this.mvMatrix, [-this.universe_radius, this.universe_radius, 0]);
    mat4.translate(this.mvMatrix, [-centroid.x, -centroid.y, -centroid.z]);
    mat4.rotate(this.mvMatrix, degToRad(this.xRot), [1, 0, 0]);
    mat4.rotate(this.mvMatrix, degToRad(this.yRot), [0, 1, 0]);
    mat4.rotate(this.mvMatrix, degToRad(this.zRot), [0, 0, 1]);
    //mat4.scale(this.mvMatrix, [.3, .3, .3]);
    // translate graph to origin
    //mat4.translate(this.mvMatrix, [-this.universe_radius, -this.universe_radius, 0.0]);
    //mat4.translate(this.mvMatrix, [0, this.universe_radius, 0.0]);
    //
    // perspective
    mat4.multiply(this.pMatrix, this.mvMatrix, this.mvpMatrix);
    //
    // scale to canvas
    //   (or do we do this before the perspective??)
    //mat4.translate(this.mvpMatrix, [this.universe_radius, -this.universe_radius, 0]);
    mat4.translate(this.mvpMatrix, [-this.canvas_radius, -this.canvas_radius, 0]);
    mat4.scale(this.mvpMatrix, [this.scale_reciprocal, this.scale_reciprocal, this.scale_reciprocal]);
}

var lastTime = 0;
var rotation_speed = .6;

PuzzlePlayer.prototype.update_rotations = function() {
    var timeNow = new Date().getTime();
    if (lastTime != 0 && g_rotating) {
        var elapsed = timeNow - lastTime;
        /*
        this.xRot += (8 * elapsed) / 1000.0;
        this.yRot += (5 * elapsed) / 1000.0;
        this.zRot += (3 * elapsed) / 1000.0;
        */
        this.xRot += .8 * rotation_speed; //(8 * (nticks % 360)) / 1000.0;
        this.yRot += .5 * rotation_speed; //(5 * (nticks % 360)) / 1000.0;
        this.zRot += .3 * rotation_speed; //(3 * (nticks % 360)) / 1000.0;
        //log("update. rot. nticks: " + nticks + " %: " + (nticks %360) + " ROT:{" + [this.xRot, this.yRot, this.zRot] + "] elapsed: " + elapsed);
    }    
    lastTime = timeNow;
    this.combine_matricies();
}

// CLass Variables
PuzzlePlayer.friction = .95;
PuzzlePlayer.delta_t = 15; //50;
PuzzlePlayer.node_repulsion = 22;
PuzzlePlayer.trails = 0;
PuzzlePlayer.fitness_param_numwords = 0.;
PuzzlePlayer.fitness_param_all_words_score = .9;
PuzzlePlayer.fitness_param_big_letters = .1;
PuzzlePlayer.fitness_param_crossings = 0;
PuzzlePlayer.fitness_param_average_tension = .5;
PuzzlePlayer.fitness_param_max_tension = .2;

PuzzlePlayer.mutation_param_only_letters = false;
PuzzlePlayer.annealing_temperature = .5;


PuzzlePlayer.prototype.set_graph = function(g) {
    this.graph = g;
    this.graph.universe_radius = this.universe_radius;
}

PuzzlePlayer.prototype.canvas_to_world = function(cx, cy) {
    var wx = cx * this.scale;
    var wy = (this.canvas_height - cy) * this.scale;
    var wz = 0;
    //log("getWorld C: (" + cx + ", " + cy + ") ==> W:  (" + wx + ", " + wy + ")");
    return new Vec3(wx, wy, wz);
}

PuzzlePlayer.prototype.world_to_canvas3 = function(vector) {
    var v3 = vector.vec3();
    var x3 = vec3.create();
    //  (note: we could probably speed this up by caching the transformed points
    //   on all the nodes, then use those for the edges).
    mat4.multiplyVec3(this.mvpMatrix, v3, x3);
    var cx = x3[0] + this.canvas_radius; // later maybe? * this.scale_reciprocal;
    var cy = this.canvas_radius - x3[1]; // ??* this.scale_reciprocal;
    //log(" matrix: " + this.mvpMatrix);
    //log("W2C " + svv(v3) + " => " + svv(x3) );
    return [cx, cy, x3[2]];
}

PuzzlePlayer.prototype.cache_node_canvas_position = function(node) {
    var cxyz = this.world_to_canvas3(node.position);
    node.cpos = cxyz;
    var zed = Math.max(0, this.universe_width - cxyz[2]);
    //log("Cache NodePOS. cxyz: " + cxyz + " zed: " + zed);
    if (isNaN(zed)) {
        node.zed_ratio = 1;
    } else {
        node.zed_ratio = zed / this.universe_radius;
    }
        

    return cxyz;
}

PuzzlePlayer.prototype.world_length_to_canvas = function(length, point) {
    // how to do this?
    //log("xform length.   point:" + sv(point) + " LENGTH: " + length);
    var point2 = new Vec3(point.x + length, point.y/* + length*/, point.z/* + length*/);
    //log("xform length.  point2:" + sv(point2));
    var cpoint = this.world_to_canvas3(point);
    var cpoint2 = this.world_to_canvas3(point2);
    //log("xform length.  cpoint:" + svv(cpoint));
    //log("xform length. cpoint2:" + svv(cpoint2));
    vec3.subtract(cpoint, cpoint2);
    //log("xform length. pointD:" + svv(xpoint));
    var clength = Math.max(Math.abs(cpoint[0]), Math.abs(cpoint[1])); //vec3.length(cpoint);
    //log("xform length. xRot: " + this.xRot + " yRot: " + this.yRot + " zRot: " + this.zRot + " length: " + length + " => cpt: " + svv(cpoint) + "  clength:" + clength);
    return clength;
}

PuzzlePlayer.prototype.draw_node_and_edges = function(node) {
    //log("DN[" + node.letter + "] zedr: " + node.zed_ratio);
    for(var i=0; i < node.edges.length; i++) {
        this.draw_edge3(node.edges[i], node.zed_ratio);
    }
    if (node.show) {
        this.draw_node3(node);
    }
}

PuzzlePlayer.prototype.draw_node3 = function(node) {
    //var cxy = this.world_to_canvas3(node.position);
    //log("PP.draw_node(" + s(node) + ") @ " + cxy);
    var nx = node.cpos[0];// + node.radius;
    var ny = node.cpos[1] + node.radius; //+ node.radius;
    /**/
    var crad2 = Math.floor(10 + 5 * node.zed_ratio);
     //log("draw node. " + s(node) + " highlighted: " + node.highlighted);
    if (node.highlighted == HIGHLIGHT_LEVEL_DRAGGING) {
        this.ctx.fillStyle = node.stroke_color_highlight_drag;
    } else if (node.highlighted == HIGHLIGHT_LEVEL_PATH) {
        this.ctx.fillStyle = node.stroke_color_highlight_path;
    } else if (node.highlighted == HIGHLIGHT_LEVEL_WORD) {
        this.ctx.fillStyle = node.stroke_color_highlight_word;
    } else if (node.highlighted == HIGHLIGHT_LEVEL_WORD_REPEATED) {
        this.ctx.fillStyle = node.stroke_color_highlight_word_repeated;
    } else if (node.highlighted == HIGHLIGHT_LEVEL_FAIL) {
        this.ctx.fillStyle = node.stroke_color_highlight_no_prefix;
    } else {
        this.ctx.fillStyle = node.fill_color;
        this.ctx.strokeStyle = node.stroke_color;
    }
    this.ctx.font = crad2 + "pt Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(node.letter, nx, ny);
     //this.ctx.fillText("" + node.id, nx, ny);
    //this.ctx.fillText((node.letter + round2(node.cpos[2])), nx, ny); // hack to show z-coordinates
    //this.ctx.fillText(node.letter + "" + node.id, nx, ny);
    //this.ctx.strokeText(node.letter, nx, ny);
}

PuzzlePlayer.prototype.draw_edge3 = function(edge, zed_ratio) {
    if (edge.drawn) {
        return;
    }
    // Note: can't use cached node cpos[] values for the edge start & end points. 
    var start = edge.startpoint;
    var end = edge.endpoint;
    if (!start) {
        start = edge.from_node.position;
        end = edge.to_node.position;
    }

    var c1 = this.world_to_canvas3(start);
    var c2 = this.world_to_canvas3(end);

    //log("draw edge: " + sn(edge) + " highlight: " + edge.highlighted)
    //if (edge.highlighted > 0) log("draw edge: " + sn(edge) + " highlight: " + edge.highlighted)

    if (edge.highlighted == HIGHLIGHT_LEVEL_DRAGGING) {
        this.ctx.strokeStyle = edge.stroke_color; //_highlight;
        this.ctx.lineWidth   = edge.line_width_highlight;
    } else if (edge.highlighted == HIGHLIGHT_LEVEL_PATH) {
        this.ctx.strokeStyle = edge.stroke_color_highlight_path; //_highlight;
        this.ctx.lineWidth   = line_width_min + edge.line_width * zed_ratio / 3.0;
    } else if (edge.highlighted == HIGHLIGHT_LEVEL_WORD) {
        this.ctx.strokeStyle = edge.stroke_color_highlight_word;
        this.ctx.lineWidth   = line_width_min + edge.line_width_highlight * zed_ratio / 3.0;
    } else if (edge.highlighted == HIGHLIGHT_LEVEL_WORD_REPEATED) {
        this.ctx.strokeStyle = edge.stroke_color_highlight_word_repeated;
        this.ctx.lineWidth   = line_width_min + edge.line_width_highlight * zed_ratio / 3.0;
    } else if (edge.highlighted == HIGHLIGHT_LEVEL_FAIL) {
        this.ctx.strokeStyle = edge.stroke_color_highlight_no_prefix;
        this.ctx.lineWidth   = line_width_min + edge.line_width_highlight * zed_ratio / 3.0;
    } else {
        this.ctx.strokeStyle = edge.stroke_color;
        this.ctx.lineWidth   = line_width_min + edge.line_width * zed_ratio / 3.0;
    }
    //log("    draw_edge: " + sv(edge) + " line_width: " + this.ctx.lineWidth);
    //log("draw_edge {" + c1 + "} ==> {" + c2 + "} H: " + edge.highlighted + " C: " + edge.stroke_color);
    this.ctx.beginPath();
    this.ctx.moveTo(c1[0], c1[1]);
    this.ctx.lineTo(c2[0], c2[1]);
    this.ctx.closePath();
    this.ctx.stroke();
    this.drawn = true;
}
    
PuzzlePlayer.prototype.draw_graph = function() {
    if (PuzzlePlayer.trails == 0) {
        this.clear_canvas();
    } else if (PuzzlePlayer.trails == -1) {
        // don't clear...
    } else {
        this.clear_canvas_for_trails(PuzzlePlayer.trails);
    }
    //log("draw graph. w: " + this.canvas_width + " h: " + this.canvas_height + " scale: " + this.scale);
    /*
    for(var i=0; i < this.graph.num_edges(); i++) {
        var edge = this.graph.get_edge(i);
        this.draw_edge3(edge);
    }*/
    for(var i=0; i < this.graph.num_nodes(); i++) {
        var node = this.graph.get_node(i);
        this.cache_node_canvas_position(node);
    }
    this.graph.z_sort_nodes(this); // note: needs to cache the node's Cxyz position
    for(var i=0; i < this.graph.num_nodes(); i++) {
        var node = this.graph.get_z_sorted_node(i);
        //log("  " + sn(node) + " H: " + node.highlighted);
        this.draw_node_and_edges(node);
    }
    if (click_to_find_words &&
        this.click_find_dragging_node != null &&
        this.click_find_dragline_dest != null) {
        var start = this.click_find_dragging_node.cpos;
        var end = this.click_find_dragline_dest;
        this.ctx.strokeStyle = "#44F";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(start[0], start[1]);
        this.ctx.lineTo(end[0], end[1]);
        this.ctx.closePath();
        this.ctx.stroke();
    }
    /*
    // draw a dot at the centroid...
    var centroid = this.graph.centroid();
    var cv_cent = this.world_to_canvas3(centroid);
    //log("centroid: " + sv2(centroid) + " cv_cent: " + svv(cv_cent));
    this.ctx.fillStyle="#f00";
    this.ctx.fillRect(cv_cent[0], cv_cent[1], 10, 10);
    */
    if (this.messages) {
        this.display_messages();
    }
    if (this.score_message1) {
        this.display_scores();
    }
}

PuzzlePlayer.prototype.display_messages = function() {
    if (!this.messages) {
        return;
    }
    var msg_x = 25;
    var msg_y = 25;
    var msg_height = 17;
    //var font_keep = this.ctx_font;
    for(var i=0; i < this.messages.length; i++) {
        //log("msg[" + i + "]: " + this.messages[i]);
        this.ctx.fillStyle = msg_color;
        this.ctx.textAlign = "left";
        this.ctx.font = "12pt Arial";
        this.ctx.fillText(this.messages[i], msg_x, msg_y);
        msg_y += msg_height;
    }
    //this.ctx_font = font_keep;
}
 
PuzzlePlayer.prototype.display_scores = function() {
    if (!this.score_message1) {
        return;
    }
    var msg_x = 440;
    var msg_y = 25;
    var msg_height = 17;
    //var font_keep = this.ctx_font;
    this.ctx.fillStyle = score_color;
    this.ctx.textAlign = "right";
    this.ctx.font = "12pt Arial";
    this.ctx.fillText(this.score_message1, msg_x, msg_y);
    msg_y += msg_height;
    this.ctx.fillText(this.score_message2, msg_x, msg_y);
}
    
  
PuzzlePlayer.prototype.clear_canvas = function() {
    this.ctx.fillStyle = bg_color; //dla_canvas.style.bgColor;
    //log("clear canvas. w: " + this.canvas_width + " h: " + this.canvas_height);
    this.ctx.fillRect(0, 0, this.canvas_width, this.canvas_height);
}

PuzzlePlayer.prototype.clear_canvas_for_trails = function(alpha) {
    var alpha_keep = this.ctx.globalAlpha;
    this.ctx.globalAlpha = alpha;
    this.clear_canvas();
    this.ctx.globalAlpha = alpha_keep;
}    

PuzzlePlayer.prototype.anneal_step = function(graph) {
    //log("Anneal step.");
    this.graph.anneal_step();
    this.draw_graph();
}

PuzzlePlayer.prototype.anneal_step_without_draw = function(graph) {
    //log("Anneal step.");
    this.graph.anneal_step();
}

PuzzlePlayer.prototype.test_and_highlight_input = function(word_chars) {
    var edgelist = this.graph.test_and_highlight_input(word_chars);
    //this.draw_graph();
    return edgelist;
}

PuzzlePlayer.prototype.highlight_input = function(word_chars) {
    var edgelist = this.graph.test_and_highlight_input(word_chars);
    //this.draw_graph();
    return edgelist;
}

PuzzlePlayer.prototype.highlight_edgelist = function(edgelist) {
    this.graph.test_and_highlight_edgelist(edgelist);
    //this.draw_graph();
    return edgelist;
}

