"use strict";
let api = require("./api.js");
let wolfram = api.wolfram;
let cloudinary = api.cloudinary;

class Query {
    constructor(query) {
        this.query = query;
    }

    get query() {
        return this._query;
    }

    set query(query) {
        this._query = query;
    }

    /**
     * Solves the query and calls the given function.
     * @param callback A function with the signature "message, attachments, error".
     **/
    solve(callback) {}
}

/**
 * Represents a simple conversion
 **/
class SimpleConvert extends Query {
    constructor(input, targetUnits) {
        super(input);
        this.targetUnits = targetUnits;
    }    

    /**
     * Converts the given input to the given target units.
     * @param callback A function with the signature "message, attachments, error".
     *                 This query type will only generate a message.
     **/
    solve(callback) {
        var query = "";
        var self = this;
        for (var i = 0; i < this.targetUnits.length; i++) {
            var unit = this.targetUnits[i];
            query += "convert " + this.query + " to " + unit;
            if (i < this.targetUnits.length - 1) {
                query += ", ";
            }
            console.log(query);
        }

        wolfram.query(query, function(err, result) {
            if (!err && result && result.pod) {
                var data = result.pod[1].subpod[0].plaintext[0];
                console.log(data);
                data = data.replace(/\([^\)]+\)/g, "");
                data = data.replace(/\s{2,}/g, ' ');
                data = data.replace(/\|/g, '=');
                data = data.replace(/euro/g, "€");
                var text = self.query + " = " + data;
                callback(text, [], false);
            } else {
                callback(null, null, true);
            }
        });
    }
}

/**
 * Represents a query to Wolfram|Alpha
 **/
class WolframQuery extends Query {
    /**
     * Constructs the query to Wolfram|Alpha.
     * @param query The query to send.
     * @param full Whether to display all resulting pods. If false, will only display the primary pod and all its subpods.
     */
    constructor(query, full) {
        super(query);
        this.full = full;
    }

    get full() {
        return this._full;
    }

    set full(full) {
        this._full = full;
    }

    /**
     * Executes the given query on Wolfram|Alpha.
     * @param callback A function with the signature "message, attachments, error".
     *                 This query type will only generate attachments.
     */
    solve(callback) {
        var self = this;
        wolfram.query(this.query, function (err, res) {
            function addAttachment(pod) {
                var attachment = {};
                if (!self.full) {
                    attachment.color = "#F58120";
                }
                attachment.title = pod.$.title;
                attachment.title_link = "http://www.wolframalpha.com/input/?i=" + encodeURIComponent(self.query);
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
                    callback(null, attachments, false);
                }
            }

            if (!err && res && res.pod) {
                var attachments = [];
                res.pod.forEach(function(pod) {
                    if (!self.full && !pod.$.primary) {
                        return;
                    }
                    addAttachment(pod);
                });
                if (attachments.length == 0 && res.pod.length >= 2) {
                    addAttachment(res.pod[1]);
                } else if (res.pod.length == 0) {
                    callback(null, null, true);
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
                callback(null, null, true);
            }
        });
    }
}

module.exports = {
    SimpleConvert: SimpleConvert,
    WolframQuery: WolframQuery
};