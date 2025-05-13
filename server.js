const express = require('express');
const axios = require('axios');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const isVercel = process.env.VERCEL === '1';

// Initialize Discord.js client with proper intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages
  ]
});

// Store user presences and data in memory
// Note: On Vercel, this will reset between function invocations
const userPresences = new Map();
const userCache = new Map();

// Discord.js client events
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Bot is in ${client.guilds.cache.size} servers`);
});

client.on('presenceUpdate', (oldPresence, newPresence) => {
  // Store the updated presence with timestamp
  console.log(`Presence update for user ${newPresence.userId || newPresence.user.id}: ${newPresence.status}`);
  
  const userId = newPresence.userId || (newPresence.user ? newPresence.user.id : null);
  if (!userId) {
    console.warn('Received presence update with no user ID');
    return;
  }
  
  userPresences.set(userId, {
    status: newPresence.status,
    activities: newPresence.activities || [],
    updatedAt: Date.now()
  });
});

// Login with bot token if available and not on Vercel
// Note: For Vercel, we'll only connect the bot when an API request comes in
let botConnected = false;
if (BOT_TOKEN && !isVercel) {
  connectBot();
} else if (!BOT_TOKEN) {
  console.warn('\x1b[33m%s\x1b[0m', 'No Discord bot token provided. The application will use simulated data.');
  console.warn('\x1b[33m%s\x1b[0m', 'Set DISCORD_BOT_TOKEN in your .env file to enable real Discord data.');
}

async function connectBot() {
  if (botConnected) return;
  
  try {
    await client.login(BOT_TOKEN);
    botConnected = true;
    console.log('Bot connected successfully');
  } catch (err) {
    console.error('Failed to login to Discord:', err);
    console.warn('\x1b[33m%s\x1b[0m', 'Bot login failed. The application will use simulated data instead.');
    botConnected = false;
  }
}

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to index.html (search page)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to profile page
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// API endpoint to get user profile data
app.get('/api/profile/:id', async (req, res) => {
  // On Vercel, try to connect the bot on first API request
  if (BOT_TOKEN && isVercel && !botConnected) {
    await connectBot();
  }
  
  const userId = req.params.id;

  try {
    // Validate Discord ID format
    if (!/^\d{17,19}$/.test(userId)) {
      return res.status(400).json({ 
        error: 'Invalid Discord ID format',
        message: 'Discord IDs are typically 17-19 digits.'
      });
    }

    // Check if we have cached user data that's not too old
    if (userCache.has(userId)) {
      const cachedData = userCache.get(userId);
      const now = Date.now();
      // Use cache if it's less than 5 minutes old
      if (cachedData.cachedAt && now - cachedData.cachedAt < 5 * 60 * 1000) {
        console.log(`Serving cached data for user ${userId}`);
        return res.json(cachedData);
      }
    }

    // Try to fetch from Discord API if bot token is available
    if (client.isReady()) {
      try {
        // Try to get user from Discord.js cache or API
        const user = await client.users.fetch(userId, { force: true });
        
        if (user) {
          // Format avatar URL
          const avatarURL = user.displayAvatarURL({ dynamic: true, size: 256 });
          
          // Calculate account creation date from ID
          const idBinary = BigInt(userId).toString(2).padStart(64, '0');
          const timestamp = parseInt(idBinary.substring(0, 42), 2) + 1420070400000;
          const createdAt = new Date(timestamp).toISOString();
          
          // Get presence data if available
          const presence = userPresences.get(userId);
          
          // Get member data from a guild if possible to get more info
          let about_me = null;
          let banner = null;
          let banner_color = null;
          
          // Try to find this user in any guild the bot is in
          for (const guild of client.guilds.cache.values()) {
            try {
              const member = await guild.members.fetch(userId);
              if (member) {
                // If we found the member, we might be able to get more data
                about_me = member.user.bio || null;
                banner = member.user.banner || null;
                banner_color = member.user.accentColor ? `#${member.user.accentColor.toString(16)}` : null;
                break;
              }
            } catch (err) {
              // User not in this guild, continue to next guild
              console.log(`User ${userId} not found in guild ${guild.name}`);
            }
          }
          
          // Create user data object
          const userData = {
            id: userId,
            username: user.username,
            discriminator: user.discriminator || '0000',
            avatar: avatarURL,
            banner: banner,
            banner_color: banner_color,
            created_at: createdAt,
            about_me: about_me,
            status: presence?.status || 'offline',
            badges: [], // Discord API doesn't directly provide badges
            connections: [], // Will be fetched separately
            cachedAt: Date.now() // Add timestamp for cache management
          };
          
          // Cache the user data
          userCache.set(userId, userData);
          
          return res.json(userData);
        }
      } catch (discordErr) {
        console.error('Error fetching from Discord API:', discordErr.message);
        // Fall through to mock data if Discord API fails
      }
    }

    // If we couldn't get real data, return mock data
    // Generate a deterministic username based on the ID
    const usernameBase = "Discord";
    const discriminator = Math.floor(parseInt(userId.substring(userId.length - 4)) % 9000) + 1000;
    
    // Generate a deterministic created date based on the ID
    const idNum = BigInt(userId);
    const timestamp = Number((idNum >> 22n) + 1420070400000n);
    const createdDate = new Date(timestamp).toISOString();
    
    // Generate a deterministic avatar
    const avatarIndex = parseInt(userId.substring(userId.length - 1)) % 5;
    
    const mockUserData = {
      id: userId,
      username: usernameBase + userId.substring(userId.length - 4),
      discriminator: discriminator.toString(),
      avatar: `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`,
      banner: null, // Most users don't have banners
      banner_color: ["#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245"][parseInt(userId.substring(0, 1)) % 5],
      status: ["online", "idle", "dnd", "offline"][parseInt(userId.substring(0, 1)) % 4],
      about_me: "Discord Won't Let Muzlik Show The Bio, So You are Stuck With Me!",
      created_at: createdDate,
      badges: ["Nitro", "Server Booster", "Early Supporter"].slice(0, parseInt(userId.substring(0, 1)) % 4),
      connections: [
        { type: "Life", name: "life_user" + userId.substring(userId.length - 4) },
        { type: "Muzlik", name: "muzlik_user" + userId.substring(userId.length - 4) },
        { type: "Love", name: "love_user" + userId.substring(userId.length - 4) }
      ].slice(0, parseInt(userId.substring(0, 1)) % 4),
      cachedAt: Date.now() // Add timestamp for cache management
    };
    
    // Cache the mock data
    userCache.set(userId, mockUserData);
    
    // Add a small delay to simulate API call
    setTimeout(() => {
      res.json(mockUserData);
    }, 500);
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Discord profile',
      message: error.message || 'An unknown error occurred'
    });
  }
});

