function Palette(num_swatches) {
  this.num_swatches = num_swatches;
  this.swatches = new Array();
  for(var i=0; i < this.num_swatches; i++) {
      var h = random_range(0, 360);
      var s = random_range(40, 100);
      var v = current_value;
      this.swatches[i] = new Swatch(h, s, v);
      this.swatches[i].nth = i;
      if (i == 0) {
          this.swatches[i].reference_swatch = true;
      }
  }
}

Palette.prototype.get_swatch = function(nth) {
    return this.swatches[nth];
}

Palette.prototype.point_hits_swatch = function(wx, wy, fudge) {
    for(var i=0; i < this.num_swatches; i++) {
        var sw = this.get_swatch(i);
        if (sw.point_hits(wx, wy, fudge)) {
            return sw;
        }
    }
    return null;
}        


Palette.prototype.move_reference_swatch = function(hue, sat) {
    var reference_swatch = this.get_swatch(0);
    var hue_offset = hue - reference_swatch.hue;
    if (sat == 0) {
        sat = 1;
    }
    var sat_scale = sat / reference_swatch.sat;
    for(var i=0; i < this.num_swatches; i++) {
        var sw = this.get_swatch(i);
        sw.offset_hue(hue_offset);
        sw.scale_sat(sat_scale);
    }
}

function Swatch(h, s, v) {
    this.nth = -1;
    this.hue = h;
    this.sat = s;
    this.val = v;
    this.reference_swatch = false;
    this.dragging = false;
}

Swatch.prototype.rgb = function() {
    return hsvToRgb(this.hue, this.sat, this.val);
}

Swatch.prototype.hsv = function() {
    return [this.hue, this.sat, this.val];
}

Swatch.prototype.css_color_rgb = function() {
    var rgb = this.rgb();
    return css_rgb_color(rgb);
}

Swatch.prototype.offset_hue = function(hue_offset) {
    this.hue += hue_offset;
    if (this.hue > 360) {
        this.hue -= 360;
    }
    if (this.hue < 0) {
        this.hue += 360;
    }
}

Swatch.prototype.scale_sat = function(sat_scale) {
    this.sat *= sat_scale;
    if (this.sat > 100) {
        this.sat = 100;
    }
    if (this.sat < 1) {
        this.sat = 1;
    }
}

Swatch.prototype.point_hits = function(wx, wy, fudge) {
    // TODO: refactor the {wx, wy} => {h, s} calculation out
    var rTheta = wheel_xy_to_r_theta_degrees(wx, wy);
    var sat = 100 * rTheta[0] / wheel_radius;
    var hue = rTheta[1];
    if (Math.abs(this.hue - hue) < fudge &&
        Math.abs(this.sat - sat) < fudge) {
        return true;
    }
    return false;
}
