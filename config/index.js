
var config = {
    "slackApiKey": process.env.SLACK_KEY,
    "slackSlashToken": process.env.SLACK_SLASH_TOKEN,
    "wolframAlphaApiKey": process.env.WOLFRAM_ALPHA_KEY,
    "cloudinaryApiKey": process.env.CLOUDINARY_API_KEY,
    "cloudinaryApiSecret": process.env.CLOUDINARY_API_SECRET,
    "cloudinaryName": process.env.CLOUDINARY_NAME,
    "slackSlackPort": process.env.SLACK_SLASH_PORT || 3001,
    "systems": {
        "metric": require('./metric'),
        "imperial": require('./imperial')
    },
    "replacePass": {
        "°\\s?C": "degC",
        "°\\s?F": "degF",
        "m²": "m^2",
        "m³": "m^3"
    },
    "currencies": [
        ["euro", "€", "eur", "euros"],
        ["usd", "dollars", "dollar", "$"],
        ["zloty", "zł", "PLN", "zl"]
    ]
};

module.exports = config;
