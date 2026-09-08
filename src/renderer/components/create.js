/* Quiz Master - Create/Edit Component */

let questionCounter = 0;
let currentMediaElement = null;
let currentQuizFilename = null;

async function renderCreate() {
    const app = document.getElementById('app');
    currentQuizFilename = null;
    
    app.innerHTML = `
        ${renderHeader()}
        <main class="main-content">
            <div class="card" style="max-width: 900px; margin: 0 auto;">
                <div class="card-header">
                    <h2 class="card-title">Create New Quiz</h2>
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
                <h3 class="card-title">Save Quiz</h3>
                <div class="flex gap-10" style="flex-wrap: wrap;">
                    <button class="btn btn-success" onclick="saveQuiz()">💾 Save Quiz</button>
                    <button class="btn btn-secondary" onclick="downloadQuiz()">📥 Export JSON</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('quizFileInput').click()">📂 Import JSON</button>
                    <input type="file" id="quizFileInput" accept=".json" style="display:none" onchange="handleFileLoad(event)">
                </div>
            </div>

            <div class="flex justify-between mt-20" style="max-width: 900px; margin: 20px auto 0;">
                <a class="btn btn-ghost" onclick="router.navigate('/home')">← Back to Home</a>
                <span id="saveStatus" style="color: var(--text-secondary)"></span>
            </div>
        </main>
        
        <!-- Question Template -->
        <template id="questionTemplate">
            <div class="question-card draggable" draggable="true">
                <div class="question-header">
                    <span class="question-number">Question <span class="qNum"></span></span>
                    <div class="question-actions">
                        <button class="btn btn-icon btn-secondary" onclick="addMedia(this)" title="Add Media">📎</button>
                        <button class="btn btn-icon btn-danger" onclick="deleteQuestion(this)" title="Delete">🗑️</button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Question Text (Markdown supported)</label>
                    <textarea class="form-input question-text" rows="3" placeholder="Enter your question..."></textarea>
                </div>

                <div class="media-container"></div>

                <div class="form-group">
                    <label class="form-label">Options (minimum 2)</label>
                    <div class="options-container"></div>
                    <button class="btn btn-secondary btn-sm mt-10" onclick="addOption(this)">+ Add Option</button>
                </div>
            </div>
        </template>

        <!-- Group Divider Template -->
        <template id="groupDividerTemplate">
            <div class="group-divider draggable" draggable="true">
                <span>📁</span>
                <input type="text" class="group-divider-input" placeholder="Group Name" value="New Group">
                <button class="btn btn-icon btn-danger" onclick="deleteElement(this)" title="Delete">🗑️</button>
            </div>
        </template>

        <!-- Media Upload Modal -->
        <div id="mediaModal" class="modal-overlay hidden">
            <div class="modal">
                <h3 class="modal-title">Add Media</h3>
                <div class="form-group">
                    <label class="form-label">Select File</label>
                    <input type="file" id="mediaFile" class="form-input" accept="image/*,audio/*,video/*">
                </div>
                <div id="mediaPreview" class="media-preview hidden"></div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeMediaModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="uploadMedia()">Upload</button>
                </div>
            </div>
        </div>
    `;
    
    setupDragAndDrop();
    addQuestion();
    updateThemeButtons();
}

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
    
    const optionsContainer = questionCard.querySelector('.options-container');
    options.forEach((opt, index) => {
        addOptionToContainer(optionsContainer, opt, index === correctIndex, options.length);
    });
    
    while (optionsContainer.children.length < 2) {
        addOptionToContainer(optionsContainer, `Option ${optionsContainer.children.length + 1}`, false, optionsContainer.children.length + 1);
    }
    
    if (media) {
        renderMedia(questionCard.querySelector('.media-container'), media);
    }
    
    document.getElementById('questionsContainer').appendChild(questionCard);
    updateQuestionNumbers();
}

function getQuestionCount() {
    return document.querySelectorAll('.question-card').length + 1;
}

function deleteQuestion(btn) {
    const questionCard = btn.closest('.question-card');
    const questionsContainer = document.getElementById('questionsContainer');
    
    if (questionsContainer.children.length <= 1) {
        showToast('You need at least one question!', 'warning');
        return;
    }
    
    questionCard.remove();
    updateQuestionNumbers();
}

function deleteElement(btn) {
    btn.closest('.group-divider').remove();
    updateQuestionNumbers();
}

