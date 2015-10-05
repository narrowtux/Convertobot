"use strict";

let Slack = require("slack-client");
let fs = require("fs");
let Log = require("log");
let config = require("./config.js");
let bodyParser = require('body-parser');
let multer = require('multer');
let express = require("express");
let wolfram = require("./wolfram.js").withToken(config.wolframAlphaApiKey);
let Message = require("./message.js");

let logger = new Log("info");
let slack = new Slack(config.slackApiKey, true, true);

let cloudinary = require("cloudinary");

let metricCode = makeExpr(config.metric, "`");
let imperialCode = makeExpr(config.imperial, "`");
let metricExpression = makeExpr(config.metric, "");
let imperialExpression = makeExpr(config.imperial, "");
let convertToSyntax = /(.*) to (.*)/;

let wolframAlphaQuery = /`=(\+?)([^\`]*)`/g;
let webapp = express();

cloudinary.config({
    cloud_name: config.cloudinaryName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret
});

function extracted(units, prefix, suffix) {
    var str = prefix + "([0-9/\\.]*\\s?(";
    for (var i = 0; i < units.length; i++) {
        str += units[i].replace(/\//, "\\/");
        if (i < units.length - 1) {
            str += "|";
        }
    }
    str += "))" + suffix;
    return new RegExp(str, "g");
}
function makeExpr(units, fence) {
    return extracted(units, fence, fence);
}


slack.on("error", function(err) {
    logger.critical(err);
});

function simpleConvert(origin, target, channel) {
    var msg = new Message({
        as_user: true,
        channel: channel.id,
        text: origin + " = _Computing …_"
    }, slack);

    msg.send();
    wolfram.query("convert " + origin + " to " + target, function (err, result) {
        if (!err && result && result.pod) {
            var plaintext = result.pod[1].subpod[0].plaintext[0];
            plaintext = plaintext.replace(/\(.+\)/, "");
            msg.text = origin + " = " + plaintext;
            msg.update();
        } else {
            msg.text = "Does not compute";
            msg.update();
        }
    });
}

function wolframQuery(query, channel, full) {
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
    var msg = new Message({
        as_user: true,
        channel: channel.id,
        text: " ",
        attachments: atts}, slack);
    msg.send();

    wolfram.query(query, function(err, res) {
        function addAttachment(pod) {
            var attachment = {};
            if (!full) {
                attachment.color = "#F58120";
            }
            attachment.title = pod.$.title;
            attachment.title_link = "http://www.wolframalpha.com/input/?i=" + encodeURIComponent(query);
            pod.subpod.forEach(function (subpod) {
                attachment.image_url = subpod.img[0].$.src;
                attachment.fallback = subpod.plaintext[0];
                if (pod.$.primary) {
                    attachment.color = "#F58120";
                }
                attachments.push(attachment);
                attachment = {}
            });
        }
        function checkDone() {
            var containsWolfram = false;
            attachments.forEach(function(attachment) {
                if (attachment.image_url && attachment.image_url.indexOf("wolframalpha.com") >= 0) {
                    containsWolfram = true;
                }
            });
            if (!containsWolfram) {
                msg.attachments = attachments;
                msg.update();
            }
        }

        if (!err && res && res.pod) {
            var attachments = [];
            res.pod.forEach(function(pod) {
                if (!full && !pod.$.primary) {
                    return;
                }
                addAttachment(pod);
            });
            if (attachments.length == 0 && res.pod.length >= 2) {
                addAttachment(res.pod[1]);
            } else if (res.pod.length == 0) {
                msg.text = "Does not compute";
                msg.update();
                return;
            }

            attachments.forEach(function (attachment) {
                if (attachment.image_url) {
                    cloudinary.uploader.upload(attachment.image_url, function(result) {
                        var i = attachments.indexOf(attachment);
                        attachments[i].image_url = result.secure_url;
                        attachments[i].image_width = result.width;
                        attachments[i].image_height = result.height;
                        attachments[i].from_url = result.secure_url;
                        checkDone();
                    }, {format: "png"});
                }
            });
        } else {
            msg.text = "Error";
            msg.attachments = null;
            msg.update();
        }
    });
}

slack.on("open", function() {
    logger.info("ready");
});

slack.on("message", function(message) {
    var res = metricCode.exec(message.text);
    var channel = slack.getChannelByID(message.channel);
    if (res) {
        simpleConvert(res[1], "imperial", channel);
    } else {
        res = imperialCode.exec(message.text);
        if (res) {
            simpleConvert(res[1], "metric", channel);
        } else {
            res = wolframAlphaQuery.exec(message.text);
            if (res && res[2] != "") {
                wolframQuery(res[2], channel, res[1] == '+');
            }
        }
    }
});

slack.login();

webapp.use(bodyParser.json()); // for parsing application/json
webapp.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

webapp.post("/slackslash", function(req, res) {
    logger.info("Incoming slackslash");
    if (req.body.token == config.slackSlashToken) {
        if (req.body.command == "/convert") {
            var match;
            let text = req.body.text;
            if (match = text.match(convertToSyntax)) {
                simpleConvert(match[1], match[2], slack.getChannelByID(req.body.channel_id));
            } else if (match = text.match(metricExpression)) {
                simpleConvert(match[0], "imperial", slack.getChannelByID(req.body.channel_id));
            } else if (match = text.match(imperialExpression)) {
                simpleConvert(match[0], "metric", slack.getChannelByID(req.body.channel_id));
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

var server = webapp.listen(config.slackSlackPort);

