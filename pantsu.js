const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === 'ping') {
    msg.reply('Pong!');
  }
});

client.login('NDMxODM4MjE5NDU4NDQ1MzMy.DakoeA.uBRvxZfEUtgWRC7Nt_qcR1ltq3s');