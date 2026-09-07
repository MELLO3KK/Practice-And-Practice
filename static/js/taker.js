// Quiz Master - Quiz Taker

let currentQuiz = null;
let questionOrder = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedAnswer = null;
let wrongAnswers = [];
let timerInterval = null;
let timeLeft = 30;
let isRetrying = false;
let retryQuestions = [];

// Audio elements for sound effects
const correctSound = new Audio('/static/correct.mp3');
const wrongSound = new Audio('/static/wrong.mp3');

// DOM Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const savedQuizzesList = document.getElementById('saved-quizzes-list');
const uploadQuizBtn = document.getElementById('upload-quiz-btn');
const quizFileInput = document.getElementById('quiz-file-input');
const quizTitleDisplay = document.getElementById('quiz-title-display');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const timerContainer = document.getElementById('timer-container');
const timerDisplay = document.getElementById('timer-display');
const exitQuizBtn = document.getElementById('exit-quiz-btn');
const groupDividerEl = document.getElementById('group-divider');
const questionMediaEl = document.getElementById('question-media');
const questionTextEl = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const checkAnswerBtn = document.getElementById('check-answer-btn');
const continueBtn = document.getElementById('continue-btn');
const feedbackMessage = document.getElementById('feedback-message');
const scorePercent = document.getElementById('score-percent');
const scorePath = document.getElementById('score-path');
const scoreText = document.getElementById('score-text');
const wrongAnswersSection = document.getElementById('wrong-answers-section');
const wrongAnswersList = document.getElementById('wrong-answers-list');
const retryWrongBtn = document.getElementById('retry-wrong-btn');
const restartQuizBtn = document.getElementById('restart-quiz-btn');
const returnHomeBtn = document.getElementById('return-home-btn');
const confettiCanvas = document.getElementById('confetti-canvas');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSavedQuizzes();
    
    // Event listeners
    uploadQuizBtn.addEventListener('click', () => quizFileInput.click());
    quizFileInput.addEventListener('change', handleFileUpload);
    checkAnswerBtn.addEventListener('click', checkAnswer);
    continueBtn.addEventListener('click', nextQuestion);
    exitQuizBtn.addEventListener('click', confirmExit);
    retryWrongBtn.addEventListener('click', retryWrongAnswers);
    restartQuizBtn.addEventListener('click', restartQuiz);
    returnHomeBtn.addEventListener('click', () => window.location.href = '/');
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
});

