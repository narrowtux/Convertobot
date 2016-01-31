"use strict";

let fs = require("fs");
var csv = require("csv");
var transform = require("stream-transform");
var consume = require("stream-consume");

var parser = csv.parse({delimiter: ","});
var file = process.argv[2];
var fileStream = fs.createReadStream(file, "utf-8");

var output = [];

var csvToConfig = transform(function(record, callback) {
    var data = {
        code: record[9],
        printAs: record[10],
        long: {
            singular: record[7],
            plural: record[8]
        },
        round: record[3] * 1,
        range: {
            from: record[4] === '' ? null : record[4] * 1,
            to: record[5] === '' ? null : record[5] * 1
        }
    };


    if (record[6] === "hidden") {
        data.hidden = true;
    }
    output.push(data);
    callback(null);
});

const stream = fileStream.pipe(parser).pipe(csvToConfig);
consume(stream);

stream.on("finish", function() {
    console.log(JSON.stringify(output));
});
