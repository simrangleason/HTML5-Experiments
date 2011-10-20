function PuzzlePlayer(canvas, width, height, universe_radius) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.canvas.addEventListener('mousedown', on_mousedown, false);
    this.canvas.addEventListener('mouseup', on_mouseup, false);
    this.canvas.addEventListener('mousemove', on_mousemove, false);
    this.canvas.addEventListener('mouseout', on_mouseout, false);
    this.universe_radius = universe_radius;
    this.universe_width = 2 * this.universe_radius;
    this.canvas_width = width;
    this.canvas_height = height;
    this.scale = this.universe_width / width;
    this.scale_reciprocal = width / this.universe_width;
    if (width < 200) {
        this.ctx.font = "8pt Arial";
    } else if (width >= 200 && width < 300) {
        this.ctx.font = "12pt Arial";
    } else if (width >= 300 && width < 400) {
        this.ctx.font = "14pt Arial";
    } else {
        this.ctx.font = "20pt Arial";  // TODO: make the font scale
    }
    this.ctx.strokeStyle = "#a00";
    this.ctx.fillStyle = "#Fdd";

    this.graph = new Graph(this.universe_radius);
    this.dragging_node = null;
    this.mousing = false;
    this.ctx.scale(1.0, 1.0);
}

// CLass Variables
PuzzlePlayer.friction = .95;
PuzzlePlayer.delta_t = 50;
PuzzlePlayer.node_repulsion = 12;
PuzzlePlayer.trails = 0;
PuzzlePlayer.fitness_param_numwords = .5;
PuzzlePlayer.fitness_param_crossings = .5;
PuzzlePlayer.mutation_param_only_letters = false;

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

PuzzlePlayer.prototype.world_to_canvas = function(vector) {
    var cx = vector.x * this.scale_reciprocal;
    var cy = this.canvas_height - vector.y * this.scale_reciprocal;
    return [cx, cy];
}

PuzzlePlayer.prototype.draw_node = function(node) {
    var cxy = this.world_to_canvas(node.position);
    //log("PP.draw_node(" + s(node) + ") @ " + cxy);
    var cradius = this.scale_reciprocal * node.radius;
    var nx = cxy[0];// + node.radius;
    var ny = cxy[1] + node.radius; //+ node.radius;
    // first clear it to make an area around it where the edgfes don't hit.
    this.ctx.fillStyle = bg_color;
    this.ctx.beginPath();
    this.ctx.arc(cxy[0], cxy[1], cradius, 0, TWO_PI, false);
    this.ctx.closePath();
    this.ctx.fill();
    // then draw it
    //log("draw node. " + s(node) + " highlighted: " + node.highlighted);
    if (node.highlighted == HIGHLIGHT_LEVEL_DRAGGING) {
        this.ctx.fillStyle = node.fill_color_highlight;
        this.ctx.strokeStyle = node.stroke_color_highlight_drag;
    } else if (node.highlighted == HIGHLIGHT_LEVEL_PATH) {
        this.ctx.fillStyle = node.fill_color_highlight;
        this.ctx.strokeStyle = node.stroke_color_highlight_path;
    } else if (node.highlighted == HIGHLIGHT_LEVEL_WORD) {
        this.ctx.fillStyle = node.fill_color_highlight;
        this.ctx.strokeStyle = node.stroke_color_highlight_word;
    } else if (node.highlighted == HIGHLIGHT_LEVEL_FAIL) {
        this.ctx.fillStyle = node.fill_color_highlight;
        this.ctx.strokeStyle = node.stroke_color_highlight_no_prefix;
    } else {
        this.ctx.fillStyle = node.fill_color;
        this.ctx.strokeStyle = node.stroke_color;
    }
    this.ctx.textAlign = "center";
    this.ctx.fillText(node.letter, nx, ny);
    this.ctx.strokeText(node.letter, nx, ny);
}

PuzzlePlayer.prototype.draw_edge = function(edge) {
    var c1 = this.world_to_canvas(edge.from.position);
    var c2 = this.world_to_canvas(edge.to.position);

    this.ctx.beginPath();
    //log("draw edge: " + sn(edge) + " highlight: " + edge.highlighted)
    if (edge.highlighted == HIGHLIGHT_LEVEL_DRAGGING) {
        this.ctx.strokeStyle = edge.stroke_color; //_highlight;
        this.ctx.lineWidth   = edge.line_width_highlight;
    } else if (edge.highlighted == HIGHLIGHT_LEVEL_PATH) {
        this.ctx.strokeStyle = edge.stroke_color_highlight_path; //_highlight;
        this.ctx.lineWidth   = edge.line_width;
    } else if (edge.highlighted == HIGHLIGHT_LEVEL_WORD) {
        this.ctx.strokeStyle = edge.stroke_color_highlight_word;
        this.ctx.lineWidth   = edge.line_width_highlight;
    } else if (edge.highlighted == HIGHLIGHT_LEVEL_FAIL) {
        this.ctx.strokeStyle = edge.stroke_color_highlight_no_prefix;
        this.ctx.lineWidth   = edge.line_width_highlight;
    } else {
        this.ctx.strokeStyle = edge.stroke_color;
        this.ctx.lineWidth   = edge.line_width;
    }

    //log("draw_edge {" + c1 + "} ==> {" + c2 + "} H: " + edge.highlighted + " C: " + edge.stroke_color);
    this.ctx.moveTo(c1[0], c1[1]);
    this.ctx.lineTo(c2[0], c2[1]);
    this.ctx.closePath();
    this.ctx.stroke();
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
    for(var i=0; i < this.graph.num_edges(); i++) {
        var edge = this.graph.get_edge(i);
        this.draw_edge(edge);
    }
    for(var i=0; i < this.graph.num_nodes(); i++) {
        var node = this.graph.get_node(i);
        //log("  " + sn(node) + " H: " + node.highlighted);
        this.draw_node(node);
    }
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

PuzzlePlayer.prototype.test_and_highlight_input = function(word) {
    var edgelist = this.graph.test_and_highlight_input(word);
    this.draw_graph();
    return edgelist;
}

