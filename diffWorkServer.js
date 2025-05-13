const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session
app.use(session({
  secret: process.env.SESSION_SECRET || 'discord-profile-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Discord OAuth2
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
    scope: ['identify', 'connections', 'email'] // Add any other scopes you need
}, function(accessToken, refreshToken, profile, done) {
    // Store the access token in the profile object
    profile.accessToken = accessToken;
    return done(null, profile);
}));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));


// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create a simple cache for profile data
const profileCache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/?error=login_required');
}

// Middleware for logging requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    user: req.user,
    title: 'Discord Profile Viewer',
    error: req.query.error || null
  });
});

// Auth routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: '/?error=auth_failed' 
  }),
  (req, res) => res.redirect('/profile')
);

app.get('/auth/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Profile route for authenticated users
app.get('/profile', isAuthenticated, (req, res) => {
    try {
      // Calculate the account creation date from the Discord ID
      // Discord IDs contain a timestamp that can be extracted
      const userId = req.user.id;
      
      // Fix: Convert BigInt to string first, then to number
      const binary = BigInt(userId).toString(2);
      const timestamp = parseInt(binary.slice(0, -22), 2);
      const createdTimestamp = new Date(timestamp + 1420070400000);
      
      const createdAt = createdTimestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
  
      res.render('profile', { 
        user: req.user,
        title: 'Your Discord Profile',
        createdAt: createdAt
      });
    } catch (error) {
      console.error('Error rendering profile page:', error);
      res.status(500).render('error', {
        title: 'Profile Error',
        error: 'Failed to load your profile information.',
        stack: process.env.NODE_ENV === 'development' ? error.stack : null
      });
    }
});

// Webhook endpoint to receive Discord data
app.post('/webhook/discord', express.json(), async (req, res) => {
    try {
      // Verify webhook signature if you have a webhook secret
      // This is important for security to ensure the request is from Discord
      
      // Store the webhook data in a session or database
      const webhookData = req.body;
      
      // For demonstration, we'll store it in a global variable
      // In production, use a database or Redis
      global.lastWebhookData = webhookData;
      
      console.log('Received webhook data:', webhookData);
      
      // Acknowledge receipt
      res.status(200).send('Webhook received');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('Webhook processing error');
    }
  });
  
  // Endpoint to view the profile from webhook data
  app.get('/webhook-profile', (req, res) => {
    res.render('webhook-profile', {
      title: 'Discord Profile via Webhook',
      webhookData: global.lastWebhookData || null
    });
});
 
// API route to get user profile
app.get('/api/profile/:id', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'You need to log in with Discord to view real profiles'
            });
        }
        
        const discordId = req.params.id;
        
        // Validate Discord ID format
        if (!/^\d{17,19}$/.test(discordId)) {
            return res.status(400).json({ 
                error: 'Invalid Discord ID format',
                message: 'Discord IDs are typically 17-19 digits.'
            });
        }
        
        // Use the access token from authentication to fetch real data
        const accessToken = req.user.accessToken;
        
        // Fetch user profile from Discord API
        const userResponse = await axios.get(`https://discord.com/api/v10/users/${discordId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        
        // Fetch user connections
        const connectionsResponse = await axios.get('https://discord.com/api/v10/users/@me/connections', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        
        // Format the data
        const userData = {
            id: userResponse.data.id,
            username: userResponse.data.username,
            discriminator: userResponse.data.discriminator,
            avatar: userResponse.data.avatar 
                ? `https://cdn.discordapp.com/avatars/${userResponse.data.id}/${userResponse.data.avatar}.png` 
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(userResponse.data.discriminator) % 5}.png`,
            status: 'online', // Discord API doesn't provide status through REST API
            about_me: userResponse.data.bio || "No about me provided",
            created_at: new Date((BigInt(userResponse.data.id) >> 22n) + 1420070400000n).toISOString(),
            badges: [], // Would need additional API calls to get badges
            connections: connectionsResponse.data.map(conn => ({
                type: conn.type,
                name: conn.name,
                verified: conn.verified
            }))
        };
        
        res.json(userData);
        
    } catch (error) {
        console.error('API Error:', error);
        
        // If the error is from Discord API
        if (error.response && error.response.data) {
            return res.status(error.response.status).json({
                error: 'Discord API Error',
                message: error.response.data.message || 'Failed to fetch data from Discord'
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch Discord profile',
            message: error.message || 'An unknown error occurred'
        });
    }
});

// Function to generate mock user data
function generateMockUserData(discordId) {
  // Generate a deterministic username based on the ID
  const usernameBase = "Discord";
  const discriminator = Math.floor(parseInt(discordId.substring(discordId.length - 4)) % 9000) + 1000;
  
  // Generate a deterministic created date based on the ID
  // Fix: Safely extract timestamp from Discord ID
  let createdDate;
  try {
    // Discord IDs contain a timestamp in the first bits
    const binary = BigInt(discordId).toString(2).padStart(64, '0');
    const timestampBits = binary.slice(0, binary.length - 22);
    // Convert back to decimal and add Discord epoch
    const timestamp = parseInt(timestampBits, 2) + 1420070400000;
    createdDate = new Date(timestamp);
    
    // If date is invalid, use a fallback
    if (isNaN(createdDate.getTime())) {
      throw new Error("Invalid date");
    }
  } catch (error) {
    // Fallback: generate a random date in the past few years
    createdDate = new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000);
  }
  
  // Generate a deterministic avatar
  const avatarIndex = parseInt(discordId.substring(discordId.length - 1)) % 5;
  
  return {
    id: discordId,
    username: usernameBase + discordId.substring(discordId.length - 4),
    discriminator: discriminator.toString(),
    avatar: `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`,
    status: ["online", "idle", "dnd", "offline"][parseInt(discordId.substring(0, 1)) % 4],
    about_me: generateAboutMe(discordId),
    created_at: createdDate.toISOString(),
    badges: generateBadges(discordId),
    connections: generateConnections(discordId)
  };
}

function generateAboutMe(discordId) {
  const aboutMeOptions = [
    "Hello! I'm a Discord user who enjoys gaming and chatting with friends.",
    "Just a casual gamer looking for new friends to play with!",
    "Music lover, gamer, and tech enthusiast.",
    "I stream on Twitch occasionally. Come say hi!",
    "Developer by day, gamer by night.",
    "This is a simulated Discord profile. In a real application, this would show the actual about me section from your Discord profile."
  ];
  
  return aboutMeOptions[parseInt(discordId.substring(0, 2)) % aboutMeOptions.length];
}

function generateBadges(discordId) {
  const allBadges = ["Nitro", "Server Booster", "Early Supporter", "Verified", "Partner", "Staff", "Bug Hunter"];
  const numBadges = parseInt(discordId.substring(0, 1)) % 4; // 0-3 badges
  
  if (numBadges === 0) return [];
  
  const badges = [];
  for (let i = 0; i < numBadges; i++) {
    const badgeIndex = (parseInt(discordId.substring(i, i+2)) % allBadges.length);
    if (!badges.includes(allBadges[badgeIndex])) {
      badges.push(allBadges[badgeIndex]);
    }
  }
  
  return badges;
}

function generateConnections(discordId) {
  const allConnections = [
    { type: "twitch", name: "twitch_user" },
    { type: "youtube", name: "youtube_channel" },
    { type: "twitter", name: "twitter_handle" },
    { type: "github", name: "github_user" },
    { type: "spotify", name: "spotify_user" },
    { type: "reddit", name: "reddit_user" },
    { type: "steam", name: "steam_user" }
  ];
  
  const numConnections = parseInt(discordId.substring(0, 1)) % 4; // 0-3 connections
  
  if (numConnections === 0) return [];
  
  const connections = [];
  for (let i = 0; i < numConnections; i++) {
    const connectionIndex = (parseInt(discordId.substring(i, i+2)) % allConnections.length);
    const connection = { ...allConnections[connectionIndex] };
    
    // Make usernames more unique by adding part of the Discord ID
    connection.name = connection.name + discordId.substring(discordId.length - 4);
    
    if (!connections.find(c => c.type === connection.type)) {
      connections.push(connection);
    }
  }
  
  return connections;
}

// Generate mock data for non-authenticated users
function generateMockUserData(discordId) {
  return {
    id: discordId,
    username: "DiscordUser" + discordId.substring(0, 4),
    discriminator: Math.floor(Math.random() * 9000) + 1000,
    avatar: `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`,
    status: ["online", "idle", "dnd", "offline"][Math.floor(Math.random() * 4)],
    about_me: "This is a simulated Discord profile. In a real application, this would show the actual about me section from your Discord profile.",
    created_at: new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    badges: ["Nitro", "Server Booster", "Early Supporter"],
    connections: [
      { type: "twitch", name: "twitchuser", verified: true },
      { type: "twitter", name: "twitteruser", verified: true },
      { type: "github", name: "githubuser", verified: true }
    ]
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create a basic index.ejs file if it doesn't exist
const viewsDir = path.join(__dirname, 'views');
const indexEjsPath = path.join(viewsDir, 'index.ejs');

if (!fs.existsSync(viewsDir)) {
  fs.mkdirSync(viewsDir, { recursive: true });
}

if (!fs.existsSync(indexEjsPath)) {
  const basicEjs = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="container">
        <h1><%= title %></h1>
        <% if (user) { %>
            <p>Welcome, <%= user.username %></p>
            <a href="/profile">View Profile</a>
            <a href="/auth/logout">Logout</a>
        <% } else { %>
            <p>Please login to view your profile</p>
            <a href="/auth/discord">Login with Discord</a>
        <% } %>
    </div>
    <script src="/script.js"></script>
</body>
</html>`;
  
  fs.writeFileSync(indexEjsPath, basicEjs);
  console.log('Created basic index.ejs template');
}

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).render('error', { 
    title: 'Page Not Found',
    error: 'The page you are looking for does not exist.'
  });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).render('error', { 
    title: 'Server Error',
    error: process.env.NODE_ENV === 'production' ? 
      'An unexpected error occurred.' : 
      err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
