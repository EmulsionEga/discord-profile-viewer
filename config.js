require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    DISCORD_CALLBACK_URL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
    SESSION_SECRET: process.env.SESSION_SECRET || 'discord-profile-secret'
};
