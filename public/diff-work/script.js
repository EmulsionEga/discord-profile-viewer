document.addEventListener('DOMContentLoaded', function() {
    const discordIdInput = document.getElementById('discord-id-input');
    const loadProfileBtn = document.getElementById('load-profile-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const profileData = document.getElementById('profile-data');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const retryBtn = document.getElementById('retry-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const discordAuthBtn = document.getElementById('discord-auth-btn');
    
    // Elements for profile data
    const userAvatar = document.getElementById('user-avatar');
    const statusIndicator = document.getElementById('status-indicator');
    const username = document.getElementById('username');
    const userId = document.getElementById('user-id');
    const badges = document.getElementById('badges');
    const aboutMeText = document.getElementById('about-me-text');
    const memberSinceDate = document.getElementById('member-since-date');
    const connectionsList = document.getElementById('connections-list');
    
    // Initialize tooltips
    initTooltips();
    
    // Initialize theme
    initTheme();
    
    // Check if we have a saved Discord ID
    const savedId = localStorage.getItem('discordId');
    if (savedId) {
        discordIdInput.value = savedId;
    }
    
    // Load profile when button is clicked
    loadProfileBtn.addEventListener('click', loadProfile);
    
    // Load profile when Enter key is pressed in the input field
    discordIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loadProfile();
        }
    });
    
    // Retry button click handler
    if (retryBtn) {
        retryBtn.addEventListener('click', loadProfile);
    }
    
    // Theme toggle click handler
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Discord auth button handler
    if (discordAuthBtn) {
        discordAuthBtn.addEventListener('click', function() {
            window.location.href = '/auth/discord';
        });
    }
    
    // Copy user ID when clicked
    if (userId) {
        userId.addEventListener('click', function() {
            const idText = userId.textContent.replace('ID: ', '').trim();
            copyToClipboard(idText);
            showTooltip(userId, 'Copied to clipboard!');
        });
    }
    
    // Main function to load profile
    function loadProfile() {
        const discordId = discordIdInput.value.trim();
        
        if (!discordId) {
            showError('Please enter a Discord ID');
            return;
        }
        
        // Validate Discord ID format
        if (!/^\d{17,19}$/.test(discordId)) {
            showError('Invalid Discord ID format. IDs are typically 17-19 digits.');
            return;
        }
        
        // Save the ID for future use
        localStorage.setItem('discordId', discordId);
        
        // Show loading spinner
        loadingSpinner.style.display = 'flex';
        profileData.style.display = 'none';
        errorMessage.style.display = 'none';
        
        // Add loading animation to button
        loadProfileBtn.disabled = true;
        loadProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        
        // Fetch profile data
        fetchProfileData(discordId);
    }
    
    function fetchProfileData(discordId) {
        // Show loading state
        loadingSpinner.style.display = 'flex';
        profileData.style.display = 'none';
        errorMessage.style.display = 'none';
        
        // Make API request to your backend
        fetch(`/api/profile/${discordId}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        // If authentication is required, prompt user to login
                        if (response.status === 401) {
                            throw new Error('Authentication required. Please login with Discord to view real profiles.');
                        }
                        throw new Error(err.message || 'Failed to fetch profile data');
                    });
                }
                return response.json();
            })
            .then(userData => {
                if (!userData || !userData.id) {
                    throw new Error('Invalid profile data received');
                }
                displayProfile(userData);
                addToRecentProfiles(userData);
            })
            .catch(error => {
                console.error('Error fetching profile:', error);
                
                // If authentication is required, show login button
                if (error.message.includes('Authentication required')) {
                    showAuthError(error.message);
                } else {
                    showError('Could not load profile. ' + error.message);
                }
            })
            .finally(() => {
                resetLoadButton();
            });
    }
    
    function displayProfile(userData) {
        // Hide loading spinner
        loadingSpinner.style.display = 'none';
        
        // Set user data
        // Handle avatar - Discord API returns avatar hash, not full URL
        if (userData.avatar) {
            // For real Discord data
            userAvatar.src = userData.avatar;
        } else {
            // Fallback for missing avatar
            const defaultAvatarIndex = parseInt(userData.discriminator || '0') % 5;
            userAvatar.src = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        }
        
        userAvatar.alt = `${userData.username}'s Avatar`;
        
        // Set username with discriminator if available
        if (userData.discriminator && userData.discriminator !== '0') {
            username.textContent = `${userData.username}#${userData.discriminator}`;
        } else {
            // Discord is phasing out discriminators, so handle usernames without them
            username.textContent = userData.username;
        }
        
        userId.textContent = `ID: ${userData.id}`;
        
        // Handle about me / bio
        aboutMeText.textContent = userData.about_me || userData.bio || "No about me provided";
        
        // Format and display creation date
        let createdDate;
        if (userData.created_at) {
            createdDate = new Date(userData.created_at);
        } else if (userData.id) {
            // Calculate creation date from ID if not provided
            // Discord IDs contain a timestamp
            try {
                const binary = BigInt(userData.id).toString(2).padStart(64, '0');
                const timestampBits = binary.slice(0, binary.length - 22);
                const timestamp = parseInt(timestampBits, 2) + 1420070400000; // Discord epoch
                createdDate = new Date(timestamp);
            } catch (e) {
                console.error('Error calculating creation date:', e);
                createdDate = new Date();
            }
        } else {
            createdDate = new Date();
        }
        
        const formattedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Calculate account age
        const accountAge = calculateAccountAge(createdDate);
        memberSinceDate.textContent = `${formattedDate} (${accountAge})`;
        
        // Set status indicator color - Discord REST API doesn't provide status
        // so we'll use a default or what's provided
        const statusColors = {
            online: 'var(--discord-green)',
            idle: 'var(--discord-yellow)',
            dnd: 'var(--discord-red)',
            offline: 'var(--discord-secondary-text)'
        };
        
        const status = userData.status || 'offline';
        statusIndicator.style.backgroundColor = statusColors[status] || statusColors.offline;
        statusIndicator.title = `Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        
        // Display badges - Discord API doesn't directly provide badges
        // so we'll use what's provided or show none
        badges.innerHTML = '';
        if (userData.badges && userData.badges.length > 0) {
            userData.badges.forEach(badge => {
                const badgeElement = document.createElement('div');
                badgeElement.className = 'badge';
                badgeElement.title = badge;
                
                // Set badge icon based on type
                let badgeIcon = '';
                switch(badge.toLowerCase()) {
                    case 'nitro':
                    case 'premium':
                        badgeIcon = '<i class="fas fa-rocket"></i>';
                        break;
                    case 'server booster':
                    case 'boost':
                        badgeIcon = '<i class="fas fa-bolt"></i>';
                        break;
                    case 'early supporter':
                        badgeIcon = '<i class="fas fa-star"></i>';
                        break;
                    case 'verified':
                        badgeIcon = '<i class="fas fa-check"></i>';
                        break;
                    case 'partner':
                        badgeIcon = '<i class="fas fa-handshake"></i>';
                        break;
                    case 'staff':
                        badgeIcon = '<i class="fas fa-shield-alt"></i>';
                        break;
                    case 'bug hunter':
                        badgeIcon = '<i class="fas fa-bug"></i>';
                        break;
                    default:
                        badgeIcon = '<i class="fas fa-award"></i>';
                }
                
                badgeElement.innerHTML = badgeIcon;
                badges.appendChild(badgeElement);
            });
        } else {
            const noBadgesText = document.createElement('p');
            noBadgesText.textContent = 'No badges';
            noBadgesText.style.color = 'var(--discord-secondary-text)';
            badges.appendChild(noBadgesText);
        }
        
        // Display connections
        connectionsList.innerHTML = '';
        if (userData.connections && userData.connections.length > 0) {
            userData.connections.forEach(connection => {
                const connectionElement = document.createElement('div');
                connectionElement.className = 'connection';
                
                // Set connection icon based on type
                let connectionIcon = '';
                switch(connection.type.toLowerCase()) {
                    case 'twitch':
                        connectionIcon = '<i class="fab fa-twitch"></i>';
                        break;
                    case 'youtube':
                        connectionIcon = '<i class="fab fa-youtube"></i>';
                        break;
                    case 'twitter':
                        connectionIcon = '<i class="fab fa-twitter"></i>';
                        break;
                    case 'github':
                        connectionIcon = '<i class="fab fa-github"></i>';
                        break;
                    case 'spotify':
                        connectionIcon = '<i class="fab fa-spotify"></i>';
                        break;
                    case 'reddit':
                        connectionIcon = '<i class="fab fa-reddit"></i>';
                        break;
                    case 'steam':
                        connectionIcon = '<i class="fab fa-steam"></i>';
                        break;
                    case 'xbox':
                        connectionIcon = '<i class="fab fa-xbox"></i>';
                        break;
                    case 'playstation':
                        connectionIcon = '<i class="fab fa-playstation"></i>';
                        break;
                    case 'facebook':
                        connectionIcon = '<i class="fab fa-facebook"></i>';
                        break;
                    case 'instagram':
                        connectionIcon = '<i class="fab fa-instagram"></i>';
                        break;
                    default:
                        connectionIcon = '<i class="fas fa-link"></i>';
                }
                
                // Add verified badge if connection is verified
                const verifiedBadge = connection.verified 
                    ? '<span class="verified-badge" title="Verified"><i class="fas fa-check-circle"></i></span>' 
                    : '';
                
                connectionElement.innerHTML = `
                    ${connectionIcon}
                    <span>${connection.name}</span>
                    ${verifiedBadge}
                `;
                
                // Add animation delay for staggered appearance
                connectionElement.style.animationDelay = `${connectionsList.children.length * 0.1}s`;
                connectionElement.classList.add('fade-in');
                
                connectionsList.appendChild(connectionElement);
            });
        } else {
            const noConnectionsText = document.createElement('p');
            noConnectionsText.textContent = 'No connections';
            noConnectionsText.style.color = 'var(--discord-secondary-text)';
            connectionsList.appendChild(noConnectionsText);
        }
        
        // Show profile data with animation
        profileData.style.display = 'flex';
        profileData.classList.add('fade-in');
        
        // Add animation to avatar
        userAvatar.classList.add('pulse');
        setTimeout(() => {
            userAvatar.classList.remove('pulse');
        }, 2000);
    }
    
    function showError(message) {
        loadingSpinner.style.display = 'none';
        profileData.style.display = 'none';
        errorMessage.style.display = 'block';
        errorText.textContent = message;
        resetLoadButton();
    }
    
    function showAuthError(message) {
        loadingSpinner.style.display = 'none';
        profileData.style.display = 'none';
        errorMessage.style.display = 'block';
        errorText.textContent = message;
        
        // Add login button to error message
        const loginBtn = document.createElement('button');
        loginBtn.className = 'retry-btn';
        loginBtn.innerHTML = '<i class="fab fa-discord"></i> Login with Discord';
        loginBtn.addEventListener('click', function() {
            window.location.href = '/auth/discord';
        });
        
        // Replace retry button with login button
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn && retryBtn.parentNode) {
            retryBtn.parentNode.replaceChild(loginBtn, retryBtn);
        }
        
        resetLoadButton();
    }
    
    function resetLoadButton() {
        loadProfileBtn.disabled = false;
        loadProfileBtn.innerHTML = '<i class="fas fa-search"></i> Load Profile';
    }
    
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
    
    function addToRecentProfiles(userData) {
        // Get existing recent profiles from localStorage
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
        
        // Update the UI
        displayRecentProfiles();
    }
    
    function displayRecentProfiles() {
        const recentProfilesList = document.getElementById('recent-profiles-list');
        if (!recentProfilesList) return;
        
        // Get profiles from localStorage
        const recentProfiles = JSON.parse(localStorage.getItem('recentProfiles') || '[]');
        
        // Clear the list
        recentProfilesList.innerHTML = '';
        
        if (recentProfiles.length === 0) {
            recentProfilesList.innerHTML = '<p class="empty-state">No recently viewed profiles</p>';
            return;
        }
        
        // Add each profile to the list
        recentProfiles.forEach(profile => {
            const profileItem = document.createElement('div');
            profileItem.className = 'recent-profile-item';
            profileItem.dataset.id = profile.id;
            profileItem.innerHTML = `
                <img class="recent-profile-avatar" src="${profile.avatar}" alt="${profile.username}'s avatar">
                <span class="recent-profile-name">${profile.username}</span>
            `;
            
            // Add click handler to load this profile
            profileItem.addEventListener('click', function() {
                discordIdInput.value = profile.id;
                loadProfile();
            });
            
            recentProfilesList.appendChild(profileItem);
        });
    }

    function copyToClipboard(text) {
        // Create a temporary input element
        const input = document.createElement('input');
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        input.value = text;
        document.body.appendChild(input);
        
        // Select and copy the text
        input.select();
        document.execCommand('copy');
        
        // Remove the temporary input
        document.body.removeChild(input);
        
        // Alternative method using Clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).catch(err => {
                console.error('Could not copy text: ', err);
            });
        }
    }
    
    function showTooltip(element, message) {
        // Remove any existing tooltips
        const existingTooltip = document.querySelector('.tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = message;
        
        // Add tooltip to element
        element.appendChild(tooltip);
        
        // Remove tooltip after 2 seconds
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 2000);
    }
    
    function initTooltips() {
        // Add tooltips to interactive elements
        const interactiveElements = document.querySelectorAll('[title]');
        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', function() {
                const title = this.getAttribute('title');
                if (title) {
                    this.setAttribute('data-title', title);
                    this.removeAttribute('title');
                    showTooltip(this, title);
                }
            });
            
            element.addEventListener('mouseleave', function() {
                const dataTitle = this.getAttribute('data-title');
                if (dataTitle) {
                    this.setAttribute('title', dataTitle);
                    this.removeAttribute('data-title');
                    
                    const tooltip = this.querySelector('.tooltip');
                    if (tooltip) {
                        tooltip.remove();
                    }
                }
            });
        });
    }
    
    function initTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('discord-theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            if (themeToggle) {
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }
    }
    
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        
        if (document.body.classList.contains('light-theme')) {
            localStorage.setItem('discord-theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            localStorage.setItem('discord-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter to load profile
        if (e.ctrlKey && e.key === 'Enter') {
            loadProfile();
        }
        
        // Escape to clear input
        if (e.key === 'Escape' && document.activeElement === discordIdInput) {
            discordIdInput.value = '';
            discordIdInput.focus();
        }
        
        // Alt+T to toggle theme
        if (e.altKey && e.key === 't') {
            toggleTheme();
        }
    });
    
    // Add analytics tracking (simulated)
    function trackEvent(category, action, label) {
        console.log(`Analytics: ${category} - ${action} - ${label}`);
        // In a real app, you would send this to your analytics service
    }
    
    // Track page load
    trackEvent('Page', 'Load', 'Discord Profile Viewer');
    
    // Track profile loads
    loadProfileBtn.addEventListener('click', function() {
        trackEvent('Profile', 'Load', discordIdInput.value);
    });
    
    // Add image error handling
    userAvatar.addEventListener('error', function() {
        this.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
        this.alt = 'Default Avatar';
        console.warn('Failed to load user avatar, using default');
    });
    
    // If we have a saved ID, load the profile automatically
    if (savedId) {
        loadProfileBtn.click();
    }
    
    // Add fade-in animation to the page
    document.body.classList.add('fade-in');
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize back to top button
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        // Show/hide button based on scroll position
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        
        // Scroll to top when clicked
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Initialize modals
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
    
    if (closePrivacyModal) {
        closePrivacyModal.addEventListener('click', function() {
            privacyModal.style.display = 'none';
        });
    }
    
    if (closeTermsModal) {
        closeTermsModal.addEventListener('click', function() {
            termsModal.style.display = 'none';
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === privacyModal) {
            privacyModal.style.display = 'none';
        }
        if (e.target === termsModal) {
            termsModal.style.display = 'none';
        }
    });
    
    // Display recent profiles on page load
    displayRecentProfiles();
});
