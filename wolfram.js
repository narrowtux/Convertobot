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

        var uri = 'http://api.wolframalpha.com/v2/query?input=' + encodeURIComponent(query) + '&primary=true&maxwidth=400&width=400&appid=' + wolfram.token;

        var retries = opts ? opts.retries : 0;

        request(uri, function(error, response, body) {
            if(!error && response.statusCode == 200) {
                var doc = xml2js.parseString(body, function(err, result) {
                    //console.log(result);
                    if (!err) {
                        callback(result.queryresult.$.error == "true", result.queryresult);
                    } else {
                        callback(true, null);
                    }
                });

            } else {
                logger.critical("Query '" + query + "' resulted in error:");
                logger.critical(error);
                logger.critical(response);

                if (retries < 3) {
                    retries ++;
                    logger.critical("Retry " + retries + " / 3");
                    if (!opts) {
                        opts = {};
                    }
                    opts.retries = retries;
                    wolfram.query(query, callback, opts);
                } else {
                    callback(true, null);
                }
            }
        })

    }
};

module.exports = wolfram;