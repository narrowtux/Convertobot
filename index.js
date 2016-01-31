"use strict";

// setup dependencies
let fs = require("fs");
let Log = require("log");
let config = require("config");
let bodyParser = require('body-parser');
let multer = require('multer');
let express = require("express");
let webapp = express();
let Message = require("./message.js");

let logger = new Log("info");
let api = require("./api.js");

// setup APIs we use
let wolfram = api.wolfram;
let slack = api.slack;
let cloudinary = api.cloudinary;
let queries = require("./query.js");


let convertQuerySyntax = /`([^`=]*)`/g;
let convertToSyntax = /(.*) to (.*)/;
var currencies = [];
var currencyExpressions = [];
config.get("currencies").forEach(function (l) {
    currencies.push(_makeExpr(l, "`", "`", true));
    currencyExpressions.push(_makeExpr(l, "^", "$", true));
});

let wolframAlphaQuery = /`=(\+?)([^\`]*)`/g;

const COMPUTING_TEXT = "_Computing …_";


function _makeExpr(units, prefix, suffix, both) {
    var str = prefix;
    if (both) {
        str += "(([0-9/\\.]*\\s?)?(";
    } else {
        str += "([0-9/\\.]*\\s?(";
    }
    for (var i = 0; i < units.length; i++) {
        str += units[i].replace(/\//g, "\\/").replace(/\$/g, "\\$");
        if (i < units.length - 1) {
            str += "|";
        }
    }
    if (both) {
        str += ")\\s?([0-9/\\.]*)?)";
    } else {
        str += "))";
    }
    str += suffix;
    return new RegExp(str, "gi");
}

function makeExpr(units, fence) {
    return _makeExpr(units, fence, fence);
}


slack.on("error", function(err) {
    logger.critical(err);
});


function simpleConvert(origin, target, message) {
    multiConvert(origin, [target], message);
}

function multiConvert(origin, targets, message) {
    message.text = COMPUTING_TEXT;

    message.sendOrUpdate();

    new queries.SimpleConvert(origin, targets).solve(function (msg, atts, error) {
        if (!error) {
            message.text = msg;
        } else {
            message.text = "Does not compute!";
        }
        message.update();
    });
}

function wolframQuery(query, full, message) {
    var atts = [];
    if (full) {
        atts.push({
                title: "Query",
                text: "`" + query + "`",
                mrkdwn_in: ["text"]
            }
        );

        atts.push({
            title: "Result",
            text: "_Computing …_",
            mrkdwn_in: ["text"]
        });
    } else {
        atts.push({
            text: "_Computing …_",
            mrkdwn_in: ["text"]
        });
    }

    message.text = " ";
    message.attachments = atts;
    message.sendOrUpdate();

    new queries.WolframQuery(query, full).solve(function (msg, atts, error) {
        if (!error) {
            message.attachments = atts;
        } else {
            message.text = "Does not compute!";
        }
        message.update();
    })
}

var messages = {};

slack.on("open", function() {
    logger.info("ready");

    slack._apiCall("channels.list", {}, function(channels) {
        if (channels.ok) {
            var list = [];
            channels.channels.forEach(function (channel) {
                if (!channel.is_member) {
                    list.push(" - #" + channel.name);
                }
            });
            if (list.length > 0) {
                logger.info("This bot is not in these channels:");
                list.forEach(function (channel) {
                    console.log(channel);
                });
            }
        }
    });
    slack.on("message", function(message) {
        if (message.text) {
            var msg = new Message({
                channel: message.channel
            }, slack);
            messages[message.channel + message.ts] = {
                message: msg,
                time: Date.now()
            };
            onMessage(message, msg);
        } else if (message.subtype && message.subtype == "message_changed") {
            msg = messages[message.channel + message.message.ts];
            if (msg) {
                onMessage(message.message, msg.message);
            }
        } else if (message.subtype && message.subtype == "message_deleted") {
            msg = messages[message.channel + message.deleted_ts];
            if (msg && msg.message) {
                msg.message.remove();
            }
        }
    });
});




setInterval(function () {
    var toRemove = [];
    for (var key in messages) {
        if (messages.hasOwnProperty(key)) {
            var value = messages[key];
            if (value.time < Date.now() - 60 * 60 * 1000) {
                toRemove.push(key);
            }
        }
    }
    toRemove.forEach(function(val) {
        delete messages[val];
    });
}, 5 * 60 * 1000);

function onMessage(message, botMessage) {
    function updateMessage() {
        var texts = [];
        var attachments = [];
        for (var i = 0; i < q.length; i++) {
            if (results[i]) {
                if (results[i].message) {
                    texts.push(results[i].message);
                }
                if (results[i].attachments) {
                    attachments = attachments.concat(results[i].attachments);
                }
                if (results[i].error) {
                    texts.push(q[i].query + " = Does not compute!");
                }
            } else {
                texts.push(q[i].query + " = " + COMPUTING_TEXT);
            }
        }

        var text = "";
        for (i = 0; i < texts.length; i++) {
            text += texts[i];
            if (i < texts.length - 1) {
                text += "\n";
            }
        }

        if (text.length == 0) {
            text = " ";
        }

        botMessage.attachments = attachments;
        botMessage.text = text;
        botMessage.update();
    }

    var text = message.text;
    var query = null;

    var q = [];
    do {
        query = null;
        var res;
        if ((res = wolframAlphaQuery.exec(text)) && res && res[2] != "") {
            query = new queries.WolframQuery(res[2], res[1] == "+");
        } else if ((res = convertQuerySyntax.exec(text)) && res) {
            try {
                query = new queries.SimpleConvert(res[1]);
            } catch (e) {
                query = null;
            }
        }
        if (query) {
            q.push(query);
            console.log("Found a query " + query.query);
        }
    } while (query);

    if (q.length > 0) {
        var results = [];
        botMessage.text = COMPUTING_TEXT;

        for (var i = 0; i < q.length; i++) {
            let j = i;
            var query = q[i];
            query.solve(function(msg, atts, err) {
                if (!query.full && atts && atts.length > 0) {
                    atts[0].text = "Query: `" + query.query + "`";
                    atts[0].mrkdwn_in = ["text"];
                }
                results[j] = {
                    message: msg,
                    attachments: atts,
                    error: err
                };
                updateMessage();
            });
        }

        botMessage.sendOrUpdate();
    }
}

slack.login();

webapp.use(bodyParser.json()); // for parsing application/json
webapp.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

webapp.post("/slackslash", function(req, res) {
    logger.info("Incoming slackslash");
    if (req.body.token == config.get("slackSlashToken")) {
        if (req.body.command == "/convert") {
            var match;
            let text = req.body.text;
            var message = new Message({channel: req.body.channel_id}, slack);
            if (match = text.match(convertToSyntax)) {
                simpleConvert(match[1], match[2], message);
            } else if (match = text.match(metricExpression)) {
                simpleConvert(match[0], "imperial", message);
            } else if (match = text.match(imperialExpression)) {
                simpleConvert(match[0], "metric", message);
            } else if (req.body.text == "") {
                //TODO scan last few messages for unit expressions
                res.send("Nothing to convert");
            } else {
                res.send("Wrong format");
            }
        }
    } else {
        res.status(401, "Wrong token");
        logger.info("Wrong token");
    }
});

var server = webapp.listen(config.get("slackSlackPort"));

