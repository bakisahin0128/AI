/* ==========================================================================
   DOM ELEMENT REFERANSLARI
   Tüm DOM sorguları burada toplanır ve diğer modüllere sağlanır.
   ========================================================================== */

export const vscode = acquireVsCodeApi();

// --- Ana Konteynerler ve Alanlar ---
export const chatContainer = document.getElementById('chat-container');
export const welcomeContainer = document.getElementById('welcome-container');
export const input = document.getElementById('prompt-input');
export const fileContextArea = document.getElementById('file-context-area');

// --- Butonlar ---
export const newChatButton = document.getElementById('new-chat-button');
export const historyButton = document.getElementById('history-button');
export const settingsButton = document.getElementById('settings-button');
export const sendButton = document.getElementById('send-button');
export const attachFileButton = document.getElementById('attach-file-button');

// --- Geçmiş Paneli ---
export const historyPanel = document.getElementById('history-panel');
export const historyListContainer = document.getElementById('history-list-container');

// --- Ayarlar Modalı Elementleri ---
export const settingsModal = document.getElementById('settings-modal');
export const settingsForm = document.getElementById('settings-form');
export const cancelSettingsButton = document.getElementById('cancel-settings-button');
export const serviceSelect = document.getElementById('service-select');
export const vllmSettings = document.getElementById('vllm-settings');
export const vllmUrlInput = document.getElementById('vllm-url');
export const vllmModelInput = document.getElementById('vllm-model');
export const geminiSettings = document.getElementById('gemini-settings');
export const geminiKeyInput = document.getElementById('gemini-key');
export const historyLimitInput = document.getElementById('history-limit');
export const navButtons = document.querySelectorAll('.nav-button');
export const settingsPanes = document.querySelectorAll('.settings-pane');

// --- Fark (Diff) Görünümü Elementleri ---
export const diffContainer = document.getElementById('diff-container');
// GÜNCELLEME: İki ayrı blok referansı yerine tek bir birleşik blok referansı
export const unifiedDiffCodeBlock = document.getElementById('unified-diff-code-block');
export const approveChangeButton = document.getElementById('approve-change-button');
export const rejectChangeButton = document.getElementById('reject-change-button');
export const closeDiffButton = document.getElementById('close-diff-button');


// --- İkon URI'ları ---
export const AI_ICON_URI = chatContainer.dataset.aiIconUri;
export const USER_ICON_URI = chatContainer.dataset.userIconUri;