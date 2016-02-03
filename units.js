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
    //var math2 = require("mathjs");
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

    var intermediate = false;
    try {
        math.unit(fromUnit);
    } catch(e) {
        intermediate = true;
    }

    try {
        fromUnit = math.eval(fromUnit);
    } catch (e) {
        return ret;
    }

    // result is scalar without unit
    if (!fromUnit.units) {
        ret.push(fromUnit);
        return ret;
    }

    var fromSystem = getMajorityUnitSystem(fromUnit.units.map(unit => unit.unit.name));
    var toSystem;

    if (intermediate) {
        ret = ret.concat(getFittingConversions(fromUnit, fromSystem));
    }

    if (fromSystem === METRIC) {
        toSystem = IMPERIAL;
    } else if (fromSystem === IMPERIAL) {
        toSystem = METRIC;
    } else {
        return [];
    }

    ret = ret.concat(getFittingConversions(fromUnit, toSystem));

    return ret;
}

function getFittingConversions(fromUnit, toSystem) {
    var ret = [];
    systems[toSystem].forEach(unit => {
        try {
            if (unit.hidden) {
                return;
            }
            var value = fromUnit.toNumber(unit.code);
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
            //ret.push(value + " " + unit.name);
            ret.push(format(value, {name: unit.code}, unit));
        } catch(e) {
        }
    });
    return ret;
}

function format(scalar, unit, unitFormat) {
    if (!unitFormat && unit) {
        unitFormat = getUnitSettings(unit.name);
    }
    if (unitFormat) {
        if (unitFormat.round) {
            scalar = coolRound(scalar, unitFormat.round);
        }

        switch (unitFormat.printAs) {
            case "code":
                return scalar + " " + unitFormat.code;
            case "long":
                if (scalar === 1) {
                    return scalar + " " + unitFormat.long.singular;
                } else {
                    return scalar + " " + unitFormat.long.plural;
                }
            default:
                return scalar + " " + unitFormat.printAs;
        }
    } else {
        return math.round(scalar, 3);
    }
}

//var test = [
//    "2 cm",
//    "2cm * 4cm",
//    "1 + 1",
//    "(1 m + 2 m) * 5 m",
//    "1 inch * 2 inch"
//];
//
//test.forEach(expr => {
//    const conversions = getConversions(expr);
//    if (conversions.length > 0) {
//        console.log(expr + ' = ' + conversions.join(" = "));
//    }
//});
//
//process.exit();


module.exports = {
    getConversions: getConversions
};