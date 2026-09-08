/* Quiz Master - Edit Component */

async function renderEdit() {
    const app = document.getElementById('app');
    
    // Check for file parameter
    const urlParams = new URLSearchParams(window.location.search);
    const filename = urlParams.get('file');
    
    app.innerHTML = `
        ${renderHeader()}
        <main class="main-content">
            <div id="quizListSection" class="card" style="max-width: 900px; margin: 0 auto;">
                <h2 class="card-title">Select Quiz to Edit</h2>
                <div id="quizListContainer">
                    <p style="color: var(--text-secondary); text-align: center;">Loading quizzes...</p>
                </div>
            </div>
            
            <div id="editSection" class="hidden">
                <div class="card" style="max-width: 900px; margin: 0 auto;">
                    <div class="card-header">
                        <h2 class="card-title">Edit Quiz</h2>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="quizTitle">Quiz Title</label>
                        <input type="text" id="quizTitle" class="form-input" placeholder="Enter quiz title...">
                    </div>

                    <div id="questionsContainer"></div>

                    <div class="flex gap-10 mt-20">
                        <button class="btn btn-primary" onclick="addQuestion()">➕ Add Question</button>
                        <button class="btn btn-secondary" onclick="addGroupDivider()">📁 Add Group Divider</button>
                    </div>
                </div>

                <div class="card" style="max-width: 900px; margin: 20px auto 0;">
                    <h3 class="card-title">Save Changes</h3>
                    <div class="flex gap-10">
                        <button class="btn btn-success" onclick="updateQuiz()">💾 Save Changes</button>
                        <button class="btn btn-secondary" onclick="downloadQuiz()">📥 Export JSON</button>
                    </div>
                </div>
            </div>

            <div class="flex justify-between mt-20" style="max-width: 900px; margin: 20px auto 0;">
                <a class="btn btn-ghost" onclick="router.navigate('/home')">← Back to Home</a>
                <span id="saveStatus" style="color: var(--text-secondary)"></span>
            </div>
        </main>
    `;
    
    updateThemeButtons();
    
    if (filename) {
        await loadQuizForEdit(filename);
    } else {
        await loadQuizList();
    }
}

async function loadQuizList() {
    const container = document.getElementById('quizListContainer');
    if (!container) return;
    
    try {
        const result = await window.electronAPI.getQuizzesList();
        
        if (!result.success || result.quizzes.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No saved quizzes found. Create one first!</p>';
            return;
        }
        
        let html = '<ul class="quiz-list" style="list-style: none;">';
        result.quizzes.forEach(quiz => {
            html += `
                <li class="quiz-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid var(--border-color);">
                    <div class="quiz-info" style="flex: 1;">
                        <div class="quiz-title" style="font-weight: bold; margin-bottom: 5px;">${escapeHtml(quiz.title)}</div>
                        <div class="quiz-meta" style="font-size: 0.85rem; color: var(--text-secondary);">${quiz.questionCount} questions • Updated ${formatDate(quiz.updatedAt)}</div>
                    </div>
                    <div class="quiz-actions" style="display: flex; gap: 8px;">
                        <button class="btn btn-primary" onclick="loadQuizForEdit('${quiz.filename}')">✏️ Edit</button>
                        <button class="btn btn-secondary" onclick="downloadQuizFile('${quiz.filename}')">📥 Download</button>
                        <button class="btn btn-danger" onclick="deleteQuizFile('${quiz.filename}', this)">🗑️ Delete</button>
                    </div>
                </li>
            `;
        });
        html += '</ul>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading quizzes:', error);
        container.innerHTML = '<p style="color: var(--error-color); text-align: center;">Error loading quizzes</p>';
    }
}

async function loadQuizForEdit(filename) {
    try {
        const result = await window.electronAPI.loadQuiz(filename);
        
        if (!result.success) {
            showToast('Error loading quiz: ' + result.error, 'error');
            return;
        }
        
        const quizData = result.quiz;
        
        document.getElementById('quizTitle').value = quizData.title || '';
        document.getElementById('questionsContainer').innerHTML = '';
        questionCounter = 0;
        
        if (quizData.questions) {
            quizData.questions.forEach(q => {
                if (q.type === 'question') {
                    addQuestion(q.text, q.options || ['Option 1', 'Option 2'], q.correctAnswerIndex || 0, q.media);
                } else if (q.type === 'group-divider') {
                    addGroupDivider(q.label || 'New Group');
                }
            });
        }
        
        document.getElementById('quizListSection').classList.add('hidden');
        document.getElementById('editSection').classList.remove('hidden');
        currentQuizFilename = filename;
        
        setupDragAndDrop();
        updateThemeButtons();
    } catch (error) {
        console.error('Error loading quiz:', error);
        showToast('Error loading quiz', 'error');
    }
}

async function updateQuiz() {
    const quizData = getQuizData();
    quizData.filename = currentQuizFilename;
    
    if (quizData.questions.filter(q => q.type === 'question').length === 0) {
        showToast('Please add at least one question!', 'warning');
        return;
    }
    
    const statusEl = document.getElementById('saveStatus');
    statusEl.textContent = 'Saving...';
    
    try {
        const result = await window.electronAPI.updateQuiz(quizData);
        
        if (result.success) {
            statusEl.textContent = '✓ Saved successfully!';
            statusEl.style.color = 'var(--success-color)';
            showToast('Quiz updated successfully!', 'success');
        } else {
            statusEl.textContent = '✗ Save failed: ' + result.error;
            statusEl.style.color = 'var(--error-color)';
            showToast('Failed to save quiz', 'error');
        }
    } catch (error) {
        console.error('Save error:', error);
        statusEl.textContent = '✗ Save failed';
        statusEl.style.color = 'var(--error-color)';
        showToast('Failed to save quiz', 'error');
    }
    
    setTimeout(() => {
        statusEl.textContent = '';
    }, 3000);
}

async function deleteQuizFile(filename, btn) {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await window.electronAPI.deleteQuiz(filename);
        if (result.success) {
            showToast('Quiz deleted successfully', 'success');
            loadQuizList();
        } else {
            showToast('Failed to delete quiz: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error deleting quiz', 'error');
    }
}

function downloadQuizFile(filename) {
    window.electronAPI.loadQuiz(filename).then(result => {
        if (result.success) {
            const blob = new Blob([JSON.stringify(result.quiz, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Quiz downloaded!', 'success');
        }
    });
}

router.register('/edit', renderEdit);
window.renderEdit = renderEdit;
window.loadQuizForEdit = loadQuizForEdit;
window.updateQuiz = updateQuiz;
window.deleteQuizFile = deleteQuizFile;
window.downloadQuizFile = downloadQuizFile;
