/* ==========================================================================
   OLAY YÖNETİCİLERİ (EVENT HANDLERS)
   Kullanıcı etkileşimlerini ve eklentiden gelen mesajları yönetir.
   ========================================================================== */

import * as DOM from './dom.js';
import * as UI from './ui.js';
import * as VsCode from './vscode.js';
import { populateHistory } from './components/history.js';
import { loadConfig } from './components/settings.js';

// Onaylanmayı bekleyen diff verisini tutmak için bir değişken.
let pendingDiffData = null;

function handleSendMessage() {
    if (UI.getAiRespondingState()) return;
    const text = DOM.input.value;
    if (text.trim() === '') return;

    UI.addUserMessage(text);
    DOM.input.value = '';
    VsCode.postMessage('askAI', text);
    UI.setInputEnabled(false);
}

// Onay butonuna tıklandığında çalışacak fonksiyon.
function handleApproveChange() {
    if (pendingDiffData) {
        VsCode.postMessage('approveChange', { diff: pendingDiffData });
        // Butonları geçici olarak devre dışı bırak, eklentiden yanıt bekleniyor.
        DOM.approveChangeButton.disabled = true;
        DOM.rejectChangeButton.disabled = true;
        DOM.approveChangeButton.textContent = 'Uygulanıyor...';
    }
}

// Reddet veya Kapat butonuna tıklandığında çalışacak fonksiyon.
function handleRejectOrCloseChange() {
    pendingDiffData = null;
    UI.hideDiffView();
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

    // Diff görünümü butonları için olay dinleyicileri
    DOM.approveChangeButton.addEventListener('click', handleApproveChange);
    DOM.rejectChangeButton.addEventListener('click', handleRejectOrCloseChange);
    DOM.closeDiffButton.addEventListener('click', handleRejectOrCloseChange);
}

export function initMessageListener() {
    VsCode.onMessage(message => {
        const data = message.payload ?? message.value;
        
        switch (message.type) {
            case 'addResponse':
                UI.showAiResponse(data);
                UI.setInputEnabled(true);
                break;
            
            case 'showDiff':
                pendingDiffData = data; // Onay bekleyen veriyi sakla
                UI.showDiffView(data);
                break;

            case 'changeApproved':
                handleRejectOrCloseChange(); // Diff görünümünü gizle ve sıfırla
                UI.addAiMessage("Değişiklik başarıyla uygulandı!");
                // Butonları tekrar eski haline getir.
                DOM.approveChangeButton.disabled = false;
                DOM.rejectChangeButton.disabled = false;
                DOM.approveChangeButton.textContent = 'Değişikliği Onayla';
                break;

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