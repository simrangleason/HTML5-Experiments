function RandomSinesDataSource(n) {
    this.period_range = [10, 30];
    this.min_range = [1, 4];
    this.max_range = [3, 32];
    this.setup(n);
}
RandomSinesDataSource.prototype = new DataSource();

var fake_dataNames = ['Sleepy', 'Snoozy', 'Dopey', 'Zippey', 'Hippie',
                      'Bashful', 'Dashboard', 'Rational', 'Doc', 'Gremlin',
                      'Beautiful', 'Bear', 
                      'Grumpy', 'Mumpy', 'Lumpy', 'Mopey', 'Loopy', 'Happy',
                      'Papa Smurf', 'Insipid', 'Witty', 'Charming',
                      'Dependable', 'Incontinent', 
                      'Gropey', ];
var id_seed = 0;
RandomSinesDataSource.prototype.setup = function(n) {
    this.time_units = "seconds";
    this.phase_start = new Date().getTime();
    this.time_interval = [-1, -1, 2];
    this.oscillators = {};
    this.dataNames = [];
    id_seed += 1;
    for(var i=0; i < n; i++) {
        var name;
        if (n < fake_dataNames.length) {
            name = fake_dataNames[i];
        } else {
            var suffix = Math.floor(fake_dataNames.length / n);
            name = fake_dataNames[(n % fake_dataNames.length)] + "" + suffix;
        }
        //log("RSDS. setting up oscillator for: " + name);
        var data_id = name + "_" + id_seed;
        this.dataNames.push([data_id, name]);
        this.oscillators[data_id] = new RandomSineOscillator(this, data_id);
    }
}

RandomSinesDataSource.prototype.getDataNamesAtTime = function(time) {
    return this.dataNames;
}

RandomSinesDataSource.prototype.getDataNamesForNthSet = function(nth) {
    return this.dataNames;
}


RandomSinesDataSource.prototype.getValueTypesAtTime = function(time) {
    return [];
}

RandomSinesDataSource.prototype.getValueTypesForNthSet = function(nth) {
    return [];
}

RandomSinesDataSource.prototype.getValueAtTime = function(time, name) {
    var oscillator = this.oscillators[name];
    //log("RSDS. getValueAtTime(" + time + ":" + name + ")  osc: " + oscillator);
    return oscillator.valueAtTime(time);
}

RandomSinesDataSource.prototype.getValueForNthSet = function(nth, name) {
    return null;
}

RandomSinesDataSource.prototype.getTypedValueAtTime = function(time, name, type) {
    return null;
}

RandomSinesDataSource.prototype.getTypedValueForNthSet = function(nth, name, type) {
    return null;
}

function RandomSineOscillator(dataSource, name) {
    this.dataSource = dataSource;
    this.name = name;
    this.min = random_range(dataSource.min_range[0], dataSource.min_range[1]); 
    this.max = random_range(dataSource.max_range[0], dataSource.max_range[1]);
    this.period = random_range(dataSource.period_range[0], dataSource.period_range[1]);
    this.amplitude = (this.max - this.min)/2.0;
}

RandomSineOscillator.prototype.valueAtTime = function(time) {
    var time_in_phase = (time - this.dataSource.phase_start) / 10000;
    var phase = TWO_PI * time_in_phase / this.period;
    var val = this.min + this.amplitude + this.amplitude * Math.sin(phase);
    //log("RSO.val[" + this.name + "]   tip: " + time_in_phase  + " per: " + this.period + " phase: " + phase + " min: " + this.min + " max: " + this.max + " amp: " + this.amplitude + " val: " + val);
    return val;
}


    