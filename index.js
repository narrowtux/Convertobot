"use strict";

let Slack = require("slack-client");
let fs = require("fs");
let Log = require("log");
let config = require("./config.js");
let bodyParser = require('body-parser');
let multer = require('multer');
let express = require("express");
let wolfram = require("wolfram").createClient(config.wolframAlphaApiKey);
let Message = require("./message.js");

let logger = new Log("info");
let slack = new Slack(config.slackApiKey, true, true);

let metric = makeExpr(config.metric);
let imperial = makeExpr(config.imperial);

let wolframAlphaQuery = /`=(.*)`/g;

console.log(metric);
console.log(imperial);

function makeExpr(units) {
    var str = "`([0-9/]*\\s?(";
    for (var i = 0; i < units.length; i++) {
        str += units[i].replace(/\//, "\\/");
        if (i < units.length - 1) {
            str += "|";
        }
    }
    str += "))`";
    return new RegExp(str, "g");
}


slack.on("error", function(err) {
    logger.critical(err);
});

function simpleConvert(origin, target, channel) {
    var msg = new Message({
        as_user: true,
        channel: channel.id,
        text: origin + " = `Computing ...`"
    }, slack);

    msg.send();
    wolfram.query("convert " + origin + " to " + target, function (err, result) {
        if (!err) {
            msg.text = origin + " = " + result[1].subpods[0].value;
            msg.update();
        } else {
            msg.text = "Error.";
            msg.update();
        }
    });
}

function wolframQuery(query, channel) {
    var msg = new Message({
        as_user: true,
        channel: channel.id,
        text: " ",
        attachments: [{
            title: "Query",
            text: "`" + query + "`",
            mrkdwn_in: ["text"]
        },{
            text: "`Computing ...`",
            mrkdwn_in: ["text"]
        }]
    }, slack);
    msg.send();

    wolfram.query(query, function(err, res) {
        if (!err) {
            var attachments = [];
            res.forEach(function(pod) {
                var attachment = {
                    title: pod.title,
                };
                pod.subpods.forEach(function (subpod) {
                    attachment.image_url = subpod.image;
                    attachment.fallback = subpod.value;
                    attachments.push(attachment);
                    attachment = {}
                });
            });
            msg.attachments = attachments;
            msg.update();
        }
    });
}

slack.on("open", function() {
    var mainChannel = slack.getChannelByName("main");
});

slack.on("message", function(message) {
    var res = metric.exec(message.text);
    var channel = slack.getChannelByID(message.channel);
    if (res) {
        simpleConvert(res[1], "imperial", channel);
    } else {
        res = imperial.exec(message.text);
        if (res) {
            simpleConvert(res[1], "metric", channel);
        } else {
            res = wolframAlphaQuery.exec(message.text);
            if (res) {
                wolframQuery(res[1], channel);
            }
        }
    }
});

slack.login();

