
function Vec3(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
}

Vec3.prototype.vec3 = function() {
    return [this.x, this.y, this.z];
}

Vec3.prototype.zero = function() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
}

Vec3.prototype.clone = function() {
    return new Vec3(this.x, this.y, this.z);
}

    
Vec3.prototype.set = function(x, y, z) {
    this.x = x;
    this.y = y;
    this.y = z;
    return this;
}

Vec3.prototype.set_to = function(vec) {
    this.x = vec.x;
    this.y = vec.y;
    this.z = vec.z;
    return this;
}

Vec3.prototype.set_polarZ = function(r, theta_degrees, z) {
    var theta_radians = theta_degrees * DEGREES_TO_RADIANS;
    var x = r * Math.cos(theta_radians);
    var y = r * Math.sin(theta_radians);
    log("set_polarZ. r: " + r + " th: " + theta_degrees + " theta_rad: " + theta_radians + " x: " + x + " y: " + y + " z: " + z);
    this.set(x, y, z);
    return this;
}
        
Vec3.prototype.plus_equals = function(vec) {
    this.x += vec.x;
    this.y += vec.y;
    this.z += vec.z;
    return this;
}

// this += V * factor;
Vec3.prototype.plus_factor_equals = function(vec, factor) {
    this.x += vec.x * factor;
    this.y += vec.y * factor;
    this.z += vec.z * factor;
    return this;
}

Vec3.prototype.minus_equals = function(vec) {
    this.x -= vec.x;
    this.y -= vec.y;
    this.z -= vec.z;
    return this;
}

Vec3.prototype.times_equals = function(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
}

Vec3.prototype.magnitude = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
}

Vec3.prototype.dot = function(vec) {
   return this.x * vec.x + this.y * vec.y + this.z * vec.z;
}

Vec3.prototype.plus = function(vec) {
    return new Vec3(this.x + vec.x, this.y + vec.y);
}

Vec3.prototype.minus = function(vec) {
    return new Vec3(this.x - vec.x, this.y - vec.y, this.z - vec.z);
}

Vec3.prototype.times = function(scalar) {
    return new Vec3(this.x * scalar, this.y * scalar, this.z * scalar);
}

Vec3.prototype.unit = function() {
   var mag = this.magnitude();
   if (mag == 0) {
       return new Vec3(0, 0, 0);
   }
   var mag_recip = 1.0 / mag;
   return this.times(mag_recip);
}

Vec3.prototype.unit_equals = function() {
   var mag = this.magnitude();
   if (mag == 0) {
       console.log("warning: calling unit-equals() on zero vector")
       return this.zero();
   }
   var mag_recip = 1.0 / mag;
   return this.times_equals(mag_recip);
}

Vec3.prototype.to_string = function() {
    return "{" + this.x + ", " + this.y + ", " + this.z + "}";
}

function sv(vector) {
    return vector.to_string();
}

function sv2(vector) {
    return "{" + round2(vector.x) + ", " + round2(vector.y) + "}";
}

function round2(n) {
  return Math.floor(n * 100.) / 100.;
}