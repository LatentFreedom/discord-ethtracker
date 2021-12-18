const {Constants, Client, Intents, MessageEmbed} = require('discord.js');
const axios = require('axios');
require('dotenv').config();

let ethPrice = [];
let alerts = new Map();

const client = new Client({
    intents : [Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES]
});

client.on('ready', () => {
    console.log('ETH Tracker Running...');
    createCommands();
    getEth();
});

const createCommands = () => {
    const Guilds = client.guilds.cache.map(guild => guild.id);
    // Add commands to all guilds
    Guilds.forEach(guildId => {
        const guild = client.guilds.cache.get(guildId);
        let commands = guild.commands;
        // alert command
        commands?.create({
            name: "ethalert",
            description: "alert user when eth reaches specified amount",
            options: [
                {
                    name: "price",
                    description: "eth price to be alerted for",
                    required: true,
                    type: Constants.ApplicationCommandOptionTypes.NUMBER
                }
            ]
        })
    });
}

const getEth = async () => {
    try {
        let req = `https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${process.env.ETHERSCAN_PRIV}`;
        const res = await axios.get(req);
        ethPrice = res.data;
        client.user.setActivity(`ETH | $${ethPrice.result.ethusd}`);
        checkAlerts();
    } catch (err) {
        console.log(err);
    }
}

const checkAlerts = () => {
    try {
        alerts.forEach((amounts, author) => {
            amounts.forEach((amount, index) => {
                if (amount >= ethPrice.result.ethusd) {
                    author.send(`ETH is now $${ethPrice.result.ethusd}.`);
                    let newAlertList = [...alerts.get(author).slice(0, index), ...alerts.get(author).slice(index+1)];
                    alerts.set(author, newAlertList);
                }
            })
        })
    } catch (err) {
        console.log(err);
    }
}

setInterval(getEth, 10 * 2000);

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) { return; }
    const { commandName, options } = interaction;
    if (commandName === 'ethalert') {
        // Process alert command
        const price = options.getNumber('price');
        const user = interaction.user;
        const name = user.username;
        interaction.reply({
            content: `Thanks, **${name}**. I will send a private message when ETH is below **$${price}**.`,
            ephemeral: true
        })
        // Add alert to Mapping
        if(!alerts.has(user)) {
            alerts.set(user, [price]);
        } else {
            let newAlertList = alerts.get(user);
            newAlertList.push(price);
            alerts.set(user, newAlertList);
        }
    }
})

client.login(process.env.DISCORD_TOKEN);