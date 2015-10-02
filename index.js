"use strict";

let Slack = require("slack-client");
let fs = require("fs");
let Log = require("log");
let config = require("./config.js");
let bodyParser = require('body-parser');
let multer = require('multer');
let express = require("express");

var webapp = express();


let logger = new Log("info");
let slack = new Slack(config.slackApiKey, true, true);

slack.on("error", function(err) {
    logger.critical(err);
});

slack.on("open", function() {
    var msg = new Message({
        as_user: true,
        channel: slack.getChannelByName("main").id,
        text: " ",
        attachments: [
            {text: "My laptop is `2 cm` thin.", "mrkdwn_in": ["text"]},
            {title: "Result", text: "Computing..."}
        ]
    });

    msg.send();

    setTimeout(function () {
        msg.attachments = [
            {text: "My laptop is `2 cm` thin.", "mrkdwn_in": ["text"]},
            {title: "Result", text: "2 cm = 1.5 inches"}
        ];
        msg.update();
    }, 3000);
});

slack.login();

class Message {
    constructor(data) {
        this.data = data;
    }

    send() {
        var data = this.data;
        data.attachments = JSON.stringify(data.attachments);
        slack._apiCall("chat.postMessage", data, this._onSent.bind(this));
    }

    update() {
        var data = this.data;
        data.attachments = JSON.stringify(data.attachments);
        slack._apiCall("chat.update", data, this._onUpdated.bind(this));
    }

    set text(text) {
        this.data.text = text;
    }

    get text() {
        return this.data.text;
    }

    get attachments() {
        return this.data.attachments;
    }

    set attachments(attachments) {
        this.data.attachments = attachments;
    }

    _onSent(data) {
        if (data.ok) {
            this.data.ts = data.ts;
        } else {
            logger.critical(data.error);
        }
    }

    _onUpdated(data) {
        if (!data.ok) {
            logger.critical(data.error);
        }
    }
}