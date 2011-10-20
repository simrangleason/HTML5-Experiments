//
// DataSource superclass.
//

// Data comes at time slices (datasets), with named data pieces.
//   each data piece has a main value, and the possibility
//   of more types of values ("typed") for additional information.
//
//   Timing:
//     Data can be continuous or only available at regular
//     intervals (e.g. daily, monthly). The interface provides ways
//     to query the interval and units.
//     If a dataset is requested between interval endpoints,
//     the most recent dataset before the given time is used. 
//
//   Numbered datasets:
//     Datasets can also be numbered, so data can be requested on the nth
//     set.
//

// subclass usage:
//    function SpecialDataSource() {
//    }
//    SpecialDataSource.prototype = new DataSource();

//

function DataSource() {
    this.time_units = "seconds";
    this.phase_start = 0;
    this.time_interval = [0, 0, 0]; // [start, end, tick-length]
}


DataSource.prototype.getDataNamesAtTime = function(time) {
    alert("DataSource subclass needs to implement getDataNamesAtTime()");
}

DataSource.prototype.getDataNamesForNthSet = function(nth) {
    alert("DataSource subclass needs to implement getDataNamesForNthSet()");
}


DataSource.prototype.getValueTypesAtTime = function(time) {
    alert("DataSource subclass needs to implement getValueTypesAtTime()");
}

DataSource.prototype.getValueTypesForNthSet = function(nth) {
    alert("DataSource subclass needs to implement getValueTypesForNthSet()");
}

DataSource.prototype.getValueAtTime = function(time, name) {
    alert("DataSource subclass needs to implement getValueAtTime()");
}

DataSource.prototype.getValueForNthSet = function(nth, name) {
    alert("DataSource subclass needs to implement getValueForNthSet()");
}

DataSource.prototype.getTypedValueAtTime = function(time, name, type) {
    alert("DataSource subclass needs to implement getTypedValueAtTime()");
}

DataSource.prototype.getTypedValueForNthSet = function(nth, name, type) {
    alert("DataSource subclass needs to implement getTypedValueForNthSet()");
}


