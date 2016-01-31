"use strict";

let Log = require("log");
let logger = new Log("messaging");

class Message {
    constructor(data, slack) {
        this.data = data;
        this.slack = slack;
        this.data.as_user = true;
    }

    sendOrUpdate() {
        if (!this.data.ts) {
            this.send();
        } else {
            this.update();
        }
    }

    send() {
        var data = this.data;
        data.attachments = JSON.stringify(data.attachments);
        this.slack._apiCall("chat.postMessage", data, this._onSent.bind(this));
    }

    update() {
        var data = this.data;
        data.attachments = JSON.stringify(data.attachments);
        this.slack._apiCall("chat.update", data, this._onUpdated.bind(this));
    }

    remove() {
        var data = {
            ts: this.data.ts,
            channel: this.data.channel
        };
        console.log("Deleting message");
        this.slack._apiCall("chat.delete", data, this._onDeleted.bind(this));
    }

    _onDeleted(data) {
        if (data.ok) {
            this.data.deleted = true;
        } else {
            console.log(data);
        }
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

module.exports = Message;
