// Quiz Master - Main JavaScript (Shared functionality)

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('quizMasterTheme');
    const body = document.body;
    
    if (savedTheme === 'dark') {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
    }
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-mode');
    
    if (isDark) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('quizMasterTheme', 'light');
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('quizMasterTheme', 'dark');
    }
}

// Settings Management
const defaultSettings = {
    sound: true,
    timer: false,
    shuffle: false,
    keyboard: true,
    reattempt: false,
    grouped: true,
    timePerQuestion: 30
};

function getSettings() {
    const saved = localStorage.getItem('quizMasterSettings');
    if (saved) {
        try {
            return { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {
            return { ...defaultSettings };
        }
    }
    return { ...defaultSettings };
}

function saveSettings(settings) {
    localStorage.setItem('quizMasterSettings', JSON.stringify(settings));
}

function resetSettings() {
    localStorage.removeItem('quizMasterSettings');
    return { ...defaultSettings };
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    
    // Attach theme toggle handlers
    const themeToggles = document.querySelectorAll('#theme-toggle, #theme-toggle-result');
    themeToggles.forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('click', toggleTheme);
        }
    });
});

// Utility functions
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Simple Markdown parser (basic support)
function parseMarkdown(text) {
    if (!text) return '';
    
    let html = escapeHtml(text);
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

// Export for use in other scripts
window.quizMaster = {
    initTheme,
    toggleTheme,
    getSettings,
    saveSettings,
    resetSettings,
    shuffleArray,
    escapeHtml,
    parseMarkdown
};
