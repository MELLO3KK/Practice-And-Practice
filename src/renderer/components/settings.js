/* Quiz Master - Settings Component */

async function renderSettings() {
    const app = document.getElementById('app');
    
    // Load current settings
    const result = await window.electronAPI.loadSettings();
    const settings = result.success ? result.settings : getDefaultSettings();
    
    app.innerHTML = `
        ${renderHeader()}
        <main class="main-content">
            <div class="card" style="max-width: 650px; margin: 0 auto;">
                <h2 class="card-title">Settings</h2>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Appearance</h3>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <div class="setting-label">Dark Mode</div>
                            <div class="setting-description">Use dark theme for the application</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="darkModeToggle" ${settings.darkMode ? 'checked' : ''} onchange="saveSetting('darkMode', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-section">
                    <h3 class="settings-section-title">Quiz Behavior</h3>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <div class="setting-label">Sound Effects</div>
                            <div class="setting-description">Play sounds for correct/incorrect answers</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="soundEnabled" ${settings.soundEnabled ? 'checked' : ''} onchange="saveSetting('soundEnabled', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item">
                        <div class="setting-info">
                            <div class="setting-label">Timer Mode</div>
                            <div class="setting-description">Show countdown timer for each question</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="timerEnabled" ${settings.timerEnabled ? 'checked' : ''} onchange="saveSetting('timerEnabled', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item">
                        <div class="setting-info">
                            <div class="setting-label">Shuffle Questions</div>
                            <div class="setting-description">Randomize question order when taking quiz</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="shuffleEnabled" ${settings.shuffleEnabled ? 'checked' : ''} onchange="saveSetting('shuffleEnabled', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item">
                        <div class="setting-info">
                            <div class="setting-label">Keyboard Shortcuts</div>
                            <div class="setting-description">Enable number keys (1-6) for quick answer selection</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="keyboardEnabled" ${settings.keyboardEnabled ? 'checked' : ''} onchange="saveSetting('keyboardEnabled', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item">
                        <div class="setting-info">
                            <div class="setting-label">Reattempt Wrong Answers</div>
                            <div class="setting-description">Retry incorrect answers at the end of quiz</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="reattemptEnabled" ${settings.reattemptEnabled ? 'checked' : ''} onchange="saveSetting('reattemptEnabled', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item">
                        <div class="setting-info">
                            <div class="setting-label">Group Dividers</div>
                            <div class="setting-description">Show group section labels during quiz</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="groupedEnabled" ${settings.groupedEnabled ? 'checked' : ''} onchange="saveSetting('groupedEnabled', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-section">
                    <h3 class="settings-section-title">Timer Settings</h3>
                    
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="timePerQuestion">Time per Question (seconds)</label>
                        <input type="number" id="timePerQuestion" class="form-input" value="${settings.timePerQuestion || 30}" min="5" max="300" onchange="saveSetting('timePerQuestion', parseInt(this.value))">
                    </div>
                </div>
            </div>

            <div class="flex justify-between mt-20" style="max-width: 650px; margin: 20px auto 0;">
                <a class="btn btn-ghost" onclick="router.navigate('/home')">← Back to Home</a>
                <button class="btn btn-primary" onclick="resetToDefaults()">Reset to Defaults</button>
            </div>
        </main>
    `;
    
    updateThemeButtons();
    applyTheme(settings.darkMode);
}

async function saveSetting(key, value) {
    try {
        const result = await window.electronAPI.loadSettings();
        const settings = result.success ? result.settings : getDefaultSettings();
        settings[key] = value;
        
        if (key === 'darkMode') {
            applyTheme(value);
        }
        
        const saveResult = await window.electronAPI.saveSettings(settings);
        if (saveResult.success) {
            showToast(`${key} saved`, 'success');
        }
    } catch (error) {
        console.error('Error saving setting:', error);
        showToast('Failed to save setting', 'error');
    }
}

async function resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to default values?')) {
        return;
    }
    
    const defaults = getDefaultSettings();
    const result = await window.electronAPI.saveSettings(defaults);
    
    if (result.success) {
        showToast('Settings reset to defaults', 'success');
        setTimeout(() => router.navigate('/settings'), 500);
    } else {
        showToast('Failed to reset settings', 'error');
    }
}

function getDefaultSettings() {
    return {
        soundEnabled: true,
        timerEnabled: false,
        shuffleEnabled: false,
        keyboardEnabled: true,
        reattemptEnabled: false,
        groupedEnabled: true,
        timePerQuestion: 30,
        darkMode: false
    };
}

router.register('/settings', renderSettings);
window.renderSettings = renderSettings;
window.saveSetting = saveSetting;
