# Discord Profile Viewer

A web application that allows users to view Discord profiles by ID, including real-time status, activities, connections, and more. This project uses Discord's API through a Discord bot to fetch accurate user information.

![Discord Profile Viewer Screenshot #1](https://i.ibb.co/V0VxJf1B/Screenshot-2025-05-13-173322.png)
![Discord Profile Viewer Screenshot #2](https://github.com/user-attachments/assets/aa7420fa-cabf-430d-94ec-afbf5e8733c7)

## Features

- **Profile Lookup**: View any Discord user's profile by entering their ID
- **Real-time Status**: See a user's online status (online, idle, DND, offline)
- **Current Activity**: Display what game or activity the user is currently doing
- **Profile Details**: View avatars, banners, badges, and account creation date
- **Platform Connections**: See connected accounts (Twitch, YouTube, etc.)
- **Dark/Light Theme**: Toggle between dark and light modes
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Recent Profiles**: Keep track of recently viewed profiles
- **Keyboard Shortcuts**: Power user shortcuts for quick navigation

## Deployment on Vercel

This application is optimized for deployment on Vercel's serverless platform.

### Setup Instructions

1. **Fork or clone this repository**

2. **Create a Discord Bot**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to the "Bot" tab and add a bot
   - Under "Privileged Gateway Intents", enable:
     - Presence Intent
     - Server Members Intent
   - Copy the bot token for the next step

3. **Deploy to Vercel**
   - [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fdiscord-profile-viewer)
   - During deployment, set the following environment variables:

4. **Set Environment Variables**
   ```
   DISCORD_BOT_TOKEN=your-bot-token-here
   DISCORD_CLIENT_ID=your-client-id-here
   DISCORD_CLIENT_SECRET=your-client-secret-here
   DISCORD_CALLBACK_URL=https://your-vercel-app.vercel.app/auth/discord/callback
   SESSION_SECRET=random-secure-string
   ```

5. **Invite Your Bot to Servers**
   - Generate an invite URL in the Discord Developer Portal
   - The bot needs the following permissions:
     - Read Messages/View Channels
     - Read Message History
   - The more servers your bot is in, the more users it can fetch data for

## Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/EmulsionEga/discord-profile-viewer.git
   cd discord-profile-viewer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a .env file**
   Copy the `.env.example` file to `.env` and fill in your Discord bot token and other required variables.
   ```bash
   cp .env.example .env
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

- The server uses Discord.js to connect to Discord's API via a bot
- User profiles, statuses, and activities are fetched in real-time
- The application caches data to minimize API requests
- In serverless environments, the bot connects only when needed
- If the bot token is invalid or missing, the app falls back to simulated data

## Vercel Serverless Considerations

- The application is designed to work within Vercel's serverless constraints
- Memory usage is optimized with automatic cache cleanup
- The Discord.js client is initialized only when needed
- For high-traffic deployments, consider implementing a database for caching

## Keyboard Shortcuts

- `Enter` - Search when input is focused
- `Ctrl+Enter` - Search from anywhere
- `Alt+T` - Toggle dark/light theme
- `Esc` - Close modals or go back
- `R` - Refresh profile data (on profile page)
- `S` - Share profile (on profile page)
- `?` - Show keyboard shortcuts help

## Technologies Used

- **Backend**: Node.js, Express, Discord.js
- **Frontend**: Vanilla JavaScript, CSS with custom properties
- **Deployment**: Vercel serverless functions
- **APIs**: Discord Bot API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application is not affiliated with, endorsed by, or connected to Discord Inc. in any way. "Discord" and the Discord logo are trademarks of Discord Inc.
