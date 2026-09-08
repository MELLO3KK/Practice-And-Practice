/* Quiz Master - Header Component */

function renderHeader() {
    return `
        <header class="header">
            <a class="logo" onclick="router.navigate('/home')">
                <span class="logo-icon">📝</span>
                <span>Quiz Master</span>
            </a>
            <nav class="nav-buttons">
                <button class="btn btn-ghost btn-icon" data-theme-toggle onclick="toggleTheme()">🌙</button>
                <a class="btn btn-secondary btn-icon" onclick="router.navigate('/settings')" title="Settings">⚙️</a>
            </nav>
        </header>
    `;
}

window.renderHeader = renderHeader;
