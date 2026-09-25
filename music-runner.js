const { Client, GatewayIntentBits } = require("discord.js");
const { initMusicEngine } = require("./music-engine.js");

const TOKEN = process.env.DISCORD_TOKEN || Buffer.from("TVRVMU1qTXdNamt5TURreE1qQTRNRGt5TncuR29zcUlFLlFQZjU5WjQyY0NULXVWcFVIVU1DV0Y3T1VZUnZhak11NTZfNkZV", "base64").toString("utf-8");

const musicClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

initMusicEngine(musicClient);

musicClient.once("ready", () => {
  console.log(`[Architect Music Core] 🎶 Diva Engine connected to Discord Cloud Gateway as ${musicClient.user.tag}`);
});

musicClient.login(TOKEN).catch(err => {
  console.error("[Architect Music Core] ⚠️ Failed to connect to Discord:", err.message);
});
