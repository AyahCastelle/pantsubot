// requires and constants
const Discord = require('discord.js');
const client = new Discord.Client();
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const crypto = require('crypto');
const fs = require('fs');
const util = require('util')
const request = require('request');

if(!fs.existsSync('./config.json')){
  console.log('Config not found, creating empty config.');
  fs.writeFileSync('./config.json', '{}', 'utf8');
}

const config = require('./config.json');

if(config.token == null){
  rl.question('What is your bot\'s login token? ', (token) => {
    rl.question('Pick a password to encrypt this token. ', (passphrase) => {
      rl.close();
      config.token = encryptToken(token, passphrase);
      config.tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      fs.writeFileSync('./config.json', JSON.stringify(config), 'utf-8');
      login(token);
    });
  });
}
else{
  rl.question('What is your token password? ', (passphrase) => {
    rl.close();
    let rawToken = decryptToken(config.token, passphrase);

    // Verify the token against the stored hash to ensure password was correct
    if(crypto.createHash('sha256').update(rawToken).digest('hex') == config.tokenHash){
      login(rawToken);
    }
    else{
      console.log('Incorrect password!');
    }
  });
}

// functions
function encryptToken(token, passphrase){
  // TODO: Implement PBKDF2, but a single SHA256 hash is sufficient for now, since the encrypted token shouldn't be shared anyways
  const plaintext = Buffer.from(token, 'utf8');
  const digest = crypto.createHash('sha256').update(passphrase).digest();
  let output = Buffer.alloc(plaintext.length);

  for(let i = 0; i < plaintext.length; i++){
    output[i] = digest[i % digest.length] ^ plaintext[i];
  }

  return output.toString('base64');
}

function decryptToken(token, passphrase){
  // The algorithm in this function is identical, but the passphrase needs to be converted from base64 rather than utf8
  // Additionally, the output needs to be in utf8, not base64
  const plaintext = Buffer.from(token, 'base64');
  const digest = crypto.createHash('sha256').update(passphrase).digest();
  let output = Buffer.alloc(plaintext.length);

  for(let i = 0; i < plaintext.length; i++){
    output[i] = digest[i % digest.length] ^ plaintext[i];
  }

  return output.toString('utf8');
}

function login(token){
  client.login(token);
}

function isURL(str) {
  var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}

// callbacks
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content.includes('analyze')) {
    var url2analyze = msg.content.split(" ")[1];
    if(url2analyze == null || !isURL(url2analyze)){
      msg.channel.send("I can't understand that!");
    }
    else{
      msg.channel.send("Analyzing");
      var options = {
        uri: 'https://vision.googleapis.com/v1/images:annotate?key=' + config.visionAPIKey,
        method: 'POST',
        json: {
          "requests": [
            {
              "image": {
                "source": {"imageUri": url2analyze}
              },
              "features": [
                {"type": "WEB_DETECTION"},
                {"type": "SAFE_SEARCH_DETECTION"}
              ]
            }
          ]
        }
      };
      
      request(options, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          //console.log(util.inspect(body, false, null))
          if(body.responses[0].error != null){
            msg.channel.send("Sorry, I couldn't understand that. I'm having trouble with discord image links.");
          }
          else{
            let webInfo = body.responses[0].webDetection;
            msg.channel.send(`This image really reminds me of ${webInfo.webEntities[0].description}, ${webInfo.webEntities[1].description}, and ${webInfo.webEntities[2].description}`);
            if(webInfo.visuallySimilarImages != null)
              msg.channel.send(`This image also looks kinda like this one, check it out: ${webInfo.visuallySimilarImages[0].url}`);
            msg.channel.send(`The chances that this image is slightly lewd are ${body.responses[0].safeSearchAnnotation.racy.toLowerCase().replace('_', ' ')}. The chances that this image is extremely lewd are ${body.responses[0].safeSearchAnnotation.adult.toLowerCase().replace('_', ' ')}.`);
          }
        }
        else{
          console.log(error);
        }
      }); 
    }
  }
});