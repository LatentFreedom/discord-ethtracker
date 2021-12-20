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
            description: "alert user when eth reaches specified price",
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
    } catch (err) {
        console.log(err);
    }
}

const checkAlerts = () => {
    alerts.forEach((prices, author) => {
        prices.forEach(({price, channelId}, index) => {
            try {
                if (price >= ethPrice.result.ethusd) {
                    const res = author.send(`ETH is now $${ethPrice.result.ethusd}.`).catch(error => {
                        if (error.code === Constants.APIErrors.CANNOT_MESSAGE_USER) {
                            // console.error(`Failed to send direct message to ${author.username}#${author.discriminator}`);
                            client.channels.cache.get(channelId)
                                .send(`@${author.username}, ETH is now $${ethPrice.result.ethusd}.`)
                                .catch(error => {
                                    if (error.code === Constants.APIErrors.MISSING_ACCESS) {
                                        console.error(`Failed to send message to ${author.username}#${author.discriminator}. Bot missing access to channel.`);
                                    }
                                });
                        }
                    });
                    let newAlertList = [...alerts.get(author).slice(0, index), ...alerts.get(author).slice(index+1)];
                    alerts.set(author, newAlertList);
                }
            } catch (err) {
                console.log(err);
            }
        })
    })
}

setInterval(getEth, 10 * 2000);
setInterval(checkAlerts, 10 * 3000);

client.on('interactionCreate', (interaction) => {
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
        // Add alert to alerts mapping
        const alert = {
            price: price,
            channelId: interaction.channelId
        };
        if (!alerts.has(user)) {
            alerts.set(user, [alert]);
        } else {
            let newAlertList = alerts.get(user);
            newAlertList.push(alert);
            alerts.set(user,newAlertList);
        }
    }
})

client.login(process.env.DISCORD_TOKEN);