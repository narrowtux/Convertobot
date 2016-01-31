"use strict";
let Slack = require("slack-client");
let cloudinary = require("cloudinary");
let config = require("config");
let wolfram = require("./wolfram.js").withToken(config.get("wolframAlphaApiKey"));

var api = {
    wolfram: wolfram,
    cloudinary: cloudinary,
    slack: new Slack(config.get("slackApiKey"), true, true)
};

cloudinary.config({
    cloud_name: config.get("cloudinaryName"),
    api_key: config.get("cloudinaryApiKey"),
    api_secret: config.get("cloudinaryApiSecret")
});

module.exports = api;