// Quiz Master - Settings Page

document.addEventListener('DOMContentLoaded', function() {
    const soundToggle = document.getElementById('setting-sound');
    const timerToggle = document.getElementById('setting-timer');
    const shuffleToggle = document.getElementById('setting-shuffle');
    const keyboardToggle = document.getElementById('setting-keyboard');
    const reattemptToggle = document.getElementById('setting-reattempt');
    const groupedToggle = document.getElementById('setting-grouped');
    const timeOptions = document.querySelectorAll('input[name="time-per-question"]');
    const clearDraftsBtn = document.getElementById('clear-drafts-btn');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    
    // Load current settings
    loadSettings();
    
    // Add change listeners for auto-save
    soundToggle.addEventListener('change', saveSettingsFromUI);
    timerToggle.addEventListener('change', saveSettingsFromUI);
    shuffleToggle.addEventListener('change', saveSettingsFromUI);
    keyboardToggle.addEventListener('change', saveSettingsFromUI);
    reattemptToggle.addEventListener('change', saveSettingsFromUI);
    groupedToggle.addEventListener('change', saveSettingsFromUI);
    
    timeOptions.forEach(option => {
        option.addEventListener('change', saveSettingsFromUI);
    });
    
    // Clear drafts button
    clearDraftsBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all saved drafts? This cannot be undone.')) {
            localStorage.removeItem('quizDraft');
            alert('All drafts have been cleared.');
        }
    });
    
    // Reset settings button
    resetSettingsBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset all settings to their defaults?')) {
            resetSettings();
            loadSettings();
            alert('Settings have been reset to defaults.');
        }
    });
});

// Load settings into UI
function loadSettings() {
    const settings = getSettings();
    
    document.getElementById('setting-sound').checked = settings.sound;
    document.getElementById('setting-timer').checked = settings.timer;
    document.getElementById('setting-shuffle').checked = settings.shuffle;
    document.getElementById('setting-keyboard').checked = settings.keyboard;
    document.getElementById('setting-reattempt').checked = settings.reattempt;
    document.getElementById('setting-grouped').checked = settings.grouped;
    
    // Set time per question
    const timeOptions = document.querySelectorAll('input[name="time-per-question"]');
    timeOptions.forEach(option => {
        option.checked = parseInt(option.value) === settings.timePerQuestion;
    });
}

// Save settings from UI
function saveSettingsFromUI() {
    const settings = {
        sound: document.getElementById('setting-sound').checked,
        timer: document.getElementById('setting-timer').checked,
        shuffle: document.getElementById('setting-shuffle').checked,
        keyboard: document.getElementById('setting-keyboard').checked,
        reattempt: document.getElementById('setting-reattempt').checked,
        grouped: document.getElementById('setting-grouped').checked,
        timePerQuestion: 30
    };
    
    // Get selected time
    const timeOptions = document.querySelectorAll('input[name="time-per-question"]:checked');
    timeOptions.forEach(option => {
        settings.timePerQuestion = parseInt(option.value);
    });
    
    saveSettings(settings);
}
