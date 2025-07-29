/* ==========================================================================
   OLAY YÖNETİCİLERİ (EVENT HANDLERS)
   Kullanıcı etkileşimlerini ve eklentiden gelen mesajları yönetir.
   ========================================================================== */

import * as DOM from './dom.js';
import * as UI from './ui.js';
import * as VsCode from './vscode.js';
import { populateHistory } from './components/history.js';
import { loadConfig } from './components/settings.js';

function handleSendMessage() {
    if (UI.getAiRespondingState()) return;
    const text = DOM.input.value;
    if (text.trim() === '') return;

    UI.addUserMessage(text);
    DOM.input.value = '';
    VsCode.postMessage('askAI', text);
    UI.setInputEnabled(false);
}

export function initEventHandlers() {
    DOM.sendButton.addEventListener('click', handleSendMessage);
    DOM.input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });

    DOM.newChatButton.addEventListener('click', () => {
        if (UI.getAiRespondingState()) return;
        VsCode.postMessage('newChat');
    });

    DOM.attachFileButton.addEventListener('click', () => {
        if (UI.getAiRespondingState()) return;
        VsCode.postMessage('requestFileUpload');
    });
}

export function initMessageListener() {
    VsCode.onMessage(message => {
        const data = message.payload ?? message.value;
        
        switch (message.type) {
            case 'addResponse':
                UI.showAiResponse(data);
                UI.setInputEnabled(true);
                break;
            // DEĞİŞİKLİK: 'fileContextSet' artık bir dizi dosya adı alıyor.
            case 'fileContextSet': 
                UI.displayFileTags(message.fileNames); 
                break;
            case 'clearContext':
            case 'clearFileContext':
                UI.clearFileTag(); 
                break;
            case 'loadConfig':
                loadConfig(data);
                break;
            case 'loadHistory':
                populateHistory(data);
                break;
            case 'clearChat':
                UI.clearChat();
                break;
            case 'loadConversation':
                UI.loadConversation(data);
                break;
            case 'contextSet': 
                 UI.addAiMessage(data); 
                 DOM.input.placeholder = data;
                 break;
        }
    });
}