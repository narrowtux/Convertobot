# Convbot
Convbot integrates WolframAlpha into Slack.

## Features
 * Automatically converts units enclosed in `` ` ``
    * Try ``My car is `3 meters` long``
 * Queries WolframAlpha with `` `=<query>` ``
    *This will only show the primary pod of the WolframAlpha result, to not spam the channel.
    * Try `` `=image of obama` ``
 * Shows all the pods WolframAlpha gives us when you use `` `=+<query>` ``
    * Try `` `=+solve (x*8 + 3) = 0` ``
 * Slash-Command /convert
    * `/convert <unit expression>` converts metric to imperial or vice versa in the same style the ` unit expression would
       * Try `/convert 3 meters`
    * `/convert <unit expression> to <other unit>` does what you'd expect, also in the same style
       * Try `/convert 50 K to Fahrenheit`
 * Config has a list of units that we assign to either metric or imperial

## Setup
 1. Download the sources
 2. copy `config.example.js` to `config.js`
 3. Fill all necessary API Tokens in `config.js`. You need:
     1. Slack Bot API token
     2. Slack slash-command token
     3. Wolfram API token
     4. cloudinary API key, secret and app name
 4. Set the port you want the internal webserver to listen on for incoming slash commands. 
 
    **To set the URL for slash command in Slack**
    
    If your domain is `example.com`, and your port is `3000`, the URL will be `http://example.com:3000/slackslash`
 5. Install necessary dependencies using `npm install`
 6. Run the application using `npm start`
 
## License
This project is licensed under the GNU Lesser General Public License, Version 3.0
