//
// settings & constants
//
var g_step_time = 60;  // ms
var g_universe_radius = 35;



var HIGHLIGHT_LEVEL_NONE          = 0;
var HIGHLIGHT_LEVEL_SELECTED      = 1;
var HIGHLIGHT_LEVEL_DRAGGING      = 10;

var DEFAULT_EDGE_PREFERRED_DISTANCE = 5;
var NODE_BASE_MASS = 100000;
var line_width_factor = 1.0;
var line_width_min = .3 * line_width_factor;

var g_testing = false;

var pz_canvas;  // main mesh canvas
var pp; // main Mapper
var bg_color = "#888"; // "#d0e0f1";


var X=0;
var Y=1;
var Z=2;
var W=3;

var g_annealing = false;
var g_rotating = true;
var nticks = 0;

var mvMatrix;
var pMatrix;
var mvpMatrix;
var scale_recip = 2;
