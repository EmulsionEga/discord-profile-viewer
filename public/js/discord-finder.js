document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const userIdInput = document.getElementById('discord-id-input');
  const searchButton = document.getElementById('load-profile-btn');
  const errorMessage = document.getElementById('error-message');
  const recentProfilesList = document.getElementById('recent-profiles-list');
  const privacyLink = document.getElementById('privacy-link');
  const termsLink = document.getElementById('terms-link');
  const themeToggle = document.getElementById('theme-toggle');
  const toastContainer = document.getElementById('toast-container');
  const privacyModal = document.getElementById('privacy-modal');
  const termsModal = document.getElementById('terms-modal');
  const closePrivacyModal = document.getElementById('close-privacy-modal');
  const closeTermsModal = document.getElementById('close-terms-modal');
  const discordAuthBtn = document.getElementById('discord-auth-btn');
  const backToTopBtn = document.getElementById('back-to-top');
  
  // Debug mode - set to false in production
  const DEBUG = false;
  
  // Debug logger
  function debug(...args) {
    if (DEBUG) {
      console.log('[Debug]', ...args);
    }
  }
  
  // Initialize theme
  initTheme();
  
  // Load recent searches
  loadRecentProfiles();
  
  // Event Listeners
  if (searchButton) {
    searchButton.addEventListener('click', redirectToProfile);
  }
  
  if (userIdInput) {
    userIdInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        redirectToProfile();
      }
    });
    
    // Clear error message when user starts typing
    userIdInput.addEventListener('input', function() {
      if (errorMessage && errorMessage.style.display === 'block') {
        errorMessage.style.display = 'none';
      }
    });
  }
  
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Modal event listeners
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

  // Close modals when clicking outside or pressing Escape
  window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (privacyModal) privacyModal.style.display = 'none';
      if (termsModal) termsModal.style.display = 'none';
    }
    
    // Alt+T to toggle theme
    if (e.altKey && e.key === 't') {
      toggleTheme();
    }
    
    // Ctrl+Enter to search from anywhere
    if (e.ctrlKey && e.key === 'Enter') {
      redirectToProfile();
    }
  });
  
  // Back to top button
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
  
  // Discord auth button
  if (discordAuthBtn) {
    discordAuthBtn.addEventListener('click', function() {
      showToast('Discord authentication is not available in this demo', 'info');
    });
  }
  
  // Function to redirect to profile page
  function redirectToProfile() {
    const userId = userIdInput.value.trim();
    
    // Validate input
    if (!userId) {
      showError('Please enter a Discord User ID');
      return;
    }
    
    if (!/^\d{17,19}$/.test(userId)) {
      showError('Invalid Discord ID format. IDs are typically 17-19 digits.');
      return;
    }
    
    // Clear any previous errors
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    
    // Show loading state
    showToast('Loading profile...', 'info');
    
    // First, fetch minimal user data to add to recent profiles
    fetch(`/api/user/${userId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Add to recent profiles
        addToRecentProfiles(userId, data.username || 'Unknown User', data.avatarURL);
        
        // Redirect to profile page
        window.location.href = `/profile?id=${userId}`;
      })
      .catch(err => {
        console.error('Error:', err);
        showError('Failed to fetch user data. Please try again.');
      });
  }
  
  function showError(message) {
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
      
      // Hide after 5 seconds
      setTimeout(() => {
        errorMessage.style.display = 'none';
      }, 5000);
    }
    
    // Also show a toast for better visibility
    showToast(message, 'error');
  }
  
  function addToRecentProfiles(id, username, avatar) {
    // Get existing profiles
    let profiles = JSON.parse(localStorage.getItem('recentProfiles') || '[]');
    
    // Check if this ID is already in the list
    const existingIndex = profiles.findIndex(item => item.id === id);
    if (existingIndex !== -1) {
      // Remove it so we can add it to the front
      profiles.splice(existingIndex, 1);
    }
    
    // Add new profile to the beginning
    profiles.unshift({
      id: id,
      username: username || `User ${id.substring(id.length - 4)}`,
      avatar: avatar || `https://cdn.discordapp.com/embed/avatars/${id.charCodeAt(0) % 5}.png`,
      timestamp: new Date().toISOString()
    });
    
    // Keep only the 5 most recent
    profiles = profiles.slice(0, 5);
    
    // Save back to localStorage
    localStorage.setItem('recentProfiles', JSON.stringify(profiles));
    
    // Refresh the list in the UI
    loadRecentProfiles();
  }
  
  function loadRecentProfiles() {
    if (!recentProfilesList) return;
    
    const profiles = JSON.parse(localStorage.getItem('recentProfiles') || '[]');
    
    if (profiles.length === 0) {
      recentProfilesList.innerHTML = '<p class="empty-state">No recently viewed profiles</p>';
      return;
    }
    
    recentProfilesList.innerHTML = '';
    
    profiles.forEach(profile => {
      const item = document.createElement('div');
      item.className = 'recent-profile-item';
      
      const username = escapeHTML(profile.username || `User ${profile.id.substring(profile.id.length - 4)}`);
      const timeAgo = formatTimeAgo(new Date(profile.timestamp));
      const avatarUrl = profile.avatar || `https://cdn.discordapp.com/embed/avatars/${profile.id.charCodeAt(0) % 5}.png`;
      
      item.innerHTML = `
        <img class="recent-profile-avatar" src="${avatarUrl}" alt="" 
             onerror="this.onerror=null; this.src='https://cdn.discordapp.com/embed/avatars/0.png';">
        <div class="recent-profile-info">
          <div class="recent-profile-name">${username}</div>
          <div class="recent-profile-time">${timeAgo}</div>
        </div>
      `;
      
      item.addEventListener('click', function() {
        window.location.href = `/profile?id=${profile.id}`;
      });
      
      recentProfilesList.appendChild(item);
    });
  }
  
  function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else if (diffDay < 30) {
      return `${diffDay}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
  
  function showToast(message, type = 'info') {
    if (!toastContainer) {
      debug('Toast container not found');
      return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    switch (type) {
      case 'success':
        icon = '<i class="fas fa-check-circle"></i>';
        break;
      case 'error':
        icon = '<i class="fas fa-exclamation-circle"></i>';
        break;
      case 'warning':
        icon = '<i class="fas fa-exclamation-triangle"></i>';
        break;
      default:
        icon = '<i class="fas fa-info-circle"></i>';
    }
    
    toast.innerHTML = `${icon} ${message}`;
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3000);
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
    
    // Check for system preference if no saved preference
    if (!savedTheme) {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!prefersDarkMode) {
        document.body.classList.add('light-theme');
        if (themeToggle) {
          themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
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
  
  // Helper function to escape HTML to prevent XSS
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  // Handle URL parameters on page load
  function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const id = urlParams.get('id');
    
    // Handle error parameter
    if (error) {
      showError(decodeURIComponent(error));
      // Remove the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    
    // Handle ID parameter
    if (id && userIdInput) {
      userIdInput.value = id;
      // Don't auto-redirect, just fill the input
      // Remove the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }
  
  // Handle URL parameters on page load
  handleUrlParams();
  
  // Add image error handling
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', function() {
      // If avatar fails to load
      if (this.classList.contains('recent-profile-avatar')) {
        this.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
        debug('Failed to load avatar, using default');
      }
    });
  });
  
  // Add fade-in animation to the page
  document.body.classList.add('fade-in');
  
  // Add support for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion.matches) {
    // Add a class to the body to disable animations
    document.body.classList.add('reduced-motion');
  }
  
  // Add support for high contrast mode
  const prefersHighContrast = window.matchMedia('(prefers-contrast: more)');
  if (prefersHighContrast.matches) {
    // Add a class to the body for high contrast
    document.body.classList.add('high-contrast');
  }
  
  // Add support for offline detection
  window.addEventListener('online', function() {
    showToast('You are back online!', 'success');
  });
  
  window.addEventListener('offline', function() {
    showToast('You are offline. Some features may be unavailable.', 'warning');
  });
  
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
  
  // Add keyboard navigation support
  document.addEventListener('keydown', function(e) {
    // Tab key - add visible focus styles
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });
  
  // Remove keyboard navigation styles when mouse is used
  document.addEventListener('mousedown', function() {
    document.body.classList.remove('keyboard-navigation');
  });
  
  // Initialize tooltips for elements with title attribute
  function initTooltips() {
    document.querySelectorAll('[title]').forEach(element => {
      const title = element.getAttribute('title');
      
      // Skip elements that shouldn't have tooltips
      if (element.classList.contains('no-tooltip')) return;
      
      element.addEventListener('mouseenter', function(e) {
        // Store the title and remove it to prevent default tooltip
        this.setAttribute('data-title', title);
        this.removeAttribute('title');
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = title;
        
        // Position the tooltip
        const rect = this.getBoundingClientRect();
        tooltip.style.top = rect.bottom + 10 + 'px';
        tooltip.style.left = rect.left + rect.width / 2 + 'px';
        
        // Add to DOM
        document.body.appendChild(tooltip);
      });
      
      element.addEventListener('mouseleave', function() {
        // Restore the title attribute
        const dataTitle = this.getAttribute('data-title');
        if (dataTitle) {
          this.setAttribute('title', dataTitle);
          this.removeAttribute('data-title');
        }
        
        // Remove tooltip
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
          tooltip.remove();
        }
      });
    });
  }
  
  // Initialize tooltips
  initTooltips();
  
  // Function to copy text to clipboard
  function copyToClipboard(text) {
    // Use Clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          showToast('Copied to clipboard!', 'success');
        })
        .catch(err => {
          console.error('Could not copy text: ', err);
          showToast('Failed to copy to clipboard', 'error');
        });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          showToast('Copied to clipboard!', 'success');
        } else {
          showToast('Failed to copy to clipboard', 'error');
        }
      } catch (err) {
        console.error('Could not copy text: ', err);
        showToast('Failed to copy to clipboard', 'error');
      }
      
      document.body.removeChild(textArea);
    }
  }
  
  // Add copy functionality to user ID
  const userIdElement = document.getElementById('user-id');
  if (userIdElement) {
    userIdElement.addEventListener('click', function() {
      const userId = document.getElementById('user-id-value');
      if (userId) {
        copyToClipboard(userId.textContent);
      }
    });
  }
  
  // Add retry button functionality
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', function() {
      if (userIdInput && userIdInput.value.trim()) {
        redirectToProfile();
      } else {
        showToast('Please enter a Discord ID first', 'warning');
      }
    });
  }
  
  // Track page load for analytics
  debug('Page loaded: Discord Profile Finder');
});