// API endpoint to get user status
app.get('/api/status/:id', async (req, res) => {
  // On Vercel, try to connect the bot on first API request
  if (BOT_TOKEN && isVercel && !botConnected) {
    await connectBot();
  }
  
  const userId = req.params.id;

  try {
    // Validate Discord ID format
    if (!/^\d{17,19}$/.test(userId)) {
      return res.status(400).json({ 
        error: 'Invalid Discord ID format'
      });
    }

    console.log(`Status request for user ${userId}`);
    
    // Check if we have cached presence data
    if (userPresences.has(userId)) {
      console.log(`Returning cached status for ${userId}: ${userPresences.get(userId).status}`);
      return res.json({ status: userPresences.get(userId).status });
    }

    // If client is ready, try to get status from a guild member
    if (client.isReady()) {
      try {
        console.log(`Bot is in ${client.guilds.cache.size} guilds`);
        
        // Try to find this user in any guild the bot is in
        for (const guild of client.guilds.cache.values()) {
          console.log(`Checking guild ${guild.name} (${guild.id}) for user ${userId}`);
          
          try {
            // Force fetch to ensure we get the latest data
            const member = await guild.members.fetch({ user: userId, force: true });
            
            if (member) {
              console.log(`Found user ${userId} in guild ${guild.name}`);
              
              if (member.presence) {
                console.log(`User ${userId} presence: ${member.presence.status}`);
                
                // Cache this presence for future requests
                userPresences.set(userId, {
                  status: member.presence.status,
                  activities: member.presence.activities || [],
                  updatedAt: Date.now()
                });
                
                return res.json({ status: member.presence.status });
              } else {
                console.log(`User ${userId} found but no presence data available`);
              }
            }
          } catch (err) {
            // User not in this guild or couldn't fetch presence, continue to next guild
            console.log(`Error fetching member ${userId} from guild ${guild.name}: ${err.message}`);
          }
        }
        
        console.log(`Could not find presence data for user ${userId} in any guild`);
      } catch (err) {
        console.log('Could not fetch presence data from guilds:', err.message);
      }
    } else {
      console.log('Discord client is not ready');
    }

    // If we couldn't get the real status, return a simulated one
    // This is deterministic based on user ID so it's consistent
    const statusOptions = ["online", "idle", "dnd", "offline"];
    const statusIndex = parseInt(userId.substring(0, 1)) % statusOptions.length;
    console.log(`Returning simulated status for ${userId}: ${statusOptions[statusIndex]}`);
    res.json({ status: statusOptions[statusIndex] });

  } catch (err) {
    console.error('Error fetching status:', err);
    res.status(500).json({ 
      error: 'Failed to fetch user status',
      details: err.message
    });
  }
});