// Load saved quizzes from server
async function loadSavedQuizzes() {
    try {
        const response = await fetch('/api/quizzes');
        const quizzes = await response.json();
        
        if (quizzes.length === 0) {
            savedQuizzesList.innerHTML = '<p style="color: var(--text-muted);">No saved quizzes found. Upload a quiz file to get started.</p>';
            return;
        }
        
        savedQuizzesList.innerHTML = '';
        quizzes.forEach(quiz => {
            const item = document.createElement('div');
            item.className = 'quiz-item';
            item.innerHTML = `
                <span class="quiz-item-title">${escapeHtml(quiz.title)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;
            item.addEventListener('click', () => loadQuiz(quiz));
            savedQuizzesList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading quizzes:', error);
        savedQuizzesList.innerHTML = '<p style="color: var(--error-color);">Error loading saved quizzes.</p>';
    }
}

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const quizData = JSON.parse(e.target.result);
            startQuiz(quizData);
        } catch (error) {
            console.error('Parse error:', error);
            alert('Invalid quiz file. Please make sure it\'s a valid JSON file.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Load quiz from server
async function loadQuiz(quizInfo) {
    try {
        const response = await fetch(`/api/quiz/${quizInfo.id}`);
        const quizData = await response.json();
        
        if (quizData.error) {
            alert('Error loading quiz: ' + quizData.error);
            return;
        }
        
        startQuiz(quizData);
    } catch (error) {
        console.error('Load error:', error);
        alert('Error loading quiz. Please try again.');
    }
}

// Start the quiz
function startQuiz(quizData) {
    currentQuiz = quizData;
    
    // Filter out dividers for question order
    const questionsOnly = quizData.questions.filter(q => q.type === 'question');
    
    if (questionsOnly.length === 0) {
        alert('This quiz has no questions!');
        return;
    }
    
    // Get settings
    const settings = getSettings();
    
    // Shuffle if enabled
    if (settings.shuffle) {
        questionOrder = shuffleArray([...questionsOnly]);
    } else {
        questionOrder = [...questionsOnly];
    }
    
    // Reset state
    currentQuestionIndex = 0;
    score = 0;
    wrongAnswers = [];
    isRetrying = false;
    retryQuestions = [];
    
    // Show quiz screen
    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    // Set title
    quizTitleDisplay.textContent = quizData.title;
    
    // Show/hide timer based on settings
    if (settings.timer) {
        timerContainer.classList.remove('hidden');
        timeLeft = settings.timePerQuestion;
        updateTimerDisplay();
    } else {
        timerContainer.classList.add('hidden');
    }
    
    // Show first question
    showQuestion();
}

// Show current question
function showQuestion() {
    const question = questionOrder[currentQuestionIndex];
    const settings = getSettings();
    
    // Reset selection
    selectedAnswer = null;
    checkAnswerBtn.classList.remove('hidden');
    continueBtn.classList.add('hidden');
    feedbackMessage.classList.add('hidden');
    
    // Update progress
    const totalQuestions = questionOrder.length;
    const progress = ((currentQuestionIndex) / totalQuestions) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${currentQuestionIndex + 1} / ${totalQuestions}`;
    
    // Show group divider if applicable
    if (settings.grouped) {
        const allQuestions = currentQuiz.questions;
        const currentIndex = allQuestions.findIndex(q => 
            q.type === 'question' && 
            q.text === question.text &&
            JSON.stringify(q.options) === JSON.stringify(question.options)
        );
        
        if (currentIndex > 0) {
            const prevItem = allQuestions[currentIndex - 1];
            if (prevItem && prevItem.type === 'group-divider') {
                groupDividerEl.textContent = prevItem.label;
                groupDividerEl.classList.remove('hidden');
            } else {
                groupDividerEl.classList.add('hidden');
            }
        } else {
            groupDividerEl.classList.add('hidden');
        }
    } else {
        groupDividerEl.classList.add('hidden');
    }
    
    // Show media
    if (question.media) {
        questionMediaEl.classList.remove('hidden');
        if (question.media.type === 'image') {
            questionMediaEl.innerHTML = `<img src="${question.media.url}" alt="Question media">`;
        } else if (question.media.type === 'audio') {
            questionMediaEl.innerHTML = `<audio controls src="${question.media.url}"></audio>`;
        } else if (question.media.type === 'video') {
            questionMediaEl.innerHTML = `<video controls src="${question.media.url}"></video>`;
        }
    } else {
        questionMediaEl.classList.add('hidden');
        questionMediaEl.innerHTML = '';
    }
    
    // Show question text with markdown support
    questionTextEl.innerHTML = parseMarkdown(question.text);
    
    // Render options
    renderOptions(question);
    
    // Start timer if enabled
    if (timerInterval) clearInterval(timerInterval);
    if (settings.timer) {
        timeLeft = settings.timePerQuestion;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timeUp();
            }
        }, 1000);
    }
}

// Render answer options
function renderOptions(question) {
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const tile = document.createElement('div');
        tile.className = 'option-tile';
        tile.dataset.index = index;
        
        const keyLabel = index < 6 ? (index + 1).toString() : '?';
        
        tile.innerHTML = `
            <span class="option-key">${keyLabel}</span>
            <span class="option-label">${parseMarkdown(option)}</span>
        `;
        
        tile.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(tile);
    });
}

// Select an option
function selectOption(index) {
    if (selectedAnswer !== null) return; // Already answered
    
    selectedAnswer = index;
    
    const tiles = optionsContainer.querySelectorAll('.option-tile');
    tiles.forEach((tile, i) => {
        tile.classList.toggle('selected', i === index);
    });
}

