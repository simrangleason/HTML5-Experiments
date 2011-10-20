function url_param( name ) {
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec( window.location.href );
  if( results == null ) {
    return null;
  } else {
    return results[1];
  }      
}

function dump(obj) {
    var atts = [];
    for(att in obj) {
        var val = obj[att];
        if (typeof val != "function") {
            atts.push(att + ": " + obj[att]);
        }
    }
    return atts.join(", ");
}

function time_string(time_ms) {
    if (time_ms < 0) {
        return "0:00";
    }
    var seconds = Math.floor(time_ms / 1000);
    var minutes = Math.floor(seconds / 60);
    var seconds_remainder = seconds - 60 * minutes;
    var zero = "";
    if (seconds_remainder < 10) {
        zero = "0";
    }
    return minutes + ":" + zero + seconds_remainder;
}


function sv(obj) {
    if (obj) {
        return obj.to_string();
    } else {
        return "null";
    }
}

function sv2(vector) {
    return "{" + round2(vector.x) + ", " + round2(vector.y) + "}";
}

function svv(vec3) {
    return "{" + round2(vec3[0]) + ", " + round2(vec3[1]) + ", " + round2(vec3[2]) + "}";
}

function sv4(vec4) {
    return "{" + round2(vec4[0]) + ", " + round2(vec4[1]) + ", " + round2(vec4[2]) + ", " + round2(vec4[3]) + "}";
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
                       

function round2(n) {
  return Math.floor(n * 100.) / 100.;
}

function contains(list, w) {
    for(var i=0; i < list.length; i++) {
        if (list[i] == w) {
            return true;
        }
    }
    return false;
}

function remove_element_children(node) {
    while (node.hasChildNodes()) {
        node.removeChild(node.lastChild);
    }
}

function set_element_contents(elt_or_id, value) {
    var elt = get_element(elt_or_id);
    if (elt) {
        elt.innerHTML = "" + value;
    }
}

function set_image(elt_or_id, src) {
    var elt = get_element(elt_or_id);
    if (elt) {
        elt.src = src;
    }
}

function show_element(elt_or_id) {
    var elt = get_element(elt_or_id);
    if (elt) {
        elt.style.display = 'block';
    }
}

function hide_element(elt_or_id) {
    var elt = get_element(elt_or_id);
    if (elt) {
        elt.style.display = 'none';
    }
}

function get_element(elt_or_id) {
    var elt = elt_or_id;
    if (typeof(elt) == 'string') {
        elt = document.getElementById(elt_or_id);
    }
    return elt;
}

function get_input_value(elt_or_id) {
    var elt = get_element(elt_or_id);
    if (elt) {
        return elt.value;
    }
    return null;
}

function insert_first_child(parent, child) {
    parent.insertBefore(child, parent.firstChild);
}

var TWO_PI = 2.0 * Math.PI;
var PI_OVER_TWO = Math.PI / 2.0;
var DEGREES_TO_RADIANS = Math.PI / 180.0;
var RADIANS_TO_DEGREES = 180.0 / Math.PI;
function degToRad(degrees) {
    return degrees * DEGREES_TO_RADIANS;
}
function radToDeg(radians) {
    return radians * RADIANS_TO_DEGREES;
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

function random_range(low, hi) {
    return low + (hi - low) * Math.random();
}

function random_chance(chance) {
    return  Math.random() < chance;
}

function random_percent(percent_chance) {
    return  100*Math.random() < percent_chance;
}



function copy_and_append(list, elt) {
    var dolly = [];
    for(var i=0; i < list.length; i++) {
        dolly.push(list[i]);
    }
    dolly.push(elt);
    return dolly;
}

function copy_and_append_edgelist(list, elt) {
    var dolly = [];
    for(var i=0; i < list.length; i++) {
        dolly.push(list[i]);
    }
    dolly.push(elt);
    dolly.first_node = list.first_node;
    dolly.last_node = list.last_node;
    return dolly;
}


function hide_popup(id) {
    var popup = get_element(id);
    if (popup) {
        popup.style.display = "none";
    }
}

function show_popup(id, dont_hide_others) {
    var popup = get_element(id);
    if (popup) {
        popup.style.display = "block";
    }
    if (!dont_hide_others) {
        hide_other_popups(id);
    }
}

function log(msg) {
    if (console) {
        console.log(msg);
    }
}

