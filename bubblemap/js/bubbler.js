
var g_bubblemaps = {
    //    'bubbles5': make_random_bubbles(5, 1, 50),
    //'bubbles10': make_random_bubbles(10, 5, 50),
};

function add_bubble(graph, id, caption, value) {
    var node = graph.add_node(id, caption);
    node.set_value(round2(value));
    node.show = true;
    var center = graph.get_node(0);
    graph.add_edge(center.id, node.id, 1); // TODO: another magique constant
}
    
function make_random_bubbles(n, low, high) {
    var _nodes = [];
    var _edges = [];
    var name = n + " bubbles";
    var center_nodespec = ['C', 'CENTER', [pp.universe_radius, pp.universe_radius, 0]];
    center_nodespec['show'] = false;
    center_nodespec['value'] = 1.;
    center_nodespec['fixed'] = true;
    _nodes.push(center_nodespec);
    for(var i=0; i < n; i++) {
        var value = round2(random_range(low, high));
        var nid = "n" + i;
        var caption = nid;
        var nodespec = [nid, caption];
        nodespec['value'] = value;
        nodespec['show'] = true;
        _nodes.push(nodespec);
        _edges.push(['C', nid, .3]);
    }
    return {id:nid,
            name: name,
            zbump: false,
            zrotate: false,
            nodes: _nodes,
            edges: _edges};
}

function make_box_mesh(x, y, z, len) {
    var _nodes = [];
    var _edges = [];
    for(var i=0; i < x; i++) {
        for(var j=0; j < y; j++) {
            _nodes.push(['g' + i + j, [5 * (1+i), 5 * (1+j), z]]);
            // rectilinear grid edges
            if (i < x-1) {
                _edges.push(['g' + i + j, 'g' + (i+1) + '' + j, len]);
            }
            if (j < y-1) {
                _edges.push(['g' + i + j, 'g' + i + '' + (j+1), len]);
            }
        }
    }
    var name;
    if (x == y) {
        name = "BoxMesh " + x;
    } else {
        name = "BoxMesh " + x + 'x' + y;
    }
    return {name: name,
            zbump: false,
            initialevolve: true,
            zrotate: true,
            nodes: _nodes,
            edges: _edges};
}
