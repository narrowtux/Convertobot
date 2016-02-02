"use strict";

let config = require("config");
let systems = config.get("systems");
let math = require("mathjs");
const METRIC = "metric";
const IMPERIAL = "imperial";
const SYSTEMS = [METRIC, IMPERIAL];

function coolRound(number, to) {
    return math.round(number / to, 1) * to;
}

function getUnitSettings(u) {
    var ts = systems[METRIC].filter(unit => unit.code === u || unit.long.singular === u || unit.long.plural === u);
    if (ts.length == 1) {
        return ts[0];
    } else {
        ts = systems[IMPERIAL].filter(unit => unit.code === u || unit.long.singular === u || unit.long.plural === u);
        if (ts.length > 0) {
            return ts[0];
        }
    }
    return null;
}

function getUnitSystem(u) {
    // TODO so dirty
    if (systems[METRIC].filter(unit => unit.code === u || unit.long.singular === u || unit.long.plural === u).length > 0) {
        return METRIC;
    }
    if (systems[IMPERIAL].filter(unit => unit.code === u || unit.long.singular === u || unit.long.plural === u).length > 0) {
        return IMPERIAL;
    }
    return null;
}

function getMajorityUnitSystem(units) {
    var metric = 0,
        imperial = 0;

    units.forEach(unit => {
        var system = getUnitSystem(unit);
        if (system === METRIC) {
            metric ++;
        } else if (system === IMPERIAL) {
            imperial ++;
        }
    });

    if (metric > imperial) {
        return METRIC;
    } else if (imperial > metric) {
        return IMPERIAL;
    }
}

function getConversions(fromUnit) {
    var ret = [];

    try {
        var parse = math.parse(fromUnit);
        if (parse.fn === "to") {
            ret.push(math.eval(fromUnit).format());
            return ret;
        }
    } catch(e) {
        return ret;
    }

    try {
        math.unit(fromUnit);
    } catch(e) {
        try {
            ret.push(math.eval(fromUnit).format());
        } catch (e) {
            return ret;
        }
    }

    try {
        fromUnit = math.unit(math.eval(fromUnit));
    } catch (e) {
        return ret;
    }

    var fromSystem = getMajorityUnitSystem(fromUnit.units.map(unit => unit.unit.name));
    var toSystem;

    if (fromSystem === METRIC) {
        toSystem = IMPERIAL;
    } else if (fromSystem === IMPERIAL) {
        toSystem = METRIC;
    } else {
        return [];
    }

    systems[toSystem].forEach(unit => {
        try {
            var value = fromUnit.toNumber(unit.code);
            if (unit.hidden) {
                return;
            }
            if (unit.range) {
                var lower = unit.range.from || null;
                var upper = unit.range.to || null;
                let cmp = math.abs(value);
                if (lower && lower > cmp) {
                    return;
                }
                if (upper && upper < cmp) {
                    return;
                }
            }
            if (unit.round) {
                value = coolRound(value, unit.round);
            }
            //ret.push(value + " " + unit.name);
            ret.push(fromUnit.to(unit.code).format(2));
        } catch(e) {}
    });
    return ret;
}

var units = {

};

//var test = [
//    "3 m",
//    "1 cm",
//    "25 cm",
//    "50 cm",
//    "1000 m",
//    "430 m",
//    "2000 m",
//    "2m * 4m",
//    "gibberish",
//    "13 schrute nickels",
//    "15 ft",
//    "2 ft + 5 in",
//    "130 km/h",
//    "60 mi/h",
//    "1 + 3",
//    "10 degC"
//];
//
//test.forEach(expr => {
//    const conversions = getConversions(expr);
//    if (conversions.length > 0) {
//        console.log(expr + ' = ' + conversions.join(" = "));
//    }
//});


module.exports = {
    getConversions: getConversions
};