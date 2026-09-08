const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Quiz Management
    saveQuiz: (quizData) => ipcRenderer.invoke('save-quiz', quizData),
    updateQuiz: (quizData) => ipcRenderer.invoke('update-quiz', quizData),
    getQuizzesList: () => ipcRenderer.invoke('get-quizzes-list'),
    loadQuiz: (filename) => ipcRenderer.invoke('load-quiz', filename),
    deleteQuiz: (filename) => ipcRenderer.invoke('delete-quiz', filename),
    
    // Media Handling
    saveMedia: (data, originalName) => ipcRenderer.invoke('save-media', { data, originalName }),
    loadMedia: (filepath) => ipcRenderer.invoke('load-media', filepath),
    
    // File Dialogs
    showSaveDialog: (defaultPath) => ipcRenderer.invoke('show-save-dialog', { defaultPath }),
    showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
    
    // Settings
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    
    // Platform info
    platform: process.platform
});
