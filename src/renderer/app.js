/* Quiz Master - Main Application Entry Point */

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize router
    router.init();
    
    // Load saved theme from settings
    window.electronAPI.loadSettings().then(result => {
        if (result.success && result.settings.darkMode) {
            applyTheme(true);
        }
    }).catch(() => {
        // Default to light theme
    });
});