// Check the answer
function checkAnswer() {
    if (selectedAnswer === null) {
        alert('Please select an answer first.');
        return;
    }
    
    clearInterval(timerInterval);
    
    const question = questionOrder[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswerIndex;
    
    // Show feedback
    const tiles = optionsContainer.querySelectorAll('.option-tile');
    
    if (isCorrect) {
        score++;
        tiles[selectedAnswer].classList.add('correct');
        feedbackMessage.textContent = '✓ Correct!';
        feedbackMessage.className = 'feedback-message correct';
        
        if (getSettings().sound) {
            correctSound.currentTime = 0;
            correctSound.play().catch(() => {});
        }
    } else {
        tiles[selectedAnswer].classList.add('incorrect');
        tiles[question.correctAnswerIndex].classList.add('correct');
        feedbackMessage.textContent = '✗ Incorrect';
        feedbackMessage.className = 'feedback-message incorrect';
        
        // Track wrong answer
        wrongAnswers.push({
            question: question,
            yourAnswer: selectedAnswer,
            correctAnswer: question.correctAnswerIndex
        });
        
        if (getSettings().sound) {
            wrongSound.currentTime = 0;
            wrongSound.play().catch(() => {});
        }
    }
    
    // Show continue button
    checkAnswerBtn.classList.add('hidden');
    continueBtn.classList.remove('hidden');
}

// Time up handler
function timeUp() {
    const question = questionOrder[currentQuestionIndex];
    
    // Mark as wrong
    const tiles = optionsContainer.querySelectorAll('.option-tile');
    tiles[question.correctAnswerIndex].classList.add('correct');
    
    feedbackMessage.textContent = '⏱ Time\'s up!';
    feedbackMessage.className = 'feedback-message incorrect';
    
    // Track as wrong answer
    wrongAnswers.push({
        question: question,
        yourAnswer: -1,
        correctAnswer: question.correctAnswerIndex,
        timedOut: true
    });
    
    if (getSettings().sound) {
        wrongSound.currentTime = 0;
        wrongSound.play().catch(() => {});
    }
    
    checkAnswerBtn.classList.add('hidden');
    continueBtn.classList.remove('hidden');
}

// Next question
function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= questionOrder.length) {
        showResults();
    } else {
        showQuestion();
    }
}

// Show results
function showResults() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    const totalQuestions = questionOrder.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    
    // Animate score
    scorePercent.textContent = `${percentage}%`;
    scorePath.setAttribute('stroke-dasharray', `${percentage}, 100`);
    scoreText.textContent = `You got ${score} out of ${totalQuestions} correct`;
    
    // Show confetti for high scores
    if (percentage >= 70) {
        startConfetti();
    }
    
    // Show wrong answers section if there are any and reattempt is enabled
    const settings = getSettings();
    if (wrongAnswers.length > 0) {
        wrongAnswersSection.classList.remove('hidden');
        renderWrongAnswers();
        retryWrongBtn.classList.remove('hidden');
        
        if (!settings.reattempt) {
            retryWrongBtn.classList.add('hidden');
        }
    } else {
        wrongAnswersSection.classList.add('hidden');
        retryWrongBtn.classList.add('hidden');
    }
}

// Render wrong answers list
function renderWrongAnswers() {
    wrongAnswersList.innerHTML = '';
    
    wrongAnswers.forEach(item => {
        const div = document.createElement('div');
        div.className = 'wrong-answer-item';
        
        const yourAnswerText = item.yourAnswer >= 0 
            ? item.question.options[item.yourAnswer] 
            : 'Time expired';
        
        div.innerHTML = `
            <p><strong>${escapeHtml(item.question.text)}</strong></p>
            <p class="your-answer">Your answer: ${escapeHtml(yourAnswerText)}</p>
            <p class="correct-answer">Correct answer: ${escapeHtml(item.question.options[item.correctAnswer])}</p>
        `;
        
        wrongAnswersList.appendChild(div);
    });
}

// Retry wrong answers
function retryWrongAnswers() {
    if (wrongAnswers.length === 0) return;
    
    retryQuestions = wrongAnswers.map(item => item.question);
    isRetrying = true;
    currentQuestionIndex = 0;
    score = 0;
    wrongAnswers = [];
    
    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    quizTitleDisplay.textContent = `${currentQuiz.title} (Retry)`;
    
    showRetryQuestion();
}

