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

// callbacks
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content.includes('pantsu')) {
    
  }
});