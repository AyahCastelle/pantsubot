const request = require('request');
const parseString = require('xml2js').parseString;
const config = require('./config.json');

const CMDS = {
    "analyze": {
        "description": "Analyze an image",
        "adminonly": false,
        "usage": "analyze [url]",
        "minArgs": "1",
        "maxArgs": "2",
        "action": function (message, args, Discord, client) {
            if(config.visionAPIKey == null){
                message.channel.send("Image analyzer not configured!");
            }
            var url2analyze = args[1];
            if (url2analyze == null || !isURL(url2analyze)) {
                message.channel.send("I can't understand that!");
            } else {
                message.channel.startTyping();
                var options = {
                    uri: 'https://vision.googleapis.com/v1/images:annotate?key=' + config.visionAPIKey,
                    method: 'POST',
                    json: {
                        "requests": [{
                            "image": {
                                "source": {
                                    "imageUri": url2analyze
                                }
                            },
                            "features": [{
                                    "type": "WEB_DETECTION"
                                },
                                {
                                    "type": "SAFE_SEARCH_DETECTION"
                                }
                            ]
                        }]
                    }
                };

                request(options, (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        //console.log(util.inspect(body, false, null))
                        if (body.responses[0].error != null) {
                            message.channel.send("Sorry, I couldn't understand that. I'm having trouble with discord image links.");
                        } else {
                            let webInfo = body.responses[0].webDetection;
                            message.channel.send(`This image really reminds me of ${webInfo.webEntities[0].description}, ${webInfo.webEntities[1].description}, and ${webInfo.webEntities[2].description}`);
                            if (webInfo.visuallySimilarImages != null)
                                message.channel.send(`This image also looks kinda like this one, check it out: ${webInfo.visuallySimilarImages[0].url}`);
                            message.channel.send(`The chances that this image is slightly lewd are ${body.responses[0].safeSearchAnnotation.racy.toLowerCase().replace('_', ' ')}. The chances that this image is extremely lewd are ${body.responses[0].safeSearchAnnotation.adult.toLowerCase().replace('_', ' ')}.`);
                        }
                    } else {
                        console.log(error);
                    }
                    message.channel.stopTyping();
                });
            }
        }
    },
    "rule34": {
        "isAlias": true,
        "cmdName": "r34"
    },
    "r34": {
        "description": "Get porn from rule34.xxx",
        "adminonly": false,
        "usage": "r34 [tags...]",
        "minArgs": "1",
        "maxArgs": "-1",
        "action": function (message, args, Discord, client) {
            fetchPorn(args, Discord, "r34", message)
        }
    },
    "yandere": {
        "isAlias": true,
        "cmdName": "yan"
    },
    "yan": {
        "description": "Get images from yande.re",
        "adminonly": false,
        "usage": "yan [tags...]",
        "minArgs": "1",
        "maxArgs": "-1",
        "action": function (message, args, Discord, client) {
            fetchPorn(args, Discord, "yan", message)
        }
    },
    "gelbooru": {
        "isAlias": true,
        "cmdName": "gel"
    },
    "gel": {
        "description": "Get porn from gelbooru",
        "adminonly": false,
        "usage": "gel [tags...]",
        "minArgs": "1",
        "maxArgs": "-1",
        "action": function (message, args, Discord, client) {
            fetchPorn(args, Discord, "gel", message)
        }
    },
    "e621": {
        "description": "Get porn from e621 (lol furry)",
        "adminonly": false,
        "usage": "e621 [tags...]",
        "minArgs": "1",
        "maxArgs": "-1",
        "action": function (message, args, Discord, client) {
            fetchPorn(args, Discord, "e621", message)
        }
    },
    "help": {
        "description": "Get help on commands or list all commands",
        "adminonly": false,
        "usage": "help (command)",
        "minArgs": "0",
        "maxArgs": "2",
        "action": function (message, args, Discord, client) {
            if (args.length == 2) {
                if (CMDS[args[1]] == undefined) {
                    message.channel.send("Command not found!");
                } else {
                    var commandTarget = CMDS[args[1]];
                    if (commandTarget.isAlias)
                        commandTarget = CMDS[commandTarget.cmdName];
                    message.channel.send({
                        embed: {
                            color: 3447003,
                            description: commandTarget.description + "\nUsage: " + commandTarget.usage
                        }
                    });
                }
            } else {
                var cmdList = "```";
                Object.keys(CMDS).forEach(function (key) {
                    var val = CMDS[key];
                    cmdList += key;
                    var extraSpaces = 8 - key.length;
                    for (var i = extraSpaces; i > 0; i--) {
                        cmdList += " ";
                    }
                    cmdList += "  |     ";
                    if (val.isAlias)
                        cmdList += "Alias for " + val.cmdName;
                    else
                        cmdList += val.description;
                    if (val.adminonly)
                        cmdList += "     (Admin Only)";
                    cmdList += "\n";
                });
                cmdList += "```";
                message.channel.send(cmdList);
            }
        }
    }
}

