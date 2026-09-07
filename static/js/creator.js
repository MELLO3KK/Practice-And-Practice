// Quiz Master - Quiz Creator

let questions = [];
let questionCounter = 0;
let saveTimeout = null;

// DOM Elements
const questionsContainer = document.getElementById('questions-container');
const quizTitleInput = document.getElementById('quiz-title-input');
const addQuestionBtn = document.getElementById('add-question-btn');
const addDividerBtn = document.getElementById('add-divider-btn');
const saveQuizBtn = document.getElementById('save-quiz-btn');
const exportQuizBtn = document.getElementById('export-quiz-btn');
const loadQuizBtn = document.getElementById('load-quiz-btn');
const clearQuizBtn = document.getElementById('clear-quiz-btn');
const loadQuizFileInput = document.getElementById('load-quiz-file');
const autoSaveStatus = document.getElementById('auto-save-status');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check for draft
    const draft = localStorage.getItem('quizDraft');
    if (draft) {
        try {
            const draftData = JSON.parse(draft);
            restoreQuiz(draftData);
        } catch (e) {
            console.error('Error loading draft:', e);
        }
    }
    
    // Add first question by default
    if (questions.length === 0) {
        addQuestion();
    }
});

// Create a new question object
function createQuestion() {
    return {
        type: 'question',
        text: '',
        options: ['Option 1', 'Option 2'],
        correctAnswerIndex: 0,
        media: null
    };
}

// Create a group divider
function createDivider() {
    return {
        type: 'group-divider',
        label: 'New Section'
    };
}

// Render a question card
function renderQuestionCard(question, index) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.draggable = true;
    card.dataset.index = index;
    
    const isDivider = question.type === 'group-divider';
    
    if (isDivider) {
        card.innerHTML = `
            <div class="question-header">
                <span class="question-number">Group Divider</span>
                <div class="question-actions">
                    <button class="action-btn move-up" title="Move up">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button class="action-btn move-down" title="Move down">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <button class="action-btn delete" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <input type="text" class="divider-label-input" value="${escapeHtml(question.label)}" placeholder="Section name...">
        `;
    } else {
        let mediaHtml = '';
        if (question.media) {
            if (question.media.type === 'image') {
                mediaHtml = `<div class="media-preview"><img src="${question.media.url}" alt="Question media"></div>`;
            } else if (question.media.type === 'audio') {
                mediaHtml = `<div class="media-preview"><audio controls src="${question.media.url}"></audio></div>`;
            } else if (question.media.type === 'video') {
                mediaHtml = `<div class="media-preview"><video controls src="${question.media.url}"></video></div>`;
            }
        }
        
        let optionsHtml = '';
        question.options.forEach((option, optIndex) => {
            optionsHtml += `
                <div class="option-row">
                    <input type="radio" name="correct-${index}" class="option-radio" ${optIndex === question.correctAnswerIndex ? 'checked' : ''} data-opt="${optIndex}">
                    <input type="text" class="option-input" value="${escapeHtml(option)}" data-opt="${optIndex}" placeholder="Option ${optIndex + 1}">
                    ${question.options.length > 2 ? `<button class="option-remove-btn" data-opt="${optIndex}" title="Remove option">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>` : ''}
                </div>
            `;
        });
        
        card.innerHTML = `
            <div class="question-header">
                <span class="question-number">Question ${index + 1}</span>
                <div class="question-actions">
                    <button class="action-btn move-up" title="Move up">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button class="action-btn move-down" title="Move down">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <button class="action-btn delete" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <textarea class="question-text-input" placeholder="Enter your question here...">${escapeHtml(question.text)}</textarea>
            <div class="options-section">
                <div class="options-list" data-index="${index}">
                    ${optionsHtml}
                </div>
                <button class="add-option-btn" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Add Option
                </button>
            </div>
            <div class="media-section">
                ${mediaHtml}
                <input type="file" class="media-upload-input" accept="image/*,audio/*,video/*" style="display: none;" data-index="${index}">
                <button class="upload-media-btn" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    ${question.media ? 'Replace Media' : 'Add Media'}
                </button>
                ${question.media ? `<button class="remove-media-btn" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Remove
                </button>` : ''}
            </div>
        `;
    }
    
    // Add event listeners
    attachCardEventListeners(card, index);
    
    return card;
}

