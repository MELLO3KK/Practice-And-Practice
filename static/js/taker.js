/* Quiz Master - Quiz Taker JavaScript */

let currentQuiz = null;
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let incorrectCount = 0;
let selectedOptionIndex = null;
let wrongQuestions = [];
let startTime = null;
let timerInterval = null;
let settings = {};
const STORAGE_KEY = 'quizMaster_savedQuizzes';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadQuizList();
    settings = getSettings();
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

// Load quiz list from localStorage
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
        html += `
            <li class="quiz-item">
                <div class="quiz-info">
                    <div class="quiz-title">${escapeHtml(quiz.title)}</div>
                    <div class="quiz-meta">${questionCount} questions</div>
                </div>
                <div class="quiz-actions">
                    <button class="btn btn-primary" onclick="startQuiz(${index})">▶️ Start</button>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

// Handle file load
function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const quizData = JSON.parse(e.target.result);
            startQuiz(quizData, true); // Pass true to indicate it's from file (no index)
        } catch (error) {
            alert('Invalid quiz file');
        }
    };
    reader.readAsText(file);
}

// Start quiz from localStorage by index
function startQuiz(index, isFromFile = false) {
    let quizData;
    
    if (isFromFile) {
        // Quiz data passed directly
        quizData = index;
    } else {
        // Load from localStorage
        const quizzes = getSavedQuizzes();
        if (!quizzes[index]) {
            alert('Quiz not found');
            return;
        }
        quizData = quizzes[index];
    }
    
    // Store original questions for restart functionality
    quizData.originalQuestions = [...quizData.questions];
    
    currentQuiz = quizData;
    
    // Filter to only questions (not group dividers)
    let questions = quizData.questions.filter(q => q.type === 'question');
    
    // Apply shuffle if enabled
    if (settings.shuffleEnabled) {
        questions = shuffleArray([...questions]);
    }
    
    currentQuiz.questions = questions;
    currentQuestionIndex = 0;
    score = 0;
    correctCount = 0;
    incorrectCount = 0;
    wrongQuestions = [];
    startTime = Date.now();
    
    // Show quiz screen
    document.getElementById('selectionScreen').classList.add('hidden');
    document.getElementById('quizScreen').classList.remove('hidden');
    document.getElementById('resultsScreen').classList.add('hidden');
    
    // Display quiz title
    document.getElementById('quizTitleDisplay').textContent = quizData.title || 'Quiz';
    
    // Setup timer display if enabled
    const timerDisplay = document.getElementById('timerDisplay');
    if (settings.timerEnabled) {
        timerDisplay.classList.remove('hidden');
        startTimer();
    } else {
        timerDisplay.classList.add('hidden');
    }
    
    showQuestion();
}

// Show current question
function showQuestion() {
    const question = currentQuiz.questions[currentQuestionIndex];
    if (!question) {
        endQuiz();
        return;
    }
    
    // Update progress bar
    const progress = ((currentQuestionIndex) / currentQuiz.questions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    
    // Check for group divider before this question
    const groupDivider = document.getElementById('groupDividerDisplay');
    if (settings.groupedEnabled && currentQuestionIndex > 0) {
        // Find if there's a group divider before this question in original quiz
        let prevDivider = null;
        for (let i = currentQuestionIndex - 1; i >= 0; i--) {
            const item = currentQuiz.originalQuestions ? currentQuiz.originalQuestions[i] : currentQuiz.questions[i];
            if (item && item.type === 'group-divider') {
                prevDivider = item;
                break;
            }
        }
        
        if (prevDivider) {
            groupDivider.classList.remove('hidden');
            document.getElementById('currentGroupLabel').textContent = prevDivider.label;
        } else {
            groupDivider.classList.add('hidden');
        }
    } else {
        groupDivider.classList.add('hidden');
    }
    
    // Display question text with markdown support
    document.getElementById('questionText').innerHTML = parseMarkdown(question.text);
    
    // Display media if exists
    const mediaContainer = document.getElementById('questionMedia');
    if (question.media) {
        renderMediaForTaker(mediaContainer, question.media);
    } else {
        mediaContainer.innerHTML = '';
    }
    
    // Display options
    const optionsGrid = document.getElementById('optionsGrid');
    optionsGrid.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const tile = document.createElement('div');
        tile.className = 'option-tile';
        tile.dataset.index = index;
        tile.onclick = () => selectOption(index);
        
        const keyNum = index + 1;
        const showKey = settings.keyboardEnabled && keyNum <= 6;
        
        tile.innerHTML = `
            <span class="option-key ${showKey ? '' : 'hidden'}">${keyNum}</span>
            <span>${parseMarkdown(option)}</span>
        `;
        
        optionsGrid.appendChild(tile);
    });
    
    // Reset state
    selectedOptionIndex = null;
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('checkAnswerBtn').classList.remove('hidden');
    document.getElementById('nextBtn').classList.add('hidden');
    
    // Reset timer for this question
    if (settings.timerEnabled) {
        resetTimer();
    }
}

function renderMediaForTaker(container, media) {
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
    
    html += '</div>';
    container.innerHTML = html;
}

// Select an option
function selectOption(index) {
    if (document.getElementById('nextBtn').classList.contains('hidden') === false) {
        return; // Already answered
    }
    
    selectedOptionIndex = index;
    
    document.querySelectorAll('.option-tile').forEach((tile, i) => {
        tile.classList.toggle('selected', i === index);
    });
}

// Check answer
function checkAnswer() {
    if (selectedOptionIndex === null) {
        alert('Please select an answer!');
        return;
    }
    
    const question = currentQuiz.questions[currentQuestionIndex];
    const isCorrect = selectedOptionIndex === question.correctAnswerIndex;
    
    // Show feedback
    const feedback = document.getElementById('feedback');
    feedback.classList.remove('hidden', 'correct', 'incorrect');
    
    if (isCorrect) {
        feedback.textContent = '✓ Correct!';
        feedback.classList.add('correct');
        score++;
        correctCount++;
        
        if (settings.soundEnabled) {
            correctSound.currentTime = 0;
            correctSound.play().catch(() => {});
        }
    } else {
        feedback.textContent = '✗ Incorrect!';
        feedback.classList.add('incorrect');
        incorrectCount++;
        
        if (settings.soundEnabled) {
            wrongSound.currentTime = 0;
            wrongSound.play().catch(() => {});
        }
        
        // Track wrong question for reattempt
        if (settings.reattemptEnabled) {
            wrongQuestions.push({
                ...question,
                attemptedOptions: [...question.options]
            });
        }
    }
    
    // Highlight correct/incorrect options
    document.querySelectorAll('.option-tile').forEach((tile, index) => {
        if (index === question.correctAnswerIndex) {
            tile.classList.add('correct');
        } else if (index === selectedOptionIndex && !isCorrect) {
            tile.classList.add('incorrect');
        }
    });
    
    // Show next button
    document.getElementById('checkAnswerBtn').classList.add('hidden');
    document.getElementById('nextBtn').classList.remove('hidden');
}

// Next question
function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= currentQuiz.questions.length) {
        // Check for reattempt questions
        if (settings.reattemptEnabled && wrongQuestions.length > 0) {
            if (confirm(`You have ${wrongQuestions.length} wrong answer(s). Retry them?`)) {
                currentQuiz.questions = [...wrongQuestions];
                currentQuestionIndex = 0;
                wrongQuestions = [];
                showQuestion();
                return;
            }
        }
        endQuiz();
    } else {
        showQuestion();
    }
}

// Timer functions
function startTimer() {
    const timePerQuestion = parseInt(settings.timePerQuestion) || 30;
    let timeLeft = timePerQuestion;
    
    document.getElementById('timerValue').textContent = timeLeft;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timerValue').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // Auto-submit as wrong
            if (document.getElementById('checkAnswerBtn').classList.contains('hidden') === false) {
                selectedOptionIndex = -1; // No selection
                checkAnswer();
            }
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    const timePerQuestion = parseInt(settings.timePerQuestion) || 30;
    document.getElementById('timerValue').textContent = timePerQuestion;
    startTimer();
}

// End quiz
function endQuiz() {
    clearInterval(timerInterval);
    
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const totalQuestions = currentQuiz.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    
    // Show results screen
    document.getElementById('quizScreen').classList.add('hidden');
    document.getElementById('resultsScreen').classList.remove('hidden');
    
    // Update score display
    document.getElementById('scoreDisplay').textContent = percentage + '%';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('incorrectCount').textContent = incorrectCount;
    
    // Score message
    let message = 'Good effort!';
    if (percentage >= 90) message = '🏆 Excellent! Perfect score!';
    else if (percentage >= 80) message = '🌟 Great job!';
    else if (percentage >= 70) message = '👍 Well done!';
    else if (percentage >= 60) message = '📚 Keep practicing!';
    else if (percentage >= 50) message = '💪 You can do better!';
    else message = '📖 Study more and try again!';
    
    document.getElementById('scoreMessage').textContent = message;
    
    // Time stats
    if (settings.timerEnabled) {
        document.getElementById('timeStats').classList.remove('hidden');
        document.getElementById('timeTaken').textContent = totalTime;
    } else {
        document.getElementById('timeStats').classList.add('hidden');
    }
    
    // Confetti for high scores
    if (percentage >= 80) {
        createConfetti();
    }
}

// Restart quiz
function restartQuiz() {
    if (currentQuiz && currentQuiz.originalQuestions) {
        currentQuiz.questions = [...currentQuiz.originalQuestions].filter(q => q.type === 'question');
        // Re-apply shuffle if enabled
        if (settings.shuffleEnabled) {
            currentQuiz.questions = shuffleArray([...currentQuiz.questions]);
        }
    }
    // Find the index of this quiz in saved quizzes to pass to startQuiz
    const quizzes = getSavedQuizzes();
    const index = quizzes.findIndex(q => q.title === currentQuiz.title && q.savedAt === currentQuiz.savedAt);
    if (index >= 0) {
        startQuiz(index);
    } else {
        // If not found (e.g., loaded from file), restart with current data
        startQuiz(currentQuiz, true);
    }
}

// Exit quiz
function exitQuiz() {
    if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
        clearInterval(timerInterval);
        location.href = '/take';
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (document.getElementById('quizScreen').classList.contains('hidden')) return;
    
    if (!settings.keyboardEnabled) return;
    
    // Number keys 1-6 for options
    if (e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key) - 1;
        const tiles = document.querySelectorAll('.option-tile');
        if (index < tiles.length) {
            selectOption(index);
        }
    }
    
    // Enter or Space to check answer
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!document.getElementById('checkAnswerBtn').classList.contains('hidden')) {
            checkAnswer();
        } else if (!document.getElementById('nextBtn').classList.contains('hidden')) {
            nextQuestion();
        }
    }
    
    // Escape to exit
    if (e.key === 'Escape') {
        exitQuiz();
    }
});

// Utility functions
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
