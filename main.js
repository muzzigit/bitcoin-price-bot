// Import required modules from discord.js
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
// Import HTTPS module to make API requests
const https = require("https");
// Load environment variables
require("dotenv").config();
// Load bot configuration from config.json
let config = require("./config.json");

// API endpoint for fetching Bitcoin price
const BITCOIN_API_URL = "https://api.coindesk.com/v1/bpi/currentprice.json";
// Hardcoded exchange rate from USD to CAD
const HARDCODED_EXCHANGE_RATE = 1.36;

// Initialize Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Handle guild-related events
        GatewayIntentBits.GuildMessages, // Handle incoming messages
        GatewayIntentBits.MessageContent, // Access message content
    ]
});

// Log in to Discord using bot token from .env
client.login(process.env.BOT_TOKEN);

let lastUpdated = ""; // Store the last updated time

// Format a number as currency with 2 decimal places
function formatMoney(amount) {
    return `$${parseFloat(amount).toFixed(2)}`;
}

// Fetch Bitcoin price in USD and convert to CAD
function fetchBitcoinData() {
    return new Promise((resolve, reject) => {
        https.get(BITCOIN_API_URL, (res) => {
            let data = ""; // Store incoming data
            res.on("data", (chunk) => (data += chunk)); // Append data chunks
            res.on("end", () => {
                try {
                    // Parse API response
                    data = JSON.parse(data);
                    const usdPrice = data.bpi.USD.rate_float; // Get USD price
                    const cadPrice = (usdPrice * HARDCODED_EXCHANGE_RATE).toFixed(2); // Convert to CAD
                    const updatedTime = data.time.updated; // Get updated time
                    resolve({ usdPrice, cadPrice, updatedTime }); // Return data
                } catch (error) {
                    reject("Error parsing Bitcoin data."); // Handle parse error
                }
            });
        }).on("error", (err) => reject(err)); // Handle request error
    });
}

// Create an embed message with Bitcoin info
async function createBitcoinEmbed() {
    const { usdPrice, cadPrice, updatedTime } = await fetchBitcoinData();
    const embed = new EmbedBuilder()
        .setColor(0xFFD700) // Gold color for Bitcoin
        .setTitle("Bitcoin Price Information")
        .addFields(
            { name: "💵 Price (USD)", value: formatMoney(usdPrice), inline: true },
            { name: "🇨🇦 Price (CAD)", value: formatMoney(cadPrice), inline: true },
            { name: "📅 Last Updated", value: updatedTime, inline: false }
        )
        .setTimestamp() // Add timestamp
        .setFooter({ text: "Powered by CoinDesk API" }); // Footer info
    return embed;
}

// Update bot's status with Bitcoin price and last update time
async function updateBotStatus() {
    const { cadPrice, updatedTime } = await fetchBitcoinData();
    lastUpdated = updatedTime; // Store last updated time
    client.user.setPresence({
        activities: [{ name: `BTC-CAD: ${formatMoney(cadPrice)} | Updated: ${updatedTime}`, type: "WATCHING" }],
        status: "online", // Set bot status to online
    });
}

// Handle commands sent to the bot
client.on("messageCreate", async (message) => {
    if (message.content.toLowerCase() === "!price") {
        // Respond with the latest Bitcoin price
        try {
            const { cadPrice } = await fetchBitcoinData();
            message.reply(`The current Bitcoin price in CAD is: ${formatMoney(cadPrice)}`);
        } catch (error) {
            message.reply("Failed to fetch Bitcoin price."); // Handle error
        }
    }

    if (message.content.toLowerCase() === "!btcinfo") {
        // Send detailed Bitcoin info using embed
        try {
            const embed = await createBitcoinEmbed();
            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply("Failed to fetch Bitcoin info."); // Handle error
        }
    }

    if (message.content.toLowerCase() === "!help") {
        // Display available commands using embed
        const helpEmbed = new EmbedBuilder()
            .setColor(0x00FF00) // Green color
            .setTitle("Bitcoin Bot Commands")
            .setDescription("Here are the available commands:")
            .addFields(
                { name: "!price", value: "Get the current Bitcoin price in CAD." },
                { name: "!btcinfo", value: "Get detailed Bitcoin price information." },
                { name: "!help", value: "Show this help message." }
            )
            .setTimestamp(); // Add timestamp
        message.channel.send({ embeds: [helpEmbed] });
    }
});

// Execute when the bot is ready
client.on("ready", () => {
    console.log("Bot is online and running!"); // Log bot status
    updateBotStatus(); // Update status initially
    setInterval(updateBotStatus, config.UPDATE_INTERVAL); // Periodic updates
});
