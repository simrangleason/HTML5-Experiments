function RandomDataSource(n) {
    this.min = 1;
    this.max = 32;
    this.setup(n);
}
RandomDataSource.prototype = new DataSource();

var fake_dataNames_rds = ['Michigan', 'Kansas', 'Arkansas', 'New York', 'New Hampshire', 'North Dakota', 'South Carolina', 'Minnesota', 'Oregon', 'Jefferson', 'Washington', 'Nevada', 'California', 'Ohio', 'Iowa', 'Indiana', 'Illinois', 'Nebraska', 'Utah', 'Maryland' ];

var id_seed = 0;
RandomDataSource.prototype.setup = function(n) {
    this.time_units = "seconds";
    this.phase_start = new Date().getTime();
    this.time_interval = [-1, -1, 2];
    this.values = {};
    this.dataNames = [];
    id_seed += 1;
    
    for(var i=0; i < n; i++) {
        var name;
        if (i < fake_dataNames_rds.length) {
            name = fake_dataNames_rds[i];
        } else {
            var suffix = Math.floor(fake_dataNames_rds.length / i);
            log("toomanyu. index: " + ((i+1) % fake_dataNames_rds.length) + " (21 % 20) : " + (21 % 20));
            name = fake_dataNames_rds[((i+1) % fake_dataNames_rds.length)] + "" + suffix;
        }
        var data_id = name + '_' + id_seed;
        this.dataNames.push([data_id, name]);
        this.values[data_id] = this.randomValue();
    }
}

RandomDataSource.prototype.randomValue = function() {
    return random_range(this.min, this.max);
}

RandomDataSource.prototype.getDataNamesAtTime = function(time) {
    return this.dataNames;
}

RandomDataSource.prototype.getDataNamesForNthSet = function(nth) {
    return this.dataNames;
}


RandomDataSource.prototype.getValueTypesAtTime = function(time) {
    return [];
}

RandomDataSource.prototype.getValueTypesForNthSet = function(nth) {
    return [];
}

RandomDataSource.prototype.getValueAtTime = function(time, name) {
    return this.values[name];
}

RandomDataSource.prototype.getValueForNthSet = function(nth, name) {
    return null;
}

RandomDataSource.prototype.getTypedValueAtTime = function(time, name, type) {
    return null;
}

RandomDataSource.prototype.getTypedValueForNthSet = function(nth, name, type) {
    return null;
}

