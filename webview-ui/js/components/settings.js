/* ==========================================================================
   SETTINGS (AYARLAR) BİLEŞENİ
   Ayarlar modalının tüm işlevselliğini yönetir.
   ========================================================================== */
   
import * as DOM from '../dom.js';
import * as VsCode from '../vscode.js';

function closeModal() {
    DOM.settingsModal.classList.add('hidden');
}

function handleServiceChange() {
    DOM.vllmSettings.classList.toggle('hidden', DOM.serviceSelect.value === 'Gemini');
    DOM.geminiSettings.classList.toggle('hidden', DOM.serviceSelect.value !== 'Gemini');
}

export function initSettings() {
    DOM.settingsButton.addEventListener('click', () => {
        VsCode.postMessage('requestConfig');
        DOM.settingsModal.classList.remove('hidden');
    });

    DOM.cancelSettingsButton.addEventListener('click', closeModal);
    DOM.settingsModal.addEventListener('click', (event) => {
        if (event.target === DOM.settingsModal) closeModal();
    });

    DOM.navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentActiveButton = document.querySelector('.nav-button.active');
            if (currentActiveButton === button) return;
            
            document.querySelector('.settings-pane.active')?.classList.remove('active');
            currentActiveButton?.classList.remove('active');

            button.classList.add('active');
            document.getElementById(button.dataset.target).classList.add('active');
        });
    });

    DOM.serviceSelect.addEventListener('change', handleServiceChange);

    DOM.settingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const settingsPayload = {
            activeApiService: DOM.serviceSelect.value,
            vllmBaseUrl: DOM.vllmUrlInput.value,
            vllmModelName: DOM.vllmModelInput.value,
            geminiApiKey: DOM.geminiKeyInput.value,
            conversationHistoryLimit: DOM.historyLimitInput.value
        };
        VsCode.postMessage('saveSettings', settingsPayload);
        closeModal();
    });
}

export function loadConfig(config) {
    DOM.vllmUrlInput.value = config.vllmBaseUrl;
    DOM.vllmModelInput.value = config.vllmModelName;
    DOM.geminiKeyInput.value = config.geminiApiKey;
    DOM.historyLimitInput.value = config.conversationHistoryLimit;
    DOM.serviceSelect.value = config.activeApiService;
    handleServiceChange(); // Değişikliği yansıtmak için tetikle
}