// API endpoint to get user presence (activity)
app.get('/api/presence/:id', async (req, res) => {
  // On Vercel, try to connect the bot on first API request
  if (BOT_TOKEN && isVercel && !botConnected) {
    await connectBot();
  }
  
  const userId = req.params.id;

  try {
    // Validate Discord ID format
    if (!/^\d{17,19}$/.test(userId)) {
      return res.status(400).json({ 
        error: 'Invalid Discord ID format'
      });
    }

    // Check if we have cached presence data with activities
    if (userPresences.has(userId) && userPresences.get(userId).activities?.length > 0) {
      return res.json({ activities: userPresences.get(userId).activities });
    }

    // If client is ready, try to get presence from a guild member
    if (client.isReady()) {
      try {
        // Try to find this user in any guild the bot is in
        for (const guild of client.guilds.cache.values()) {
          try {
            const member = await guild.members.fetch({ user: userId, force: true });
            if (member && member.presence && member.presence.activities?.length > 0) {
              return res.json({ activities: member.presence.activities });
            }
          } catch (err) {
            // User not in this guild or couldn't fetch presence, continue to next guild
          }
        }
      } catch (err) {
        console.log('Could not fetch presence data from guilds:', err.message);
      }
    }

    // If we couldn't get the real presence, return a simulated one
    // This is deterministic based on user ID so it's consistent
    const hasActivity = parseInt(userId.substring(0, 1)) % 3 !== 0; // 2/3 chance of having activity
    
    if (!hasActivity) {
      return res.json({ activities: [] });
    }
    
    const gameOptions = [
      { name: "TimeKill", details: "Killing Time Somewhere", state: "God Knows Where!" },
      { name: "Fun", details: "Maybe Having Fun!", state: "IDK Where!, I'm not a Sychopath!" },
      { name: "Thinking", details: "Might Be Thinking!", state: "Thinking About how he/she was born!" },
      { name: "Fortnite", details: "Battle Royale", state: "Squad mode with friends" },
      { name: "Watching", details: "Might Be Watching My Master!", state: "You Must Be a Pervert To see here!" },
      { name: "Nothing", details: "I Already Said Nothing!", state: "You are Such A Pervert to Even See this!" }
    ];
    
    const gameIndex = parseInt(userId.substring(1, 2)) % gameOptions.length;
    const selectedGame = gameOptions[gameIndex];
    
    // Generate a start time between 5 minutes and 3 hours ago
    const now = new Date();
    const minutesAgo = Math.floor(parseInt(userId.substring(2, 4)) % 180) + 5;
    const startTime = new Date(now.getTime() - (minutesAgo * 60 * 1000));
    
    res.json({
      activities: [
        {
          name: selectedGame.name,
          details: selectedGame.details,
          state: selectedGame.state,
          application_id: "123456789012345678",
          timestamps: {
            start: startTime.toISOString()
          },
          assets: {
            large_image: "game_icon"
          }
        }
      ]
    });

  } catch (err) {
    console.error('Error fetching presence:', err);
    res.status(500).json({ 
      error: 'Failed to fetch user presence',
      details: err.message
    });
  }
});

// API endpoint to get user connections
app.get('/api/connections/:id', async (req, res) => {
  // On Vercel, try to connect the bot on first API request
  if (BOT_TOKEN && isVercel && !botConnected) {
    await connectBot();
  }
  
  const userId = req.params.id;

  try {
    // Validate Discord ID format
    if (!/^\d{17,19}$/.test(userId)) {
      return res.status(400).json({ 
        error: 'Invalid Discord ID format'
      });
    }

    // Note: Discord API doesn't allow bots to fetch user connections
    // This requires OAuth2 with the 'connections' scope, not just a bot token
    // For this example, we'll simulate connections

    const connectionTypes = ["twitch", "youtube", "twitter", "github", "spotify", "reddit", "steam"];
    const numConnections = parseInt(userId.substring(0, 1)) % 5; // 0-4 connections
    
    const connections = [];
    
    for (let i = 0; i < numConnections; i++) {
      const typeIndex = (parseInt(userId.substring(i, i+2)) % connectionTypes.length);
      const connectionType = connectionTypes[typeIndex];
      
      // Only add if this type doesn't already exist
      if (!connections.find(c => c.type === connectionType)) {
        connections.push({
          type: connectionType,
          name: `${connectionType}_user${userId.substring(userId.length - 4)}`
        });
      }
    }
    
    res.json({ connections });

  } catch (err) {
    console.error('Error fetching connections:', err);
    res.status(500).json({ 
      error: 'Failed to fetch user connections',
      details: err.message
    });
  }
});