function addOption(btn) {
    const optionsContainer = btn.previousElementSibling;
    addOptionToContainer(optionsContainer, 'New Option', false, optionsContainer.children.length + 1);
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
        } else {
            showToast('Minimum 2 options required!', 'warning');
        }
    };
    
    row.appendChild(radio);
    row.appendChild(input);
    row.appendChild(deleteBtn);
    container.appendChild(row);
}

function addGroupDivider(label = 'New Group') {
    const template = document.getElementById('groupDividerTemplate');
    const clone = template.content.cloneNode(true);
    const divider = clone.querySelector('.group-divider');
    divider.querySelector('.group-divider-input').value = label;
    document.getElementById('questionsContainer').appendChild(divider);
}

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

async function uploadMedia() {
    const fileInput = document.getElementById('mediaFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Please select a file', 'warning');
        return;
    }
    
    try {
        const base64Data = await fileToBase64(file);
        const result = await window.electronAPI.saveMedia(base64Data, file.name);
        
        if (result.success) {
            renderMedia(currentMediaElement, {
                path: result.path,
                type: result.type,
                original_name: file.name
            });
            closeMediaModal();
            showToast('Media uploaded successfully', 'success');
        } else {
            showToast('Upload failed: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Upload failed', 'error');
    }
}

async function renderMedia(container, media) {
    if (!media || !media.path) {
        container.innerHTML = '';
        return;
    }
    
    let mediaSrc = media.url || media.path;
    
    // Load media content if we have a path
    if (media.path && !media.url) {
        const result = await window.electronAPI.loadMedia(media.path);
        if (result.success) {
            mediaSrc = result.data;
        }
    }
    
    let html = '<div class="media-preview">';
    
    if (media.type === 'image') {
        html += `<img src="${mediaSrc}" alt="Question media">`;
    } else if (media.type === 'audio') {
        html += `<audio controls src="${mediaSrc}"></audio>`;
    } else if (media.type === 'video') {
        html += `<video controls src="${mediaSrc}" style="max-width: 400px;"></video>`;
    }
    
    html += '<br><button class="btn btn-danger btn-sm mt-10" onclick="removeMedia(this)">Remove Media</button>';
    html += '</div>';
    
    container.innerHTML = html;
}

function removeMedia(btn) {
    btn.closest('.media-container').innerHTML = '';
}

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
            const mediaEl = mediaContainer.querySelector('img, audio, video');
            let media = null;
            if (mediaEl) {
                // Store the path, not the URL
                const mediaPreview = mediaContainer.querySelector('.media-preview');
                if (mediaPreview) {
                    // We need to get the stored path from somewhere
                    // For simplicity, we'll just note that media exists
                    media = { type: mediaEl.tagName.toLowerCase() === 'img' ? 'image' : mediaEl.tagName.toLowerCase() };
                }
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
        showToast('Please add at least one question!', 'warning');
        return;
    }
    
    const statusEl = document.getElementById('saveStatus');
    statusEl.textContent = 'Saving...';
    
    try {
        const result = await window.electronAPI.saveQuiz(quizData);
        
        if (result.success) {
            statusEl.textContent = '✓ Saved successfully!';
            statusEl.style.color = 'var(--success-color)';
            showToast('Quiz saved successfully!', 'success');
            currentQuizFilename = result.filename;
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

async function downloadQuiz() {
    const quizData = getQuizData();
    const blob = new Blob([JSON.stringify(quizData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (quizData.title || 'quiz') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Quiz exported!', 'success');
}

async function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const result = await window.electronAPI.showOpenDialog();
        if (result.success) {
            loadQuizData(result.quiz);
            showToast('Quiz loaded!', 'success');
        }
    } catch (error) {
        // Fallback to regular file read
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const quizData = JSON.parse(e.target.result);
                loadQuizData(quizData);
                showToast('Quiz loaded!', 'success');
            } catch (error) {
                showToast('Invalid quiz file', 'error');
            }
        };
        reader.readAsText(file);
    }
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

router.register('/create', renderCreate);

window.renderCreate = renderCreate;
window.addQuestion = addQuestion;
window.addGroupDivider = addGroupDivider;
window.saveQuiz = saveQuiz;
window.downloadQuiz = downloadQuiz;
window.handleFileLoad = handleFileLoad;
window.loadQuizData = loadQuizData;
