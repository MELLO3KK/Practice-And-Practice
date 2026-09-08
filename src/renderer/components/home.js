/* Quiz Master - Home Component */

async function renderHome() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        ${renderHeader()}
        <main class="main-content">
            <div class="home-container">
                <div class="home-hero">
                    <h1 class="home-title">Quiz Master</h1>
                    <p class="home-subtitle">Create, edit, and take quizzes with a beautiful desktop experience</p>
                </div>
                
                <div class="home-actions">
                    <div class="action-card" onclick="router.navigate('/create')">
                        <div class="action-card-icon">➕</div>
                        <div class="action-card-title">Create Quiz</div>
                        <div class="action-card-desc">Build a new quiz from scratch</div>
                    </div>
                    <div class="action-card" onclick="router.navigate('/edit')">
                        <div class="action-card-icon">✏️</div>
                        <div class="action-card-title">Edit Quiz</div>
                        <div class="action-card-desc">Modify existing quizzes</div>
                    </div>
                    <div class="action-card" onclick="router.navigate('/take')">
                        <div class="action-card-icon">🎯</div>
                        <div class="action-card-title">Take Quiz</div>
                        <div class="action-card-desc">Test your knowledge</div>
                    </div>
                </div>
                
                <div class="quizzes-section">
                    <div class="section-header">
                        <h2 class="section-title">Recent Quizzes</h2>
                        <button class="btn btn-ghost btn-sm" onclick="loadQuizzesGrid()">Refresh</button>
                    </div>
                    <div id="quizzesGrid" class="quizzes-grid">
                        <div class="empty-state">
                            <div class="empty-state-icon">📚</div>
                            <div class="empty-state-title">Loading quizzes...</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `;
    
    updateThemeButtons();
    loadQuizzesGrid();
}

async function loadQuizzesGrid() {
    const container = document.getElementById('quizzesGrid');
    if (!container) return;
    
    try {
        const result = await window.electronAPI.getQuizzesList();
        
        if (!result.success || result.quizzes.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">📚</div>
                    <div class="empty-state-title">No quizzes yet</div>
                    <p style="color: var(--text-secondary); margin-top: 8px;">Create your first quiz to get started!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = result.quizzes.slice(0, 6).map(quiz => `
            <div class="quiz-card" onclick="window.startQuizFromHome('${quiz.filename}')">
                <div class="quiz-card-header">
                    <div class="quiz-card-icon">📝</div>
                    <div class="quiz-card-menu">
                        <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation(); window.editQuizFromHome('${quiz.filename}')" title="Edit">✏️</button>
                        <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation(); window.deleteQuizFromHome('${quiz.filename}', this)" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="quiz-card-title">${escapeHtml(quiz.title)}</div>
                <div class="quiz-card-meta">
                    <span class="quiz-card-badge">📄 ${quiz.questionCount} questions</span>
                    ${quiz.hasMedia ? '<span class="quiz-card-badge">📎 Has media</span>' : ''}
                </div>
                <div class="quiz-card-meta" style="margin-top: 8px;">
                    <span>Updated ${formatDate(quiz.updatedAt)}</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-title">Error loading quizzes</div>
            </div>
        `;
    }
}

// Global functions for home page interactions
window.startQuizFromHome = (filename) => {
    window.location.href = `/take?file=${encodeURIComponent(filename)}`;
};

window.editQuizFromHome = (filename) => {
    window.location.href = `/edit?file=${encodeURIComponent(filename)}`;
};

window.deleteQuizFromHome = async (filename, btn) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await window.electronAPI.deleteQuiz(filename);
        if (result.success) {
            showToast('Quiz deleted successfully', 'success');
            loadQuizzesGrid();
        } else {
            showToast('Failed to delete quiz: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error deleting quiz', 'error');
    }
};

router.register('/home', renderHome);
