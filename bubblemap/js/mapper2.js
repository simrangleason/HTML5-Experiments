function Mapper(canvas, width, height, universe_radius) {
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
    // multiply by scale to go from canvas to world coordinates
    this.scale = this.universe_width / width;
    // multiply by scale_recip to go from world to canvas coordinates
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
}

Mapper.prototype.set_message = function(msg) {
    this.messages = [msg];
}

Mapper.prototype.add_message = function(msg) {
    if (!this.messages) {
        this.messages = [msg];
    } else {
        this.messages.push(msg);
    }
}

Mapper.prototype.clear_messages = function() {
    this.messages = null;
}
    
Mapper.prototype.clear_scores = function() {
    this.score_message1 = null;
    this.score_message2 = null;
}

Mapper.prototype.set_score_messages = function(line1, line2) {
    this.score_message1 = line1;
    this.score_message2 = line2;
}


var centroid = new Vec3(0, 0, 0);

// CLass Variables
Mapper.friction = .90;
Mapper.delta_t = 8; //50;
Mapper.node_repulsion = 1.0;
Mapper.trails = 0;
Mapper.fitness_param_numwords = 0.;
Mapper.fitness_param_all_words_score = .9;
Mapper.fitness_param_big_letters = .1;
Mapper.fitness_param_crossings = 0;
Mapper.fitness_param_average_tension = .5;
Mapper.fitness_param_max_tension = .2;

Mapper.mutation_param_only_letters = false;
Mapper.annealing_temperature = .5;


Mapper.prototype.set_graph = function(g) {
    this.graph = g;
    this.graph.universe_radius = this.universe_radius;
}

Mapper.prototype.canvas_to_world = function(cx, cy) {
    var wx = cx * this.scale;
    var wy = (this.canvas_height - cy) * this.scale;
    var wz = 0;
    //log("getWorld C: (" + cx + ", " + cy + ") ==> W:  (" + wx + ", " + wy + ")");
    return new Vec3(wx, wy, wz);
}

Mapper.prototype.world_to_canvas = function(vector) {
    var cx = vector.x * this.scale_reciprocal;
    var cy = this.canvas_height - vector.y * this.scale_reciprocal;
    return [cx, cy];
}

Mapper.prototype.world_length_to_canvas = function(length, point) {
    // how to do this?
    //log("xform length.   point:" + sv(point) + " LENGTH: " + length);
    var point2 = new Vec3(point.x + length, point.y/* + length*/, point.z/* + length*/);
    //log("xform length.  point2:" + sv(point2));
    var cpoint = this.world_to_canvas(point);
    var cpoint2 = this.world_to_canvas(point2);
    //log("xform length.  cpoint:" + svv(cpoint));
    //log("xform length. cpoint2:" + svv(cpoint2));
    vec3.subtract(cpoint, cpoint2);
    //log("xform length. pointD:" + svv(xpoint));
    var clength = Math.max(Math.abs(cpoint[0]), Math.abs(cpoint[1])); //vec3.length(cpoint);
    //log("xform length. xRot: " + this.xRot + " yRot: " + this.yRot + " zRot: " + this.zRot + " length: " + length + " => cpt: " + svv(cpoint) + "  clength:" + clength);
    return clength;
}

Mapper.prototype.draw_node_and_edges = function(node) {
    //log("DrawNode & Edges[" + node.caption + "] ");
    for(var i=0; i < node.edges.length; i++) {
        this.draw_edge(node.edges[i], node.zed_ratio);
    }
    if (node.show) {
        this.draw_node(node);
    }
}

