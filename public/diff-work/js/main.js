document.addEventListener('DOMContentLoaded', function() {
    console.log('Discord Profile Viewer loaded');
    
    // Copy user ID functionality
    const userId = document.getElementById('user-id');
    if (userId) {
        userId.addEventListener('click', function() {
            const idText = userId.textContent.replace('ID: ', '').trim();
            copyToClipboard(idText);
            showToast('User ID copied to clipboard!', 'success');
        });
        
        // Add cursor pointer and hint
        userId.style.cursor = 'pointer';
        userId.title = 'Click to copy ID';
    }
    
    // Add animation to connection items
    const connectionItems = document.querySelectorAll('.connection');
    connectionItems.forEach((item, index) => {
        // Add a slight delay to each item for a staggered animation effect
        item.style.animationDelay = `${index * 0.1}s`;
        item.classList.add('fade-in');
    });
    
    // Add hover effect to connection icons
    const connectionIcons = document.querySelectorAll('.connection i');
    connectionIcons.forEach(icon => {
        icon.addEventListener('mouseenter', function() {
            this.classList.add('pulse');
        });
        
        icon.addEventListener('mouseleave', function() {
            this.classList.remove('pulse');
        });
    });
    
    // Add theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('discord-theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        // Theme toggle event listener
        themeToggle.addEventListener('click', function() {
            toggleTheme();
        });
    }
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') return;
            
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add responsive navigation for mobile
    const profileHeader = document.querySelector('header');
    if (profileHeader) {
        const mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.className = 'mobile-menu-btn';
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        mobileMenuBtn.setAttribute('aria-label', 'Toggle navigation menu');
        mobileMenuBtn.style.display = 'none';
        
        const headerLinks = profileHeader.querySelectorAll('a');
        const navLinks = document.createElement('div');
        navLinks.className = 'nav-links';
        
        // Move links to the navLinks container
        headerLinks.forEach(link => {
            navLinks.appendChild(link.cloneNode(true));
        });
        
        // Add mobile menu functionality
        const checkScreenSize = () => {
            if (window.innerWidth <= 768) {
                // Replace the original header with mobile version
                profileHeader.innerHTML = '';
                profileHeader.appendChild(mobileMenuBtn);
                profileHeader.appendChild(navLinks);
                mobileMenuBtn.style.display = 'block';
                navLinks.classList.add('mobile-nav');
                navLinks.style.display = 'none';
            } else {
                // Restore original header
                profileHeader.innerHTML = '';
                headerLinks.forEach(link => {
                    profileHeader.appendChild(link.cloneNode(true));
                });
                mobileMenuBtn.style.display = 'none';
            }
        };
        
        // Toggle mobile menu
        mobileMenuBtn.addEventListener('click', function() {
            if (navLinks.style.display === 'none') {
                navLinks.style.display = 'flex';
                mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
                mobileMenuBtn.setAttribute('aria-expanded', 'true');
            } else {
                navLinks.style.display = 'none';
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Check screen size on load and resize
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
    }
    
    // Add loading animation for avatar
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        userAvatar.style.opacity = '0';
        userAvatar.style.transition = 'opacity 0.5s ease-in-out';
        
        userAvatar.addEventListener('load', function() {
            userAvatar.style.opacity = '1';
        });
        
        // Add error handling for avatar
        userAvatar.addEventListener('error', function() {
            this.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
            this.alt = 'Default Avatar';
            console.warn('Failed to load user avatar, using default');
        });
    }
    
    // Add timestamp to footer
    const footerContent = document.querySelector('.footer-content');
    if (footerContent) {
        const timestamp = document.createElement('p');
        timestamp.className = 'timestamp';
        timestamp.textContent = `Last updated: ${new Date().toLocaleString()}`;
        footerContent.appendChild(timestamp);
    }
    
    // Add error handling for all images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('error', function() {
            // Don't replace if already using a default image
            if (this.src.includes('cdn.discordapp.com/embed/avatars/')) return;
            
            // Replace broken images with a placeholder
            console.warn(`Failed to load image: ${this.src}, using default`);
            if (this.classList.contains('recent-profile-avatar')) {
                this.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
            } else if (this.id === 'user-avatar') {
                this.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
            } else {
                this.style.display = 'none';
            }
            this.alt = 'Image not available';
        });
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt+T to toggle theme
        if (e.altKey && e.key === 't') {
            toggleTheme();
        }
        
        // Alt+H to go home
        if (e.altKey && e.key === 'h') {
            window.location.href = '/';
        }
        
        // Alt+L to logout
        if (e.altKey && e.key === 'l' && document.querySelector('a[href="/auth/logout"]')) {
            window.location.href = '/auth/logout';
        }
        
        // Alt+P to view profile
        if (e.altKey && e.key === 'p' && document.querySelector('a[href="/profile"]')) {
            window.location.href = '/profile';
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const visibleModals = document.querySelectorAll('.privacy-modal[style*="display: flex"], .terms-modal[style*="display: flex"]');
            visibleModals.forEach(modal => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            });
        }
    });
    
    // Add modal functionality
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
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (termsLink && termsModal) {
        termsLink.addEventListener('click', function(e) {
            e.preventDefault();
            termsModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closePrivacyModal) {
        closePrivacyModal.addEventListener('click', function() {
            privacyModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
    
    if (closeTermsModal) {
        closeTermsModal.addEventListener('click', function() {
            termsModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === privacyModal) {
            privacyModal.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (e.target === termsModal) {
            termsModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    
    // Back to top button
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Initialize recent profiles if the function exists
    if (typeof window.displayRecentProfiles === 'function') {
        window.displayRecentProfiles();
    }
    
    // Discord authentication button
    const discordAuthBtn = document.getElementById('discord-auth-btn');
    if (discordAuthBtn) {
        discordAuthBtn.addEventListener('click', function() {
            window.location.href = '/auth/discord';
        });
    }
    
    // Helper functions
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
    
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        
        if (document.body.classList.contains('light-theme')) {
            localStorage.setItem('discord-theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            themeToggle.setAttribute('aria-label', 'Switch to dark theme');
        } else {
            localStorage.setItem('discord-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            themeToggle.setAttribute('aria-label', 'Switch to light theme');
        }
    }
    
    // Toast notification system
    window.showToast = function(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        
        let icon = '';
        switch(type) {
            case 'success':
                icon = '<i class="fas fa-check-circle" aria-hidden="true"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle" aria-hidden="true"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle" aria-hidden="true"></i>';
        }
        
        toast.innerHTML = `${icon} ${message}`;
        toastContainer.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    };
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam) {
        let errorMessage = 'An error occurred';
        
        switch(errorParam) {
            case 'auth_failed':
                errorMessage = 'Authentication failed. Please try again.';
                break;
            case 'login_required':
                errorMessage = 'You need to log in to access that page.';
                break;
            default:
                errorMessage = `Error: ${errorParam}`;
        }
        
        showToast(errorMessage, 'error');
    }
    
    // Add CSS for new elements
    const style = document.createElement('style');
    style.textContent = `
        .tooltip {
            position: absolute;
            background-color: var(--discord-blurple);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            z-index: 100;
            pointer-events: none;
        }
        
        .tooltip::before {
            content: '';
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            border-width: 0 5px 5px 5px;
            border-style: solid;
            border-color: transparent transparent var(--discord-blurple) transparent;
        }
        
        .fade-in {
            opacity: 0;
            animation: fadeIn 0.5s forwards;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .pulse {
            animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .mobile-menu-btn {
            background: none;
            border: none;
            color: var(--discord-text);
            font-size: 20px;
            cursor: pointer;
            padding: 5px;
        }
        
        .mobile-nav {
            position: absolute;
            top: 60px;
            left: 0;
            right: 0;
            background-color: var(--discord-card-bg);
            flex-direction: column;
            padding: 10px;
            z-index: 100;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            border-radius: 0 0 8px 8px;
        }
        
        .mobile-nav a {
            padding: 10px;
            text-align: center;
            border-bottom: 1px solid var(--discord-border);
            color: var(--discord-text);
            text-decoration: none;
            transition: background-color 0.2s;
        }
        
        .mobile-nav a:last-child {
            border-bottom: none;
        }
        
        .mobile-nav a:hover {
            background-color: var(--discord-hover);
        }
        
        .timestamp {
            font-size: 10px;
            margin-top: 5px;
            color: var(--discord-secondary-text);
        }
        
        .skip-link {
            position: absolute;
            top: -40px;
            left: 0;
            background: var(--discord-blurple);
            color: white;
            padding: 8px;
            z-index: 100;
            transition: top 0.3s;
        }
        
        .skip-link:focus {
            top: 0;
        }
        
        .visually-hidden {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
    `;
    document.head.appendChild(style);
    
    // Add accessibility features
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
        skipLink.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.setAttribute('tabindex', '-1');
                target.focus();
            }
        });
    }
    
    // Initialize tooltips for elements with title attributes
    document.querySelectorAll('[title]').forEach(el => {
        const title = el.getAttribute('title');
        
        el.addEventListener('mouseenter', function() {
            // Store the title and remove it to prevent default tooltip
            this.dataset.title = title;
            this.removeAttribute('title');
            
            // Create custom tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = title;
            this.appendChild(tooltip);
        });
        
        el.addEventListener('mouseleave', function() {
            // Restore the title attribute
            if (this.dataset.title) {
                this.setAttribute('title', this.dataset.title);
                delete this.dataset.title;
            }
            
            // Remove tooltip
            const tooltip = this.querySelector('.tooltip');
            if (tooltip) tooltip.remove();
        });
    });
    
    // Add focus styles for keyboard navigation
    document.querySelectorAll('button, a, input, [tabindex]').forEach(el => {
        el.addEventListener('focus', function() {
            this.classList.add('keyboard-focus');
        });
        
        el.addEventListener('blur', function() {
            this.classList.remove('keyboard-focus');
        });
    });
    
    // Track page load time
    const pageLoadTime = performance.now();
    console.log(`Page fully loaded in ${Math.round(pageLoadTime)}ms`);
    
    // Add Discord auth button animation
    const discordAuthButton = document.querySelector('.discord-auth-btn');
    if (discordAuthButton) {
        discordAuthButton.addEventListener('mouseenter', function() {
            this.classList.add('pulse');
        });
        
        discordAuthButton.addEventListener('mouseleave', function() {
            this.classList.remove('pulse');
        });
    }
    
    // Handle form submission
    const discordForm = document.querySelector('form');
    if (discordForm) {
        discordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const discordIdInput = document.getElementById('discord-id-input');
            if (discordIdInput && discordIdInput.value.trim()) {
                if (typeof loadProfile === 'function') {
                    loadProfile();
                }
            } else {
                showToast('Please enter a Discord ID', 'error');
            }
        });
    }
    
    // Add version check
    const currentVersion = '1.0.0';
    const lastVersion = localStorage.getItem('app-version');
    
    if (lastVersion && lastVersion !== currentVersion) {
        showToast(`Updated to version ${currentVersion}`, 'info');
    }
    
    localStorage.setItem('app-version', currentVersion);
    
    // Initialize any custom components
    initializeCustomComponents();
    
    function initializeCustomComponents() {
        // Add any custom component initialization here
        
        // Example: Initialize collapsible sections
        document.querySelectorAll('.collapsible-header').forEach(header => {
            const content = header.nextElementSibling;
            if (!content || !content.classList.contains('collapsible-content')) return;
            
            // Set initial state
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            content.style.display = isExpanded ? 'block' : 'none';
            
            header.addEventListener('click', function() {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
                content.style.display = expanded ? 'none' : 'block';
                
                // Add animation
                if (!expanded) {
                    content.style.opacity = '0';
                    content.style.maxHeight = '0';
                    setTimeout(() => {
                        content.style.opacity = '1';
                        content.style.maxHeight = '1000px';
                    }, 10);
                }
            });
        });
    }
    
    // Detect if JavaScript is enabled
    document.body.classList.remove('no-js');
    document.body.classList.add('js-enabled');
    
    // Log initialization complete
    console.log('Discord Profile Viewer initialization complete');
});