function fetchPorn(args, Discord, targetSite, message) {

    //Indicate that the bot is now doing something
    message.channel.startTyping();

    //API Endpoint select
    var baseURL = "";
    if (targetSite == "yan") {
        baseURL = "https://yande.re/post/index.json?limit=100&tags=";
    } else if (targetSite == "gel") {
        baseURL = "https://gelbooru.com/index.php?page=dapi&s=post&q=index&limit=100&json=1&tags=";
    } else if (targetSite == "e621") {
        baseURL = "https://e621.net/post/index.json?limit=320&tags=";
    } else if (targetSite == "r34") {
        baseURL = "http://rule34.xxx/index.php?page=dapi&s=post&q=index&limit=100&tags=";
    }
    //and so on

    var tags = "";
    //Add on the tags
    for (var i = 1; i < args.length; i++) {
        baseURL += args[i];
        baseURL += "+";
        tags += args[i] + " ";
    }

    //Set user agent
    var requestOptions = {
        url: baseURL,
        headers: {
            'User-Agent': 'gameboyprinter-discord-bot'
        }
    };

    if (targetSite == "r34") {
        //Make the API request
        request(requestOptions, (error, response, body) => {
            //Convert XML to JSON (ugh)
            parseString(body, (e, result) => {
                if (result == null || result.posts.post == null) {
                    message.channel.send("```No posts found```");
                    message.channel.stopTyping();
                    return;
                }
                //Pick random post
                var postNum = getRandomInt(0, result.posts.post.length);
                var postImg = result.posts.post[postNum]["$"].file_url;
                var postPage = "https://rule34.xxx/index.php?page=post&s=view&id=" + result.posts.post[postNum]["$"].id
                //And send it!
                var postMsg = message.channel.send({
                    embed: {
                        color: message.member.displayColor,
                        author: {
                            name: message.member.displayName,
                            icon_url: message.member.user.avatarURL
                        },
                        title: tags,
                        url: postPage,
                        image: {
                            url: postImg
                        }
                    }
                });
                message.channel.stopTyping();
                var memberID = message.member.user.id;
                message.delete();

            });
        });
    } else {
        //Make the API request
        request(requestOptions, (error, response, body) => {
            if (body.length == 0) {
                message.channel.send("```No posts found```");
                message.channel.stopTyping();
                return;
            }

            //Most use JSON but r34.xxx uses XML for some fucking reason
            var result = JSON.parse(body);
            if (result == null || result.length == 0) {
                message.channel.send("```No posts found```");
                message.channel.stopTyping();
                return;
            }

            //Pick a post
            var postNum = getRandomInt(0, result.length);
            var postImg = result[postNum].file_url;
            var postPage = "";

            if (targetSite == "yan") {
                postPage = "https://yande.re/post/show/" + result[postNum].id;
            } else if (targetSite == "gel") {
                postPage = "https://gelbooru.com/index.php?page=post&s=view&id=" + result[postNum].id;
            } else if (targetSite == "e621") {
                postPage = "https://e621.net/post/show/" + result[postNum].id + "/";
            }

            //And send it
            var postMsg = message.channel.send({
                embed: {
                    color: message.member.displayColor,
                    author: {
                        name: message.member.displayName,
                        icon_url: message.member.user.avatarURL
                    },
                    title: tags,
                    url: postPage,
                    image: {
                        url: postImg
                    }
                }
            });
            var memberID = message.member.user.id; //Why do i need this
            message.channel.stopTyping();
            message.delete();
        });
    }
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function isURL(str) {
    let urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
    let url = new RegExp(urlRegex, 'i');
    return str.length < 2083 && url.test(str);
}

module.exports = {
    CMDS: CMDS
};