Mapper.prototype.draw_node = function(node) {
    var ctx = this.ctx;
    var cxy = this.world_to_canvas(node.position);
    //log("PP.draw_node(" + sn(node) + ") rad: " + node.radius + " @ " + cxy);
    var nx = cxy[0];
    var ny = cxy[1];
    var nradius = node.cradius;

    //log("draw node. " + s(node) + " highlighted: " + node.highlighted);
    var stroke_style;
    if (node.highlighted == HIGHLIGHT_LEVEL_DRAGGING) {
        ctx.fillStyle = node.fill_color_highlight_drag;
        stroke_style = node.stroke_color_highlight_drag;
        ctx.strokeStyle = stroke_style;
    } else if (node.highlighted == HIGHLIGHT_LEVEL_SELECTED) {
        ctx.fillStyle = node.fill_color_highlight_selected;
        stroke_style = node.stroke_color_highlight_selected;
        ctx.strokeStyle = stroke_style;
    } else {
        ctx.fillStyle = node.fill_color;
        stroke_style = node.stroke_color;
        ctx.strokeStyle = stroke_style;
    }
    ctx.beginPath();
    //log("arc[" + node.caption + "](nx, ny, nradius)==(" + nx + ", " + ny + ", " + nradius + ")");
    ctx.arc(nx, ny, nradius, 0, TWO_PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
     //ctx.fillText("" + node.id, nx, ny);
    //ctx.fillText((node.caption + round2(node.cpos[2])), nx, ny); // hack to show z-coordinates
    //ctx.fillText(node.letter + "" + node.id, nx, ny);
    //ctx.strokeText(node.letter, nx, ny);

    ctx.font = "8pt Arial"; // TOD: make font depend on radius. 
    ctx.textAlign = "center";
    var th = 12;
    var ty = ny - th/2;
    ctx.fillStyle = stroke_style;
    ctx.fillText(node.caption, nx, ty);
    ctx.fillText("" + round2(node.value), nx, ty + th);
    //ctx.fillText(node.caption + ": " + sv2(node.velocity), nx, ny);
}

Mapper.prototype.draw_edge = function(edge, zed_ratio) {
    if (edge.drawn) {
        return;
    }
    // Note: can't use cached node cpos[] values for the edge start & end points. 
    var start = edge.from.position;
    var end = edge.to.position;

    var c1 = this.world_to_canvas(start);
    var c2 = this.world_to_canvas(end);

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
    
Mapper.prototype.draw_graph = function() {
    //log("draw graph");
    this.clear_canvas();
    for(var i=this.graph.num_nodes()-1; i >= 0 ; i--) {
        var node = this.graph.get_node(i);
        //log("  dg.." + sn(node) + " H: " + node.highlighted);
        if (node) {
            if (node.value < 0) {
                this.graph.remove_node(node);
            } else if (node.show) {
                this.draw_node(node);
            }
        }
    }
    /*
    for(var i=0; i < this.graph.num_edges(); i++) {
        var edge = this.graph.get_edge(i);
        //log("  dg.." + sn(node) + " H: " + node.highlighted);
        this.draw_edge(edge);
    }
    */
    if (this.messages) {
        this.display_messages();
    }
    if (this.score_message1) {
        this.display_scores();
    }
}

Mapper.prototype.display_messages = function() {
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
 
Mapper.prototype.display_scores = function() {
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
    
  
Mapper.prototype.clear_canvas = function() {
    this.ctx.fillStyle = bg_color; //dla_canvas.style.bgColor;
    //log("clear canvas. w: " + this.canvas_width + " h: " + this.canvas_height);
    this.ctx.fillRect(0, 0, this.canvas_width, this.canvas_height);
}
/*
Mapper.prototype.clear_canvas_for_trails = function(alpha) {
    var alpha_keep = this.ctx.globalAlpha;
    this.ctx.globalAlpha = alpha;
    this.clear_canvas();
    this.ctx.globalAlpha = alpha_keep;
} 
*/   

Mapper.prototype.anneal_step = function(graph) {
    //log("Anneal step.");
    this.graph.anneal_step();
    this.draw_graph();
}

Mapper.prototype.anneal_step_without_draw = function(graph) {
    //log("Anneal step.");
    this.graph.anneal_step();
}
