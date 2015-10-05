"use strict";

let xml2js = require("xml2js");
let request = require("request");
let Log = require("log");
let logger = new Log("WolframAlpha");

var wolfram = {
    withToken: function(token) {
        wolfram.token = token;
        return wolfram;
    },
    query: function(query, callback, opts) {
        if(!wolfram.token) {
            logger.critical("Application key not set");
            return;
        }

        var uri = 'http://api.wolframalpha.com/v2/query?input=' + encodeURIComponent(query) + '&primary=true&appid=' + wolfram.token;

        request(uri, function(error, response, body) {
            if(!error && response.statusCode == 200) {
                var doc = xml2js.parseString(body, function(err, result) {
                    console.log(result);
                    if (!err) {
                        callback(result.queryresult.$.error == "true", result.queryresult);
                    } else {
                        callback(true, null);
                    }
                });

            } else {
                logger.critical(error);
                return;
            }
        })

    }
};

module.exports = wolfram;