// API endpoint to get user data (simplified version of profile endpoint)
app.get('/api/user/:id', async (req, res) => {
  const discordId = req.params.id;
  
  try {
    // Validate Discord ID format
    if (!/^\d{17,19}$/.test(discordId)) {
      return res.status(400).json({ 
        error: 'Invalid Discord ID format',
        message: 'Discord IDs are typically 17-19 digits.'
      });
    }
    
    // Check if we have cached user data
    if (userCache.has(discordId)) {
      const cachedData = userCache.get(discordId);
      const now = Date.now();
      // Use cache if it's less than 5 minutes old
      if (cachedData.cachedAt && now - cachedData.cachedAt < 5 * 60 * 1000) {
        return res.json(cachedData);
      }
    }
    
    // Try to get real data if bot is connected
    if (client.isReady()) {
      try {
        const user = await client.users.fetch(discordId, { force: true });
        if (user) {
          const userData = {
            id: discordId,
            username: user.username,
            discriminator: user.discriminator || '0000',
            avatarURL: user.displayAvatarURL({ dynamic: true, size: 256 }),
            bannerURL: user.banner ? `https://cdn.discordapp.com/banners/${discordId}/${user.banner}.${user.banner.startsWith("a_") ? "gif" : "png"}?size=1024` : null,
            status: userPresences.get(discordId)?.status || 'offline',
            about_me: "Discord Won't Let Muzlik Show The Bio, So You are Stuck With Me!",
            created_at: new Date((BigInt(discordId) >> 22n) + 1420070400000n).toISOString(),
            cachedAt: Date.now()
          };
          
          userCache.set(discordId, userData);
          return res.json(userData);
        }
      } catch (error) {
        console.error('Error fetching user from Discord:', error);
        // Fall through to mock data
      }
    }
    
    // For now, return mock data if we couldn't get real data
    const mockUserData = {
      id: discordId,
      username: "DiscordUser" + discordId.substring(0, 4),
      discriminator: Math.floor(Math.random() * 9000) + 1000,
      avatarURL: `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`,
      bannerURL: Math.random() > 0.5 ? `https://picsum.photos/800/300?random=${discordId}` : null,
      status: ["online", "idle", "dnd", "offline"][Math.floor(Math.random() * 4)],
      about_me: "Discord Won't Let Muzlik Show The Bio, So You are Stuck With Me!",
      created_at: new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      cachedAt: Date.now()
    };
    
    // Cache the mock data
    userCache.set(discordId, mockUserData);
    
    // Add a small delay to simulate API call
    setTimeout(() => {
      res.json(mockUserData);
    }, 500);
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Discord profile',
      message: error.message || 'An unknown error occurred'
    });
  }
});

// Clear cache periodically to prevent memory leaks
// Note: On Vercel, this won't persist between function invocations
const cacheCleanupInterval = setInterval(() => {
  const now = Date.now();
  
  // Clear user cache entries older than 30 minutes
  for (const [userId, userData] of userCache.entries()) {
    if (userData.cachedAt && now - userData.cachedAt > 30 * 60 * 1000) {
      userCache.delete(userId);
    }
  }
  
  // Clear presence data older than 15 minutes
  for (const [userId, presenceData] of userPresences.entries()) {
    if (presenceData.updatedAt && now - presenceData.updatedAt > 15 * 60 * 1000) {
      userPresences.delete(userId);
    }
  }
  
  console.log(`Cache cleanup: ${userCache.size} users and ${userPresences.size} presences in memory`);
}, 10 * 60 * 1000); // Run every 10 minutes

// Clear interval on shutdown
if (!isVercel) {
  process.on('SIGINT', () => {
    clearInterval(cacheCleanupInterval);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    clearInterval(cacheCleanupInterval);
    process.exit(0);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start the server if not on Vercel
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Discord bot status: ${BOT_TOKEN ? 'Enabled' : 'Disabled'}`);
    
    if (!BOT_TOKEN) {
      console.warn('\x1b[33m%s\x1b[0m', 'No Discord bot token provided. The application will use simulated data.');
      console.warn('\x1b[33m%s\x1b[0m', 'Set DISCORD_BOT_TOKEN in your .env file to enable real Discord data.');
    }
  });
}

// Export the Express app for Vercel
module.exports = app;
