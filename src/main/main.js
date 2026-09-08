const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Get the userData path for storing quizzes and media
const userDataPath = app.getPath('userData');
const quizzesPath = path.join(userDataPath, 'quizzes');
const mediaPath = path.join(userDataPath, 'media');

// Ensure directories exist
if (!fs.existsSync(quizzesPath)) {
    fs.mkdirSync(quizzesPath, { recursive: true });
}
if (!fs.existsSync(mediaPath)) {
    fs.mkdirSync(mediaPath, { recursive: true });
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        },
        backgroundColor: '#ffffff',
        show: false,
        titleBarStyle: 'hiddenInset'
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers for Quiz Management

// Save quiz to local storage
ipcMain.handle('save-quiz', async (event, quizData) => {
    try {
        const timestamp = Date.now();
        const safeTitle = quizData.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) || 'Untitled';
        const filename = `${safeTitle}_${timestamp}.json`;
        const filepath = path.join(quizzesPath, filename);
        
        // Add metadata
        quizData.id = `quiz_${timestamp}`;
        quizData.createdAt = new Date().toISOString();
        quizData.updatedAt = new Date().toISOString();
        
        fs.writeFileSync(filepath, JSON.stringify(quizData, null, 2), 'utf-8');
        
        return { success: true, filename, id: quizData.id };
    } catch (error) {
        console.error('Error saving quiz:', error);
        return { success: false, error: error.message };
    }
});

// Update existing quiz
ipcMain.handle('update-quiz', async (event, quizData) => {
    try {
        const filepath = path.join(quizzesPath, quizData.filename);
        
        if (!fs.existsSync(filepath)) {
            return { success: false, error: 'Quiz file not found' };
        }
        
        quizData.updatedAt = new Date().toISOString();
        
        fs.writeFileSync(filepath, JSON.stringify(quizData, null, 2), 'utf-8');
        
        return { success: true };
    } catch (error) {
        console.error('Error updating quiz:', error);
        return { success: false, error: error.message };
    }
});

// Load all quizzes list
ipcMain.handle('get-quizzes-list', async () => {
    try {
        const files = fs.readdirSync(quizzesPath)
            .filter(f => f.endsWith('.json'))
            .map(filename => {
                try {
                    const filepath = path.join(quizzesPath, filename);
                    const stats = fs.statSync(filepath);
                    const content = fs.readFileSync(filepath, 'utf-8');
                    const quiz = JSON.parse(content);
                    
                    const questionCount = quiz.questions?.filter(q => q.type === 'question').length || 0;
                    const hasMedia = quiz.questions?.some(q => q.media) || false;
                    
                    return {
                        filename,
                        id: quiz.id || `quiz_${stats.mtimeMs}`,
                        title: quiz.title || 'Untitled Quiz',
                        questionCount,
                        hasMedia,
                        createdAt: quiz.createdAt || stats.birthtime.toISOString(),
                        updatedAt: quiz.updatedAt || stats.mtime.toISOString()
                    };
                } catch (e) {
                    return null;
                }
            })
            .filter(q => q !== null)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        return { success: true, quizzes: files };
    } catch (error) {
        console.error('Error loading quizzes list:', error);
        return { success: false, error: error.message, quizzes: [] };
    }
});

// Load specific quiz
ipcMain.handle('load-quiz', async (event, filename) => {
    try {
        const filepath = path.join(quizzesPath, filename);
        
        if (!fs.existsSync(filepath)) {
            return { success: false, error: 'Quiz not found' };
        }
        
        const content = fs.readFileSync(filepath, 'utf-8');
        const quiz = JSON.parse(content);
        
        // Migrate old schema if needed
        const migratedQuiz = migrateQuizSchema(quiz);
        
        return { success: true, quiz: migratedQuiz };
    } catch (error) {
        console.error('Error loading quiz:', error);
        return { success: false, error: error.message };
    }
});

// Delete quiz
ipcMain.handle('delete-quiz', async (event, filename) => {
    try {
        const filepath = path.join(quizzesPath, filename);
        
        if (!fs.existsSync(filepath)) {
            return { success: false, error: 'Quiz not found' };
        }
        
        fs.unlinkSync(filepath);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting quiz:', error);
        return { success: false, error: error.message };
    }
});

