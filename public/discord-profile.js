document.addEventListener('DOMContentLoaded', function() {
    // Debug mode - set to true to enable console logging
    const DEBUG = true;

    // Debug logger
    function debug(...args) {
        if (DEBUG) {
            console.log('[Debug]', ...args);
        }
    }

    // Profile elements
    const profileBanner = document.getElementById('profile-banner');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileUsername = document.getElementById('profile-username');
    const profileTag = document.getElementById('profile-tag');
    const profileBadges = document.getElementById('profile-badges');
    const aboutMeContent = document.getElementById('about-me-content');
    const memberSince = document.getElementById('member-since');
    
    // Status elements
    const statusIndicator = document.getElementById('status-indicator');
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    
    // Presence and connections elements
    const presenceContent = document.getElementById('presence-content');
    const connectionsList = document.getElementById('connections-list');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Refresh button
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Reload the profile
            loadProfile(userId);
            
            // Show a toast notification
            showToast('Refreshing profile...', 'info');
        });
    }

    // Status colors and classes
    const statusClasses = {
        online: 'online',
        idle: 'idle',
        dnd: 'dnd',
        offline: 'offline'
    };
    
    const statusNames = {
        online: 'Online',
        idle: 'Idle',
        dnd: 'Do Not Disturb',
        offline: 'Offline'
    };
    
    // Get Discord user ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    // Initialize the app
    init();
    
    function init() {
        if (!userId) {
            // No user ID provided, redirect to main page
            window.location.href = 'index.html';
            return;
        }
        
        // Verify all required elements exist
        const requiredElements = [
            { name: 'profileBanner', element: profileBanner },
            { name: 'profileAvatar', element: profileAvatar },
            { name: 'profileUsername', element: profileUsername },
            { name: 'profileTag', element: profileTag },
            { name: 'profileBadges', element: profileBadges },
            { name: 'aboutMeContent', element: aboutMeContent },
            { name: 'memberSince', element: memberSince },
            { name: 'loadingOverlay', element: loadingOverlay }
        ];
        
        const missingElements = requiredElements.filter(item => !item.element);
        if (missingElements.length > 0) {
            console.error('Missing required DOM elements:', 
                missingElements.map(item => item.name).join(', '));
            showProfileError('Failed to initialize profile viewer due to missing elements');
            return;
        }
        
        // Load the profile
        loadProfile(userId);
        
        // Start status refresh
        startStatusRefresh(userId);
    }
    
    function loadProfile(userId) {
        // Show loading overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
        
        // Fetch user data
        fetchUserProfile(userId)
            .then(userData => {
                updateProfileUI(userData);
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
            })
            .catch(error => {
                showProfileError(error.message || 'Failed to load profile');
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
            });
            
        fetchDiscordStatus(userId);
        fetchDiscordPresence(userId);
        fetchConnections(userId);
    }
    
    // Function to fetch user profile
    async function fetchUserProfile(userId) {
        try {
            debug(`Fetching profile for user ${userId}`);
            const response = await fetch(`/api/profile/${userId}`);
            
            // Check if response is OK before parsing JSON
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Server error: ${response.status}`);
                } else {
                    throw new Error(`Server error: ${response.status}`);
                }
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server did not return JSON. Check your API endpoint.');
            }
            
            const data = await response.json();
            debug("API response:", data);
            return data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }
    
    // Function to update profile UI
    function updateProfileUI(userData) {
        if (!userData) {
            showProfileError('No user data received');
            return;
        }
        
        // Update banner
        if (profileBanner) {
            if (userData.banner) {
                // Construct the proper Discord CDN URL for the banner
                const bannerURL = `https://cdn.discordapp.com/banners/${userData.id}/${userData.banner}.${userData.banner.startsWith("a_") ? "gif" : "png"}?size=1024`;
                profileBanner.style.backgroundImage = `url('${bannerURL}')`;
                debug("Setting banner image:", bannerURL);
                
                // Add image loading error handling
                const bannerImg = new Image();
                bannerImg.onload = function() {
                    debug("Banner image loaded successfully");
                };
                bannerImg.onerror = function() {
                    console.error("Failed to load banner image:", bannerURL);
                    if (profileBanner) {
                        profileBanner.style.backgroundImage = 'linear-gradient(45deg, #3498db, #8e44ad)';
                    }
                };
                bannerImg.src = bannerURL;
                
            } else if (userData.banner_color) {
                profileBanner.style.backgroundColor = userData.banner_color;
                profileBanner.style.backgroundImage = 'none';
                debug("Setting banner color:", userData.banner_color);
            } else {
                // Default banner if none is provided
                profileBanner.style.backgroundImage = 'linear-gradient(45deg, #3498db, #8e44ad)';
                debug("Setting default banner gradient");
            }
        }
        
        // Update avatar
        if (profileAvatar) {
            profileAvatar.src = userData.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
            profileAvatar.alt = `${userData.username}'s Avatar`;
            profileAvatar.onerror = function() {
                this.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                this.onerror = null;
                debug("Avatar failed to load, using default");
            };
        }
        
        // Update username and tag
        if (profileUsername) {
            profileUsername.textContent = userData.username || 'Unknown User';
            
            // Add status badge back (it gets removed when setting innerHTML)
            if (statusBadge) {
                const statusBadgeHTML = `
                    <span class="status-badge" id="status-badge">
                        <i class="fas fa-circle"></i> <span id="status-text">Loading...</span>
                    </span>
                `;
                profileUsername.insertAdjacentHTML('beforeend', statusBadgeHTML);
            }
        }
        
        // Update profile tag (pronouns or discriminator)
        if (profileTag) {
            profileTag.textContent = userData.pronouns || (userData.discriminator && userData.discriminator !== '0' ? `#${userData.discriminator}` : '');
        }
        
        // Update about me
        if (aboutMeContent) {
            aboutMeContent.textContent = userData.about_me || "Discord Didn't Allowed My Master To See The Bio, So You are Stuck With His Creation!";
        }
        
        // Update member since
        if (memberSince) {
            if (userData.created_at) {
                const createdDate = new Date(userData.created_at);
                const formattedDate = createdDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                const accountAge = calculateAccountAge(createdDate);
                memberSince.innerHTML = `<i class="fas fa-clock"></i> ${formattedDate} (${accountAge})`;
            } else {
                memberSince.innerHTML = '<i class="fas fa-clock"></i> Unknown';
            }
        }
        
        // Update badges
        if (profileBadges) {
            updateBadges(userData.badges || []);
        }
        
        // Update status if available in the user data
        if (userData.status) {
            updateStatusUI(userData.status);
        }
        
        // Update connections if available
        if (userData.connections && userData.connections.length > 0) {
            updateConnectionsUI(userData.connections);
        } else {
            // Hide connections section or show "No connections" message
            const connectionsSection = document.getElementById('connections-section');
            if (connectionsSection) {
                connectionsSection.innerHTML = '<p class="no-data">No connections found</p>';
            }
        }
        
        // Update custom fields if any
        if (userData.custom_fields) {
            updateCustomFields(userData.custom_fields);
        }
        
        // Show the profile content now that everything is loaded
        const profileContent = document.getElementById('profile-content');
        if (profileContent) {
            profileContent.style.display = 'block';
        }
        
        // Add to recent profiles
        addToRecentProfiles(userData);
        
        // Track view in analytics
        if (typeof trackEvent === 'function') {
            trackEvent('profile', 'view', userData.id);
        }

        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    // Function to update badges
    function updateBadges(badges) {
        if (!profileBadges) return;
        
        profileBadges.innerHTML = '';
        
        if (badges.length === 0) {
            const noBadgesElement = document.createElement('div');
            noBadgesElement.className = 'no-badges';
            noBadgesElement.textContent = "DC Don't Want You To See Badges";
            profileBadges.appendChild(noBadgesElement);
            return;
        }
        
        // Badge icon mapping
        const badgeIcons = {
            'nitro': 'fas fa-rocket',
            'server booster': 'fas fa-bolt',
            'early supporter': 'fas fa-star',
            'verified': 'fas fa-check',
            'partner': 'fas fa-handshake',
            'staff': 'fas fa-shield-alt',
            'bug hunter': 'fas fa-bug',
            'hypesquad': 'fas fa-home',
            'hypesquad bravery': 'fas fa-shield-alt',
            'hypesquad brilliance': 'fas fa-sun',
            'hypesquad balance': 'fas fa-balance-scale',
            'early verified bot developer': 'fas fa-code',
            'discord certified moderator': 'fas fa-gavel',
            'default': 'fas fa-award'
        };
        
        badges.forEach(badge => {
            const badgeElement = document.createElement('div');
            badgeElement.className = 'badge';
            badgeElement.title = badge;
            
            // Get the appropriate icon
            const iconClass = badgeIcons[badge.toLowerCase()] || badgeIcons.default;
            
            badgeElement.innerHTML = `<i class="${iconClass}"></i>`;
            badgeElement.classList.add('float'); // Add floating animation
            profileBadges.appendChild(badgeElement);
        });
    }
    
    // Function to show profile error
    function showProfileError(message) {
        console.error('Profile error:', message);
        
        // Create error container if it doesn't exist
        let errorContainer = document.getElementById('error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'error-message';
            
            const mainContent = document.querySelector('main') || document.body;
            mainContent.prepend(errorContainer);
        }
        
        errorContainer.innerHTML = `
            <div class="error-icon"><i class="fas fa-exclamation-circle"></i></div>
            <h2>Error Loading Profile</h2>
            <p>${message}</p>
            <button id="retry-button" class="retry-button">Try Again</button>
        `;
        
        errorContainer.style.display = 'flex';
        
        // Add retry button functionality
        const retryButton = document.getElementById('retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', function() {
                window.location.reload();
            });
        }
        
        // Update UI elements with error state
        if (profileUsername) profileUsername.textContent = 'Error Loading Profile';
        if (profileTag) profileTag.textContent = '';
        if (aboutMeContent) aboutMeContent.innerHTML = `<div class="error-message">${message}</div>`;
        if (memberSince) memberSince.innerHTML = '';
        if (profileBadges) profileBadges.innerHTML = '';
        if (profileBanner) profileBanner.style.backgroundImage = 'linear-gradient(45deg, #e74c3c, #c0392b)';
        if (profileAvatar) profileAvatar.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
        
        // Hide loading overlay if it's still showing
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // Show toast with error message
        showToast(`Error: ${message}`);
    }
    
    // Function to calculate account age
    function calculateAccountAge(createdDate) {
        const now = new Date();
        const diffYears = now.getFullYear() - createdDate.getFullYear();
        const diffMonths = now.getMonth() - createdDate.getMonth();
        
        if (diffYears > 0) {
            return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
        } else if (diffMonths > 0) {
            return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
        } else {
            const diffDays = now.getDate() - createdDate.getDate();
            return diffDays <= 1 ? 'today' : `${diffDays} days ago`;
        }
    }
    
    // Function to update status in the UI
    function updateStatusUI(status) {
        // Get the status badge element again (it might have been recreated)
        const statusBadge = document.getElementById('status-badge');
        const statusText = document.getElementById('status-text');
        
        if (!statusBadge || !statusText || !statusIndicator) {
            debug('Status elements not found in the DOM');
            return;
        }
        
        // Remove all status classes
        Object.values(statusClasses).forEach(cls => {
            statusIndicator.classList.remove(cls);
            statusBadge.classList.remove(cls);
        });
        
        // Add the current status class
        const statusClass = statusClasses[status] || statusClasses.offline;
        statusIndicator.classList.add(statusClass);
        statusBadge.classList.add(statusClass);
        
        // Update status text
        statusText.textContent = statusNames[status] || 'Offline';
        
        debug("Status updated:", status);
    }
    
    // Function to fetch Discord status
    async function fetchDiscordStatus(userId) {
        try {
            debug(`Fetching status for user ${userId}`);
            const response = await fetch(`/api/status/${userId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch status: ${response.status}`);
            }
            
            const data = await response.json();
            debug("Received status data:", data);
            
            if (data && data.status) {
                debug(`Updating UI with status: ${data.status}`);
                updateStatusUI(data.status);
            } else {
                debug('Status data missing or invalid');
                updateStatusUI('offline');
            }
        } catch (error) {
            console.error('Error fetching Discord status:', error);
            // Don't show an error to the user, just default to offline
            updateStatusUI('offline');
        }
    }
    
    // Function to start periodic status refresh
    function startStatusRefresh(userId) {
        // Initial fetch
        fetchDiscordStatus(userId);
        
        // Then refresh every 30 seconds
        const statusInterval = setInterval(() => {
            fetchDiscordStatus(userId);
        }, 30000);
        
        // Store the interval ID so we can clear it if needed
        window.statusRefreshInterval = statusInterval;
        
        // Clear the interval when the page is unloaded
        window.addEventListener('beforeunload', () => {
            if (window.statusRefreshInterval) {
                clearInterval(window.statusRefreshInterval);
            }
        });
    }
    
    // Function to fetch Discord presence (activity/game)
    async function fetchDiscordPresence(userId) {
        try {
            const response = await fetch(`/api/presence/${userId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch presence: ${response.status}`);
            }
            
            const data = await response.json();
            debug("Presence updated:", data);
            
            if (data && data.activities && data.activities.length > 0) {
                updatePresenceUI(data.activities);
            } else {
                hidePresenceUI();
            }
        } catch (error) {
            console.error('Error fetching Discord presence:', error);
            hidePresenceUI();
        }
    }
    
    // Function to update presence UI
    function updatePresenceUI(activities) {
        if (!presenceContent) return;
        
        // Clear previous content
        presenceContent.innerHTML = '';
        
        // Filter out invisible activities
        const visibleActivities = activities.filter(activity => 
            activity.name && activity.name !== 'Custom Status'
        );
        
        if (visibleActivities.length === 0) {
            hidePresenceUI();
            return;
        }
        
        // Show the presence section
        const presenceSection = document.getElementById('presence-section');
        if (presenceSection) {
            presenceSection.style.display = 'block';
        }
        
        // Create activity elements
        visibleActivities.forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';
            
            // Get activity icon
            let activityIcon = '';
            if (activity.application_id && activity.assets && activity.assets.large_image) {
                const iconUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`;
                activityIcon = `
                    <div class="activity-icon-container">
                        <img src="${iconUrl}" alt="${activity.name}" class="activity-icon" 
                            onerror="this.onerror=null; this.src='/images/default-game-icon.png';">
                    </div>
                `;
            } else {
                activityIcon = `
                    <div class="activity-icon-container">
                        <div class="activity-icon default"><i class="fas fa-gamepad"></i></div>
                    </div>
                `;
            }
            
            // Format timestamps if available
            let timeInfo = '';
            if (activity.timestamps) {
                if (activity.timestamps.start) {
                    const startTime = new Date(activity.timestamps.start);
                    const now = new Date();
                    const elapsedMs = now - startTime;
                    const elapsedMinutes = Math.floor(elapsedMs / 60000);
                    timeInfo = `${elapsedMinutes} minutes elapsed`;
                }
            }
            
            // Format details and state
            const details = activity.details ? `<div class="activity-details">${activity.details}</div>` : '';
            const state = activity.state ? `<div class="activity-state">${activity.state}</div>` : '';
            
            activityElement.innerHTML = `
                <div class="activity-header">
                    ${activityIcon}
                    <div class="activity-info">
                        <div class="activity-name">${activity.name}</div>
                        ${details}
                        ${state}
                        ${timeInfo ? `<div class="activity-time">${timeInfo}</div>` : ''}
                    </div>
                </div>
            `;
            
            presenceContent.appendChild(activityElement);
        });
    }
    
    // Function to hide presence UI
    function hidePresenceUI() {
        const presenceSection = document.getElementById('presence-section');
        if (presenceSection) {
            presenceSection.style.display = 'none';
        }
    }
    
    // Function to fetch connections
    async function fetchConnections(userId) {
        try {
            const response = await fetch(`/api/connections/${userId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch connections: ${response.status}`);
            }
            
            const data = await response.json();
            debug("Connections updated:", data);
            
            if (data && data.connections && data.connections.length > 0) {
                updateConnectionsUI(data.connections);
            } else {
                hideConnectionsUI();
            }
        } catch (error) {
            console.error('Error fetching connections:', error);
            hideConnectionsUI();
        }
    }
    
    // Function to update connections UI
    function updateConnectionsUI(connections) {
        if (!connectionsList) return;
        
        // Clear previous content
        connectionsList.innerHTML = '';
        
        if (!connections || connections.length === 0) {
            hideConnectionsUI();
            return;
        }
        
        // Show the connections section
        const connectionsSection = document.getElementById('connections');
        if (connectionsSection) {
            connectionsSection.style.display = 'block';
        }
        
        // Hide loading and show the list
        const loadingConnections = document.getElementById('loading-connections');
        if (loadingConnections) {
            loadingConnections.style.display = 'none';
        }
        
        if (connectionsList) {
            connectionsList.style.display = 'flex';
        }
        
        // Connection icon mapping
        const connectionIcons = {
            'twitch': 'fab fa-twitch',
            'youtube': 'fab fa-youtube',
            'twitter': 'fab fa-twitter',
            'github': 'fab fa-github',
            'spotify': 'fab fa-spotify',
            'reddit': 'fab fa-reddit',
            'steam': 'fab fa-steam',
            'xbox': 'fab fa-xbox',
            'playstation': 'fab fa-playstation',
            'battlenet': 'fas fa-gamepad',
            'epic': 'fas fa-gamepad',
            'facebook': 'fab fa-facebook',
            'instagram': 'fab fa-instagram',
            'default': 'fas fa-link'
        };
        
        // Create connection elements
        connections.forEach(connection => {
            const connectionElement = document.createElement('div');
            connectionElement.className = 'connection-item';
            
            // Get connection icon
            const iconClass = connectionIcons[connection.type.toLowerCase()] || connectionIcons.default;
            
            connectionElement.innerHTML = `
                <div class="connection-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="connection-info">
                    <div class="connection-name">${connection.name}</div>
                    <div class="connection-type">${connection.type.charAt(0).toUpperCase() + connection.type.slice(1)}</div>
                </div>
            `;
            
            connectionsList.appendChild(connectionElement);
        });
    }
    
    // Function to hide connections UI
    function hideConnectionsUI() {
        const loadingConnections = document.getElementById('loading-connections');
        if (loadingConnections) {
            loadingConnections.style.display = 'none';
        }
        
        const noConnections = document.getElementById('no-connections');
        if (noConnections) {
            noConnections.style.display = 'flex';
        }
        
        if (connectionsList) {
            connectionsList.style.display = 'none';
        }
    }
    
    // Function to update custom fields
    function updateCustomFields(customFields) {
        const customFieldsContainer = document.getElementById('custom-fields');
        if (!customFieldsContainer) return;
        
        customFieldsContainer.innerHTML = '';
        
        if (!customFields || Object.keys(customFields).length === 0) {
            customFieldsContainer.style.display = 'none';
            return;
        }
        
        customFieldsContainer.style.display = 'block';
        
        // Create field elements
        Object.entries(customFields).forEach(([key, value]) => {
            const fieldElement = document.createElement('div');
            fieldElement.className = 'custom-field';
            
            fieldElement.innerHTML = `
                <div class="field-name">${key}</div>
                <div class="field-value">${value}</div>
            `;
            
            customFieldsContainer.appendChild(fieldElement);
        });
    }
    
    // Function to add to recent profiles
    function addToRecentProfiles(userData) {
        if (!userData || !userData.id) return;
        
        // Get existing profiles from localStorage
        let recentProfiles = JSON.parse(localStorage.getItem('recentProfiles') || '[]');
        
        // Check if this profile is already in the list
        const existingIndex = recentProfiles.findIndex(profile => profile.id === userData.id);
        if (existingIndex !== -1) {
            // Remove it so we can add it to the front
            recentProfiles.splice(existingIndex, 1);
        }
        
        // Add the new profile to the front
        recentProfiles.unshift({
            id: userData.id,
            username: userData.username,
            avatar: userData.avatar,
            timestamp: new Date().toISOString()
        });
        
        // Keep only the 5 most recent profiles
        recentProfiles = recentProfiles.slice(0, 5);
        
        // Save back to localStorage
        localStorage.setItem('recentProfiles', JSON.stringify(recentProfiles));
    }
    
    // Function to show toast notification
    function showToast(message, type = 'error') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Set icon based on type
        let icon = 'info-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'success') icon = 'check-circle';
        
        toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
    
    // Function to track events (analytics)
    function trackEvent(category, action, label) {
        if (window.gtag) {
            gtag('event', action, {
                'event_category': category,
                'event_label': label
            });
        }
        
        // For debugging
        debug(`Event tracked: ${category} - ${action} - ${label}`);
    }
    
    // Add event listeners for UI interactions
    
    // Back button
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/';
        });
    }
    
    // Add friend button
    const addFriendButton = document.getElementById('add-friend-button');
    if (addFriendButton) {
        addFriendButton.addEventListener('click', function() {
            // Copy user ID to clipboard for adding friend
            const userTag = document.getElementById('profile-username').textContent;
            const userDiscriminator = document.getElementById('profile-tag').textContent;
            
            const textToCopy = userDiscriminator ? `${userTag}${userDiscriminator}` : userTag;
            
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    showToast(`Copied ${textToCopy} to clipboard!`, 'success');
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    showToast('Failed to copy username to clipboard', 'error');
                });
        });
    }
    
    // Message button
    const messageButton = document.getElementById('message-button');
    if (messageButton) {
        messageButton.addEventListener('click', function() {
            showToast('This feature is not available in the demo', 'info');
        });
    }
    
    // Block button
    const blockButton = document.getElementById('block-button');
    if (blockButton) {
        blockButton.addEventListener('click', function() {
            showToast('This feature is not available in the demo', 'info');
        });
    }
    
    // More options button
    const moreOptionsButton = document.getElementById('more-options-button');
    if (moreOptionsButton) {
        moreOptionsButton.addEventListener('click', function() {
            showToast('More options not available in the demo', 'info');
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Check saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('light-theme');
            
            if (document.body.classList.contains('light-theme')) {
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            } else {
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        });
    }
    
    // Share button
    const shareButton = document.getElementById('share-button');
    const shareModal = document.getElementById('share-modal');
    const closeShareModal = document.getElementById('close-share-modal');
    const shareUrl = document.getElementById('share-url');
    const copyUrlBtn = document.getElementById('copy-url-btn');
    
    if (shareButton && shareModal) {
        shareButton.addEventListener('click', function() {
            // Set the URL to share
            if (shareUrl) {
                shareUrl.value = window.location.href;
            }
            
            // Show the modal
            shareModal.style.display = 'flex';
        });
    }
    
    if (closeShareModal && shareModal) {
        closeShareModal.addEventListener('click', function() {
            shareModal.style.display = 'none';
        });
    }
    
    if (copyUrlBtn && shareUrl) {
        copyUrlBtn.addEventListener('click', function() {
            shareUrl.select();
            document.execCommand('copy');
            
            // Show success toast
            showToast('URL copied to clipboard!', 'success');
        });
    }
    
    // Social share buttons
    const twitterShareBtn = document.querySelector('.share-btn.twitter');
    const facebookShareBtn = document.querySelector('.share-btn.facebook');
    const redditShareBtn = document.querySelector('.share-btn.reddit');
    
    if (twitterShareBtn) {
        twitterShareBtn.addEventListener('click', function() {
            const text = `Check out this Discord profile!`;
            const url = window.location.href;
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        });
    }
    
    if (facebookShareBtn) {
        facebookShareBtn.addEventListener('click', function() {
            const url = window.location.href;
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        });
    }
    
    if (redditShareBtn) {
        redditShareBtn.addEventListener('click', function() {
            const title = `Discord Profile Viewer`;
            const url = window.location.href;
            window.open(`https://www.reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
        });
    }
    
    // Privacy and Terms links
    const privacyLink = document.getElementById('privacy-link');
    const termsLink = document.getElementById('terms-link');
    const privacyModal = document.getElementById('privacy-modal');
    const termsModal = document.getElementById('terms-modal');
    const closePrivacyModal = document.getElementById('close-privacy-modal');
    const closeTermsModal = document.getElementById('close-terms-modal');
    
    if (privacyLink && privacyModal) {
        privacyLink.addEventListener('click', function(e) {
            e.preventDefault();
            privacyModal.style.display = 'flex';
        });
    }
    
    if (termsLink && termsModal) {
        termsLink.addEventListener('click', function(e) {
            e.preventDefault();
            termsModal.style.display = 'flex';
        });
    }
    
    if (closePrivacyModal && privacyModal) {
        closePrivacyModal.addEventListener('click', function() {
            privacyModal.style.display = 'none';
        });
    }
    
    if (closeTermsModal && termsModal) {
        closeTermsModal.addEventListener('click', function() {
            termsModal.style.display = 'none';
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (privacyModal && e.target === privacyModal) {
            privacyModal.style.display = 'none';
        }
        if (termsModal && e.target === termsModal) {
            termsModal.style.display = 'none';
        }
        if (shareModal && e.target === shareModal) {
            shareModal.style.display = 'none';
        }
    });
    
    // Back to top button
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        // Show/hide back to top button based on scroll position
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        
        // Scroll to top when button is clicked
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // User note functionality
    const userNote = document.getElementById('user-note');
    if (userNote) {
        // Load saved note
        const savedNote = localStorage.getItem(`note_${userId}`);
        if (savedNote) {
            userNote.value = savedNote;
        }
        
        // Save note when it changes
        userNote.addEventListener('input', function() {
            localStorage.setItem(`note_${userId}`, userNote.value);
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape to close modals
        if (e.key === 'Escape') {
            if (privacyModal) privacyModal.style.display = 'none';
            if (termsModal) termsModal.style.display = 'none';
            if (shareModal) shareModal.style.display = 'none';
            
            const keyboardShortcutsHelp = document.getElementById('keyboard-shortcuts-help');
            if (keyboardShortcutsHelp) {
                keyboardShortcutsHelp.style.display = 'none';
            }
        }
        
        // R to refresh profile
        if (e.key === 'r' && !e.ctrlKey && !e.metaKey && 
            !(document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            if (refreshButton) {
                refreshButton.click();
            }
        }
        
        // S to share profile
        if (e.key === 's' && !e.ctrlKey && !e.metaKey && 
            !(document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            if (shareButton) {
                shareButton.click();
            }
        }
        
        // T to toggle theme
        if (e.key === 't' && !e.ctrlKey && !e.metaKey && 
            !(document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            if (themeToggle) {
                themeToggle.click();
            }
        }
        
        // ? to show keyboard shortcuts help
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
            const keyboardShortcutsHelp = document.getElementById('keyboard-shortcuts-help');
            if (keyboardShortcutsHelp) {
                keyboardShortcutsHelp.style.display = keyboardShortcutsHelp.style.display === 'flex' ? 'none' : 'flex';
            }
        }
    });
    
    // Close keyboard shortcuts help
    const closeShortcuts = document.getElementById('close-shortcuts');
    if (closeShortcuts) {
        closeShortcuts.addEventListener('click', function() {
            const keyboardShortcutsHelp = document.getElementById('keyboard-shortcuts-help');
            if (keyboardShortcutsHelp) {
                keyboardShortcutsHelp.style.display = 'none';
            }
        });
    }
    
    // Handle errors gracefully
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.message);
        showToast('An error occurred. Please try refreshing the page.', 'error');
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
        showToast('An error occurred. Please try refreshing the page.', 'error');
    });
});
