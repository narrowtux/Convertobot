"use strict";
let Slack = require("slack-client");
let cloudinary = require("cloudinary");
let config = require("./config");
let wolfram = require("./wolfram.js").withToken(config.wolframAlphaApiKey);

var api = {
    wolfram: wolfram,
    cloudinary: cloudinary,
    slack: new Slack(config.slackApiKey, true, true)
};

cloudinary.config({
    cloud_name: config.cloudinaryName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret
});

module.exports = api;