// Save media file
ipcMain.handle('save-media', async (event, { data, originalName }) => {
    try {
        const ext = path.extname(originalName) || '.png';
        const uniqueName = `media_${Date.now()}${ext}`;
        const filepath = path.join(mediaPath, uniqueName);
        
        // Decode base64 data
        const base64Data = data.replace(/^data:image\/\w+;base64,|data:audio\/\w+;base64,|data:video\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        fs.writeFileSync(filepath, buffer);
        
        // Return relative path for storage in quiz
        return { 
            success: true, 
            url: `file://${filepath}`,
            path: filepath,
            type: getMediaType(ext)
        };
    } catch (error) {
        console.error('Error saving media:', error);
        return { success: false, error: error.message };
    }
});

// Load media file (returns base64 for embedding)
ipcMain.handle('load-media', async (event, filepath) => {
    try {
        if (!fs.existsSync(filepath)) {
            return { success: false, error: 'File not found' };
        }
        
        const content = fs.readFileSync(filepath);
        const base64 = content.toString('base64');
        const ext = path.extname(filepath).toLowerCase();
        
        let mimeType = 'application/octet-stream';
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
            mimeType = `image/${ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : ext.substring(1)}`;
        } else if (['.mp3', '.wav', '.ogg'].includes(ext)) {
            mimeType = `audio/${ext.substring(1)}`;
        } else if (['.mp4', '.webm'].includes(ext)) {
            mimeType = `video/${ext.substring(1)}`;
        }
        
        return { success: true, data: `data:${mimeType};base64,${base64}` };
    } catch (error) {
        console.error('Error loading media:', error);
        return { success: false, error: error.message };
    }
});

// Show save dialog for export
ipcMain.handle('show-save-dialog', async (event, { defaultPath }) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath,
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });
        
        if (result.canceled || !result.filePath) {
            return { success: false, canceled: true };
        }
        
        return { success: true, filePath: result.filePath };
    } catch (error) {
        console.error('Error showing save dialog:', error);
        return { success: false, error: error.message };
    }
});

// Show open dialog for import
ipcMain.handle('show-open-dialog', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });
        
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, canceled: true };
        }
        
        const content = fs.readFileSync(result.filePaths[0], 'utf-8');
        const quiz = JSON.parse(content);
        
        return { success: true, quiz: migrateQuizSchema(quiz) };
    } catch (error) {
        console.error('Error opening file:', error);
        return { success: false, error: error.message };
    }
});

// Save settings
ipcMain.handle('save-settings', async (event, settings) => {
    try {
        const settingsPath = path.join(userDataPath, 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error('Error saving settings:', error);
        return { success: false, error: error.message };
    }
});

// Load settings
ipcMain.handle('load-settings', async () => {
    try {
        const settingsPath = path.join(userDataPath, 'settings.json');
        
        if (!fs.existsSync(settingsPath)) {
            return { success: true, settings: getDefaultSettings() };
        }
        
        const content = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(content);
        
        // Merge with defaults for any missing keys
        const merged = { ...getDefaultSettings(), ...settings };
        
        return { success: true, settings: merged };
    } catch (error) {
        console.error('Error loading settings:', error);
        return { success: true, settings: getDefaultSettings() };
    }
});

// Helper functions
function getMediaType(ext) {
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const audioExts = ['.mp3', '.wav', '.ogg'];
    const videoExts = ['.mp4', '.webm', '.avi'];
    
    if (imageExts.includes(ext.toLowerCase())) return 'image';
    if (audioExts.includes(ext.toLowerCase())) return 'audio';
    if (videoExts.includes(ext.toLowerCase())) return 'video';
    return 'unknown';
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

function migrateQuizSchema(quiz) {
    // Schema version 1 -> 2 migration
    if (!quiz.schemaVersion) {
        quiz.schemaVersion = 2;
        quiz.id = `quiz_${Date.now()}`;
        quiz.createdAt = new Date().toISOString();
        quiz.updatedAt = new Date().toISOString();
        
        // Ensure all questions have proper structure
        if (quiz.questions) {
            quiz.questions = quiz.questions.map((q, index) => ({
                id: `q_${index}_${Date.now()}`,
                type: q.type || 'question',
                text: q.text || '',
                options: q.options || [],
                correctAnswerIndex: q.correctAnswerIndex || 0,
                media: q.media || null
            }));
        }
    }
    
    return quiz;
}