function attachCardEventListeners(card, index) {
    // Move buttons
    card.querySelector('.move-up')?.addEventListener('click', () => moveQuestion(index, -1));
    card.querySelector('.move-down')?.addEventListener('click', () => moveQuestion(index, 1));
    card.querySelector('.delete')?.addEventListener('click', () => deleteQuestion(index));
    
    // Text inputs
    const textInput = card.querySelector('.question-text-input');
    if (textInput) {
        textInput.addEventListener('input', () => {
            questions[index].text = textInput.value;
            scheduleAutoSave();
        });
    }
    
    // Divider label
    const dividerLabel = card.querySelector('.divider-label-input');
    if (dividerLabel) {
        dividerLabel.addEventListener('input', () => {
            questions[index].label = dividerLabel.value;
            scheduleAutoSave();
        });
    }
    
    // Option radios
    card.querySelectorAll('.option-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            questions[index].correctAnswerIndex = parseInt(radio.dataset.opt);
            scheduleAutoSave();
        });
    });
    
    // Option inputs
    card.querySelectorAll('.option-input').forEach(input => {
        input.addEventListener('input', () => {
            questions[index].options[parseInt(input.dataset.opt)] = input.value;
            scheduleAutoSave();
        });
    });
    
    // Remove option buttons
    card.querySelectorAll('.option-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            removeOption(index, parseInt(btn.dataset.opt));
        });
    });
    
    // Add option button
    card.querySelector('.add-option-btn')?.addEventListener('click', (e) => {
        addOption(parseInt(e.target.dataset.index));
    });
    
    // Media upload
    const uploadBtn = card.querySelector('.upload-media-btn');
    const fileInput = card.querySelector('.media-upload-input');
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleMediaUpload(e, index));
    }
    
    // Remove media
    card.querySelector('.remove-media-btn')?.addEventListener('click', () => {
        removeMedia(index);
    });
    
    // Drag and drop
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
}

// Add a new question
function addQuestion() {
    const question = createQuestion();
    questions.push(question);
    const card = renderQuestionCard(question, questions.length - 1);
    questionsContainer.appendChild(card);
    updateQuestionNumbers();
    scheduleAutoSave();
}

// Add a group divider
function addDivider() {
    const divider = createDivider();
    questions.push(divider);
    const card = renderQuestionCard(divider, questions.length - 1);
    questionsContainer.appendChild(card);
    updateQuestionNumbers();
    scheduleAutoSave();
}

// Move question
function moveQuestion(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    
    [questions[index], questions[newIndex]] = [questions[newIndex], questions[index]];
    
    // Re-render all cards
    renderAllQuestions();
    scheduleAutoSave();
}

// Delete question
function deleteQuestion(index) {
    if (questions.length <= 1) {
        alert('You need at least one question in your quiz.');
        return;
    }
    
    questions.splice(index, 1);
    renderAllQuestions();
    scheduleAutoSave();
}

