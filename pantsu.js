// requires and constants
let Discord = require('discord.js');
let client = new Discord.Client();
let readline = require('readline');
let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
let crypto = require('crypto');
let fs = require('fs');
let config = require('./config.json');

if(config.token == null){
  rl.question('What is your bot\'s login token? ', (token) => {
    rl.question('Pick a password to encrypt this token. ', (passphrase) => {
      rl.close();
      config.token = encryptToken(token, passphrase);
      config.tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      fs.writeFileSync('./config.json', JSON.stringify(config), 'utf-8');
    });
  });
}
else{
  rl.question('What is your token password? ', (passphrase) => {
    rl.close();
    var rawToken = decryptToken(config.token, passphrase);

    // Verify the token against the stored hash to ensure password was correct
    if(crypto.createHash('sha256').update(rawToken).digest('hex') == config.tokenHash){
      console.log(`Logging in with token ${rawToken}`);
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
  // That said, I am very lazy, and I will probably run my bot out of the git directory
  // So let's hope someone with too much time on their hands doesn't crack my shitty encryption

  console.log(`Encrypting ${token} with passphrase ${passphrase}`);

  let plaintext = Buffer.from(token, 'utf8');
  let digest = crypto.createHash('sha256').update(passphrase).digest();
  var output = Buffer.alloc(plaintext.length);

  for(var i = 0; i < plaintext.length; i++){
    output[i] = digest[i % digest.length] ^ plaintext[i];
  }

  return output.toString('base64');
}

function decryptToken(token, passphrase){
  // The algorithm in this function is identical, but the passphrase needs to be converted from base64 rather than utf8
  // Additionally, the output needs to be in utf8, not base64

  console.log(`Decrypting ${token} with passphrase ${passphrase}`);

  let plaintext = Buffer.from(token, 'base64');
  let digest = crypto.createHash('sha256').update(passphrase).digest();
  var output = Buffer.alloc(plaintext.length);

  for(var i = 0; i < plaintext.length; i++){
    output[i] = digest[i % digest.length] ^ plaintext[i];
  }

  return output.toString('utf8');
}

function login(token){
  client.login(token);
}

// callbacks
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === 'ping') {
    msg.reply('Pong!');
  }
});