// Show retry question
function showRetryQuestion() {
    const question = retryQuestions[currentQuestionIndex];
    
    selectedAnswer = null;
    checkAnswerBtn.classList.remove('hidden');
    continueBtn.classList.add('hidden');
    feedbackMessage.classList.add('hidden');
    
    const totalQuestions = retryQuestions.length;
    const progress = ((currentQuestionIndex) / totalQuestions) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${currentQuestionIndex + 1} / ${totalQuestions}`;
    
    groupDividerEl.classList.add('hidden');
    
    if (question.media) {
        questionMediaEl.classList.remove('hidden');
        if (question.media.type === 'image') {
            questionMediaEl.innerHTML = `<img src="${question.media.url}" alt="Question media">`;
        } else if (question.media.type === 'audio') {
            questionMediaEl.innerHTML = `<audio controls src="${question.media.url}"></audio>`;
        } else if (question.media.type === 'video') {
            questionMediaEl.innerHTML = `<video controls src="${question.media.url}"></video>`;
        }
    } else {
        questionMediaEl.classList.add('hidden');
        questionMediaEl.innerHTML = '';
    }
    
    questionTextEl.innerHTML = parseMarkdown(question.text);
    renderOptions(question);
    
    // No timer for retry
    if (timerInterval) clearInterval(timerInterval);
    timerContainer.classList.add('hidden');
}

// Restart quiz
function restartQuiz() {
    stopConfetti();
    startQuiz(currentQuiz);
}

// Confirm exit
function confirmExit() {
    if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
        stopConfetti();
        window.location.href = '/take';
    }
}

// Update timer display
function updateTimerDisplay() {
    timerDisplay.textContent = timeLeft;
    
    if (timeLeft <= 10) {
        timerDisplay.classList.add('danger');
        timerDisplay.classList.remove('warning');
    } else if (timeLeft <= 20) {
        timerDisplay.classList.add('warning');
        timerDisplay.classList.remove('danger');
    } else {
        timerDisplay.classList.remove('warning', 'danger');
    }
}

// Keyboard handling
function handleKeyboard(e) {
    // Only handle keyboard if we're on the quiz screen and keyboard shortcuts are enabled
    if (quizScreen.classList.contains('hidden')) return;
    if (!getSettings().keyboard) return;
    
    // Number keys 1-6 to select options
    if (e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key) - 1;
        const tiles = optionsContainer.querySelectorAll('.option-tile');
        if (index < tiles.length && selectedAnswer === null) {
            selectOption(index);
        }
    }
    
    // Enter or Space to check answer or continue
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!checkAnswerBtn.classList.contains('hidden')) {
            checkAnswer();
        } else if (!continueBtn.classList.contains('hidden')) {
            nextQuestion();
        }
    }
    
    // Escape to exit
    if (e.key === 'Escape') {
        confirmExit();
    }
}

// Confetti animation
let confettiActive = false;
let confettiParticles = [];

function startConfetti() {
    confettiCanvas.classList.remove('hidden');
    confettiActive = true;
    confettiParticles = [];
    
    const ctx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    
    // Create particles
    for (let i = 0; i < 150; i++) {
        confettiParticles.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * confettiCanvas.height - confettiCanvas.height,
            vx: Math.random() * 4 - 2,
            vy: Math.random() * 4 + 2,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            size: Math.random() * 8 + 4,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }
    
    animateConfetti();
}

function animateConfetti() {
    if (!confettiActive) return;
    
    const ctx = confettiCanvas.getContext('2d');
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    confettiParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        
        if (p.y > confettiCanvas.height) {
            p.y = -20;
            p.x = Math.random() * confettiCanvas.width;
        }
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
    });
    
    requestAnimationFrame(animateConfetti);
}

function stopConfetti() {
    confettiActive = false;
    confettiCanvas.classList.add('hidden');
}

// Handle window resize for confetti
window.addEventListener('resize', () => {
    if (!confettiCanvas.classList.contains('hidden')) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
});