// Add option
function addOption(questionIndex) {
    const question = questions[questionIndex];
    if (question.type !== 'question') return;
    
    const optionNum = question.options.length + 1;
    question.options.push(`Option ${optionNum}`);
    
    const card = questionsContainer.children[questionIndex];
    const optionsList = card.querySelector('.options-list');
    
    const optionRow = document.createElement('div');
    optionRow.className = 'option-row';
    optionRow.innerHTML = `
        <input type="radio" name="correct-${questionIndex}" class="option-radio" data-opt="${optionNum - 1}">
        <input type="text" class="option-input" value="Option ${optionNum}" data-opt="${optionNum - 1}" placeholder="Option ${optionNum}">
        <button class="option-remove-btn" data-opt="${optionNum - 1}" title="Remove option">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    optionsList.appendChild(optionRow);
    
    // Attach listeners to new elements
    const radio = optionRow.querySelector('.option-radio');
    radio.addEventListener('change', () => {
        questions[questionIndex].correctAnswerIndex = parseInt(radio.dataset.opt);
        scheduleAutoSave();
    });
    
    const input = optionRow.querySelector('.option-input');
    input.addEventListener('input', () => {
        questions[questionIndex].options[parseInt(input.dataset.opt)] = input.value;
        scheduleAutoSave();
    });
    
    const removeBtn = optionRow.querySelector('.option-remove-btn');
    removeBtn.addEventListener('click', () => {
        removeOption(questionIndex, parseInt(removeBtn.dataset.opt));
    });
    
    scheduleAutoSave();
}

// Remove option
function removeOption(questionIndex, optionIndex) {
    const question = questions[questionIndex];
    if (question.options.length <= 2) {
        alert('A question must have at least 2 options.');
        return;
    }
    
    question.options.splice(optionIndex, 1);
    
    // Adjust correct answer index if needed
    if (question.correctAnswerIndex >= optionIndex) {
        question.correctAnswerIndex--;
    }
    
    renderAllQuestions();
    scheduleAutoSave();
}

// Handle media upload
async function handleMediaUpload(event, questionIndex) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            questions[questionIndex].media = {
                url: result.url,
                type: result.type,
                filename: result.filename
            };
            renderAllQuestions();
            scheduleAutoSave();
        } else {
            alert('Failed to upload media: ' + result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload media. Please try again.');
    }
}

// Remove media
function removeMedia(questionIndex) {
    questions[questionIndex].media = null;
    renderAllQuestions();
    scheduleAutoSave();
}

// Drag and drop handlers
let dragSrcIndex = null;

function handleDragStart(e) {
    dragSrcIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.question-card').forEach(card => {
        card.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    
    const dragTargetIndex = parseInt(this.dataset.index);
    
    if (dragSrcIndex !== dragTargetIndex) {
        [questions[dragSrcIndex], questions[dragTargetIndex]] = 
        [questions[dragTargetIndex], questions[dragSrcIndex]];
        
        renderAllQuestions();
        scheduleAutoSave();
    }
    
    return false;
}

// Update question numbers
function updateQuestionNumbers() {
    let questionNum = 1;
    questionsContainer.querySelectorAll('.question-card').forEach((card, index) => {
        const numEl = card.querySelector('.question-number');
        if (questions[index].type === 'question') {
            numEl.textContent = `Question ${questionNum}`;
            questionNum++;
        } else {
            numEl.textContent = 'Group Divider';
        }
    });
}

// Render all questions
function renderAllQuestions() {
    questionsContainer.innerHTML = '';
    questions.forEach((question, index) => {
        const card = renderQuestionCard(question, index);
        questionsContainer.appendChild(card);
    });
}

// Auto-save functionality
function scheduleAutoSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    
    autoSaveStatus.querySelector('.status-dot').classList.add('saving');
    autoSaveStatus.querySelector('.status-text').textContent = 'Saving...';
    
    saveTimeout = setTimeout(() => {
        saveDraft();
    }, 1000);
}

function saveDraft() {
    const draft = getQuizData();
    localStorage.setItem('quizDraft', JSON.stringify(draft));
    
    autoSaveStatus.querySelector('.status-dot').classList.remove('saving');
    autoSaveStatus.querySelector('.status-text').textContent = 'Saved';
    
    setTimeout(() => {
        autoSaveStatus.querySelector('.status-text').textContent = 'Ready';
    }, 2000);
}

// Get quiz data
function getQuizData() {
    return {
        title: quizTitleInput.value || 'Untitled Quiz',
        questions: [...questions]
    };
}

// Save quiz to server
async function saveQuiz() {
    const quizData = getQuizData();
    
    try {
        const response = await fetch('/api/quiz/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quizData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear draft after successful save
            localStorage.removeItem('quizDraft');
            alert('Quiz saved successfully!');
            autoSaveStatus.querySelector('.status-text').textContent = 'Saved to server';
        } else {
            alert('Failed to save quiz: ' + result.error);
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save quiz. Please try again.');
    }
}

// Export quiz as JSON
function exportQuiz() {
    const quizData = getQuizData();
    const title = quizData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const blob = new Blob([JSON.stringify(quizData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}_quiz.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Load quiz from file
function loadQuizFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const quizData = JSON.parse(e.target.result);
            restoreQuiz(quizData);
        } catch (error) {
            console.error('Parse error:', error);
            alert('Invalid quiz file. Please make sure it\'s a valid JSON file.');
        }
    };
    reader.readAsText(file);
}

// Restore quiz data
window.restoreQuiz = function(quizData) {
    quizTitleInput.value = quizData.title || '';
    questions = quizData.questions || [];
    renderAllQuestions();
    updateQuestionNumbers();
};

// Clear all questions
function clearAll() {
    if (confirm('Are you sure you want to clear all questions? This cannot be undone.')) {
        questions = [];
        addQuestion();
        quizTitleInput.value = '';
        scheduleAutoSave();
    }
}

// Event listeners
addQuestionBtn.addEventListener('click', addQuestion);
addDividerBtn.addEventListener('click', addDivider);
saveQuizBtn.addEventListener('click', saveQuiz);
exportQuizBtn.addEventListener('click', exportQuiz);
loadQuizBtn.addEventListener('click', () => loadQuizFileInput.click());
loadQuizFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadQuizFromFile(file);
    e.target.value = '';
});
clearQuizBtn.addEventListener('click', clearAll);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveQuiz();
    }
    
    // Ctrl+E to export
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportQuiz();
    }
});
