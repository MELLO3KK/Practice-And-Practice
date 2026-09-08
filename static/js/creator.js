/* Quiz Master - Quiz Creator JavaScript */

let questionCounter = 0;
let currentMediaElement = null;
const STORAGE_KEY = 'quizMaster_savedQuizzes';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check for unsaved draft
    checkForDraft();
    
    // Setup drag and drop
    setupDragAndDrop();
    
    // Auto-save draft periodically
    setInterval(autoSaveDraft, 30000); // Every 30 seconds
    
    // Add initial question
    addQuestion();
});

/**
 * Get all saved quizzes from localStorage
 */
function getSavedQuizzes() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading saved quizzes:', e);
        return [];
    }
}

/**
 * Save quizzes array to localStorage
 */
function saveQuizzesToStorage(quizzes) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
        return true;
    } catch (e) {
        console.error('Error saving quizzes:', e);
        alert('Storage full! Please delete some quizzes or export them.');
        return false;
    }
}

/**
 * Load quiz list in edit.html
 */
function loadQuizList() {
    const quizzes = getSavedQuizzes();
    const container = document.getElementById('quizListContainer');
    
    if (!container) return;
    
    if (quizzes.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No saved quizzes found. Create one first!</p>';
        return;
    }
    
    let html = '<ul class="quiz-list">';
    quizzes.forEach((quiz, index) => {
        const questionCount = quiz.questions ? quiz.questions.filter(q => q.type === 'question').length : 0;
        const savedAt = quiz.savedAt ? new Date(quiz.savedAt).toLocaleString() : 'Unknown';
        html += `
            <li class="quiz-item">
                <div class="quiz-info">
                    <div class="quiz-title">${escapeHtml(quiz.title)}</div>
                    <div class="quiz-meta">${questionCount} questions • Saved ${savedAt}</div>
                </div>
                <div class="quiz-actions">
                    <button class="btn btn-primary" onclick="loadQuizForEdit(${index})">✏️ Edit</button>
                    <button class="btn btn-secondary" onclick="downloadQuizData(${index})">📥 Download</button>
                    <button class="btn btn-danger" onclick="deleteQuizByIndex(${index})">🗑️ Delete</button>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

// Question Management
function addQuestion(text = '', options = ['Option 1', 'Option 2'], correctIndex = 0, media = null) {
    questionCounter++;
    const template = document.getElementById('questionTemplate');
    const clone = template.content.cloneNode(true);
    const questionCard = clone.querySelector('.question-card');
    
    questionCard.dataset.questionId = Date.now();
    questionCard.querySelector('.qNum').textContent = getQuestionCount();
    
    if (text) {
        questionCard.querySelector('.question-text').value = text;
    }
    
    // Add options
    const optionsContainer = questionCard.querySelector('.options-container');
    options.forEach((opt, index) => {
        addOptionToContainer(optionsContainer, opt, index === correctIndex, options.length);
    });
    
    // Ensure minimum 2 options
    while (optionsContainer.children.length < 2) {
        addOptionToContainer(optionsContainer, `Option ${optionsContainer.children.length + 1}`, false, optionsContainer.children.length + 1);
    }
    
    // Load media if exists
    if (media) {
        renderMedia(questionCard.querySelector('.media-container'), media);
    }
    
    document.getElementById('questionsContainer').appendChild(questionCard);
    updateQuestionNumbers();
    saveDraft();
}

function getQuestionCount() {
    return document.querySelectorAll('.question-card').length + 1;
}

function deleteQuestion(btn) {
    const questionCard = btn.closest('.question-card');
    const questionsContainer = document.getElementById('questionsContainer');
    
    if (questionsContainer.children.length <= 1) {
        alert('You need at least one question!');
        return;
    }
    
    if (confirm('Delete this question?')) {
        questionCard.remove();
        updateQuestionNumbers();
        saveDraft();
    }
}

function deleteElement(btn) {
    const element = btn.closest('.group-divider');
    if (confirm('Delete this group divider?')) {
        element.remove();
        updateQuestionNumbers();
        saveDraft();
    }
}

// Option Management
function addOption(btn) {
    const optionsContainer = btn.previousElementSibling;
    addOptionToContainer(optionsContainer, 'New Option', false, optionsContainer.children.length + 1);
    saveDraft();
}

function addOptionToContainer(container, value = '', isChecked = false, optionNum) {
    const row = document.createElement('div');
    row.className = 'option-row';
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'correct-' + container.closest('.question-card').dataset.questionId;
    radio.className = 'option-radio';
    radio.checked = isChecked;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'option-input form-input';
    input.value = value;
    input.placeholder = `Option ${optionNum}`;
    
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'option-delete';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.onclick = function() {
        if (container.children.length > 2) {
            row.remove();
            saveDraft();
        } else {
            alert('Minimum 2 options required!');
        }
    };
    
    row.appendChild(radio);
    row.appendChild(input);
    row.appendChild(deleteBtn);
    container.appendChild(row);
}

// Group Divider
function addGroupDivider(label = 'New Group') {
    const template = document.getElementById('groupDividerTemplate');
    const clone = template.content.cloneNode(true);
    const divider = clone.querySelector('.group-divider');
    divider.querySelector('.group-divider-input').value = label;
    
    document.getElementById('questionsContainer').appendChild(divider);
    saveDraft();
}

// Media Management
function addMedia(btn) {
    currentMediaElement = btn.closest('.question-card').querySelector('.media-container');
    document.getElementById('mediaModal').classList.remove('hidden');
    document.getElementById('mediaFile').value = '';
    document.getElementById('mediaPreview').classList.add('hidden');
    document.getElementById('mediaPreview').innerHTML = '';
}

function closeMediaModal() {
    document.getElementById('mediaModal').classList.add('hidden');
    currentMediaElement = null;
}

function uploadMedia() {
    const fileInput = document.getElementById('mediaFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderMedia(currentMediaElement, {
                url: data.url,
                type: data.type,
                original_name: data.original_name
            });
            closeMediaModal();
            saveDraft();
        } else {
            alert('Upload failed: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        alert('Upload failed');
    });
}

function renderMedia(container, media) {
    if (!media || !media.url) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="media-preview">';
    
    if (media.type === 'image') {
        html += `<img src="${media.url}" alt="Question media">`;
    } else if (media.type === 'audio') {
        html += `<audio controls src="${media.url}"></audio>`;
    } else if (media.type === 'video') {
        html += `<video controls src="${media.url}" style="max-width: 400px;"></video>`;
    }
    
    html += '<br><button class="btn btn-danger btn-sm mt-10" onclick="removeMedia(this)">Remove Media</button>';
    html += '</div>';
    
    container.innerHTML = html;
}

function removeMedia(btn) {
    btn.closest('.media-container').innerHTML = '';
    saveDraft();
}

// Drag and Drop
function setupDragAndDrop() {
    const container = document.getElementById('questionsContainer');
    let draggedItem = null;
    
    container.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('draggable')) {
            draggedItem = e.target;
            e.target.classList.add('dragging');
        }
    });
    
    container.addEventListener('dragend', function(e) {
        if (e.target.classList.contains('draggable')) {
            e.target.classList.remove('dragging');
            draggedItem = null;
            updateQuestionNumbers();
            saveDraft();
        }
    });
    
    container.addEventListener('dragover', function(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        if (draggedItem) {
            if (afterElement == null) {
                container.appendChild(draggedItem);
            } else {
                container.insertBefore(draggedItem, afterElement);
            }
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateQuestionNumbers() {
    document.querySelectorAll('.question-card').forEach((card, index) => {
        card.querySelector('.qNum').textContent = index + 1;
    });
}

// Save/Load Quiz
function getQuizData() {
    const title = document.getElementById('quizTitle').value || 'Untitled Quiz';
    const questions = [];
    
    document.getElementById('questionsContainer').children.forEach(element => {
        if (element.classList.contains('question-card')) {
            const text = element.querySelector('.question-text').value;
            const options = [];
            let correctIndex = 0;
            
            element.querySelectorAll('.option-row').forEach((row, index) => {
                options.push(row.querySelector('.option-input').value);
                if (row.querySelector('.option-radio').checked) {
                    correctIndex = index;
                }
            });
            
            const mediaContainer = element.querySelector('.media-container');
            const mediaImg = mediaContainer.querySelector('img, audio, video');
            let media = null;
            if (mediaImg) {
                media = {
                    url: mediaImg.src,
                    type: mediaImg.tagName.toLowerCase() === 'img' ? 'image' : 
                          mediaImg.tagName.toLowerCase() === 'audio' ? 'audio' : 'video'
                };
            }
            
            questions.push({
                type: 'question',
                text: text,
                options: options,
                correctAnswerIndex: correctIndex,
                media: media
            });
        } else if (element.classList.contains('group-divider')) {
            questions.push({
                type: 'group-divider',
                label: element.querySelector('.group-divider-input').value
            });
        }
    });
    
    return { title, questions };
}

async function saveQuiz() {
    const quizData = getQuizData();
    
    if (quizData.questions.filter(q => q.type === 'question').length === 0) {
        alert('Please add at least one question!');
        return;
    }
    
    // Add metadata
    quizData.savedAt = new Date().toISOString();
    
    const statusEl = document.getElementById('saveStatus');
    statusEl.textContent = 'Saving...';
    
    try {
        // Get existing quizzes
        const quizzes = getSavedQuizzes();
        
        // Check if we're updating an existing quiz
        const existingIndex = window.currentQuizIndex !== undefined ? window.currentQuizIndex : -1;
        
        if (existingIndex >= 0 && quizzes[existingIndex]) {
            // Update existing quiz
            quizzes[existingIndex] = quizData;
            statusEl.textContent = '✓ Quiz updated!';
        } else {
            // Add as new quiz
            quizzes.push(quizData);
            statusEl.textContent = '✓ Quiz saved!';
        }
        
        if (saveQuizzesToStorage(quizzes)) {
            statusEl.style.color = 'var(--success-color)';
            localStorage.removeItem('quizDraft'); // Clear draft on successful save
            
            // If in edit mode, reload the list
            if (document.getElementById('quizListContainer')) {
                setTimeout(() => {
                    loadQuizList();
                    document.getElementById('quizListContainer').classList.remove('hidden');
                    document.getElementById('editCard').classList.add('hidden');
                    document.getElementById('saveCard').classList.add('hidden');
                }, 1000);
            }
        } else {
            statusEl.textContent = '✗ Storage full!';
            statusEl.style.color = 'var(--error-color)';
        }
    } catch (error) {
        console.error('Save error:', error);
        statusEl.textContent = '✗ Save failed';
        statusEl.style.color = 'var(--error-color)';
    }
    
    setTimeout(() => {
        statusEl.textContent = '';
    }, 3000);
}

function downloadQuiz() {
    const quizData = getQuizData();
    const blob = new Blob([JSON.stringify(quizData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (quizData.title || 'quiz') + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Download a specific quiz from localStorage by index
 */
function downloadQuizData(index) {
    const quizzes = getSavedQuizzes();
    if (quizzes[index]) {
        const quizData = quizzes[index];
        const blob = new Blob([JSON.stringify(quizData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (quizData.title || 'quiz') + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }
}

function loadQuizFromFile() {
    document.getElementById('quizFileInput').click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const quizData = JSON.parse(e.target.result);
            loadQuizData(quizData);
        } catch (error) {
            alert('Invalid quiz file');
        }
    };
    reader.readAsText(file);
}

function loadQuizData(quizData) {
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
    
    updateQuestionNumbers();
}

/**
 * Load a quiz from localStorage for editing
 */
function loadQuizForEdit(index) {
    const quizzes = getSavedQuizzes();
    if (!quizzes[index]) {
        alert('Quiz not found');
        return;
    }
    
    const quizData = quizzes[index];
    window.currentQuizIndex = index; // Store index for updating
    
    // Populate the form
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
    
    updateQuestionNumbers();
    
    // Show edit cards
    document.getElementById('quizListContainer').classList.add('hidden');
    document.getElementById('editCard').classList.remove('hidden');
    document.getElementById('saveCard').classList.remove('hidden');
}

/**
 * Delete a quiz from localStorage by index
 */
function deleteQuizByIndex(index) {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    
    const quizzes = getSavedQuizzes();
    if (quizzes[index]) {
        quizzes.splice(index, 1);
        saveQuizzesToStorage(quizzes);
        loadQuizList();
    }
}

// Draft Management
function autoSaveDraft() {
    const quizData = getQuizData();
    if (quizData.questions.filter(q => q.type === 'question').length > 0) {
        localStorage.setItem('quizDraft', JSON.stringify(quizData));
    }
}

function saveDraft() {
    const quizData = getQuizData();
    if (quizData.questions.filter(q => q.type === 'question').length > 0) {
        localStorage.setItem('quizDraft', JSON.stringify(quizData));
    }
}

function checkForDraft() {
    const draft = localStorage.getItem('quizDraft');
    if (draft) {
        if (confirm('You have an unsaved draft. Would you like to restore it?')) {
            try {
                const quizData = JSON.parse(draft);
                loadQuizData(quizData);
            } catch (e) {
                console.error('Failed to parse draft');
            }
        } else {
            localStorage.removeItem('quizDraft');
        }
    }
}
