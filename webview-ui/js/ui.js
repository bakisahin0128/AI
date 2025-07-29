/* ==========================================================================
   ARAYÜZ (UI) YÖNETİM MODÜLÜ
   DOM'u güncelleyen, mesajları ekleyen/silen tüm fonksiyonları içerir.
   YENİ: Diff görünümünü yönetir ve satır-satır fark oluşturur.
   ========================================================================== */

import * as DOM from './dom.js';
import { postMessage } from './vscode.js';

let isAiResponding = false;
let isDiffViewActive = false; 

export const getAiRespondingState = () => isAiResponding || isDiffViewActive;

export function setInputEnabled(enabled) {
    const isActuallyEnabled = enabled && !isDiffViewActive;
    isAiResponding = !enabled;

    DOM.input.disabled = !isActuallyEnabled;
    DOM.sendButton.disabled = !isActuallyEnabled;

    if (isActuallyEnabled) {
        const fileTags = DOM.fileContextArea.querySelectorAll('.file-tag');
        if (fileTags.length > 0) {
            DOM.input.placeholder = `${fileTags.length} dosya hakkında bir talimat girin...`;
        } else {
            DOM.input.placeholder = 'Bir soru sorun veya dosya ekleyin...';
        }
        DOM.sendButton.style.opacity = '1';
        DOM.sendButton.style.cursor = 'pointer';
        DOM.input.focus();
    } else if (isDiffViewActive) {
        DOM.input.placeholder = 'Lütfen önerilen değişikliği onaylayın veya reddedin.';
        DOM.sendButton.style.opacity = '0.5';
        DOM.sendButton.style.cursor = 'not-allowed';
    } 
    else {
        DOM.input.placeholder = 'İvme yanıtlıyor, lütfen bekleyin...';
        DOM.sendButton.style.opacity = '0.5';
        DOM.sendButton.style.cursor = 'not-allowed';
    }
}

function addCopyButtonsToCodeBlocks(element) {
    element.querySelectorAll('pre').forEach(preElement => {
        if (preElement.querySelector('.copy-button')) return;
        const container = document.createElement('div');
        container.className = 'code-block-container';

        const parent = preElement.parentNode;
        if(parent) parent.replaceChild(container, preElement);
        container.appendChild(preElement);
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Kopyala';
        copyButton.addEventListener('click', () => {
            const codeToCopy = preElement.querySelector('code').textContent;
            navigator.clipboard.writeText(codeToCopy).then(() => {
                copyButton.textContent = 'Kopyalandı!';
                setTimeout(() => { copyButton.textContent = 'Kopyala'; }, 2000);
            });
        });
        container.appendChild(copyButton);
    });
}

function createMessageElement(role, content) {
    if (DOM.welcomeContainer.classList.contains('hidden') === false) {
        DOM.welcomeContainer.classList.add('hidden');
        DOM.chatContainer.classList.remove('hidden');
    }

    const messageElement = document.createElement('div');
    messageElement.className = `message ${role}-message fade-in`;

    const avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'avatar-wrapper';
    const iconElement = document.createElement('img');
    iconElement.className = 'avatar-icon';
    iconElement.src = role === 'user' ? DOM.USER_ICON_URI : DOM.AI_ICON_URI;
    avatarWrapper.appendChild(iconElement);
    messageElement.appendChild(avatarWrapper);

    const contentElement = document.createElement('div');
    contentElement.innerHTML = content;
    if (role === 'assistant') {
        addCopyButtonsToCodeBlocks(contentElement);
    }
    messageElement.appendChild(contentElement);

    DOM.chatContainer.appendChild(messageElement);
    DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
    return messageElement;
}

export function addUserMessage(text) {
    const p = document.createElement('p');
    p.textContent = text;
    createMessageElement('user', p.outerHTML);
    showAiLoadingIndicator();
}

export function addAiMessage(text) {
    const parsedContent = marked.parse(text);
    createMessageElement('assistant', parsedContent);
}

export function showAiLoadingIndicator() {
    if (document.getElementById('ai-loading-placeholder')) return;
    const messageElement = createMessageElement('assistant', '<i>İvme düşünüyor...</i>');
    messageElement.id = 'ai-loading-placeholder';
    messageElement.querySelector('.avatar-wrapper').classList.add('loading');
}

export function showAiResponse(responseText) {
    const loadingElement = document.getElementById('ai-loading-placeholder');
    if (!loadingElement) {
        addAiMessage(responseText);
        return;
    }
    loadingElement.querySelector('.avatar-wrapper')?.classList.remove('loading');
    const contentElement = loadingElement.querySelector('div:not(.avatar-wrapper)');
    if (contentElement) {
        contentElement.innerHTML = marked.parse(responseText);
        addCopyButtonsToCodeBlocks(contentElement);
    }
    loadingElement.id = '';
    DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
}

export function displayFileTags(fileNames) {
    DOM.fileContextArea.innerHTML = '';
    fileNames.forEach(fileName => {
        const tagElement = document.createElement('div');
        tagElement.className = 'file-tag';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = fileName;
        tagElement.appendChild(nameSpan);
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-file-button';
        removeButton.title = 'Dosyayı Kaldır';
        removeButton.dataset.fileName = fileName;
        removeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"></path></svg>`;
        removeButton.addEventListener('click', (event) => {
            if(getAiRespondingState()) return;
            const fileToRemove = event.currentTarget.dataset.fileName;
            postMessage('removeFileContext', { fileName: fileToRemove });
        });
        tagElement.appendChild(removeButton);
        DOM.fileContextArea.appendChild(tagElement);
    });
    DOM.input.placeholder = `${fileNames.length} dosya hakkında bir talimat girin...`;
}

export function clearFileTag() {
    DOM.fileContextArea.innerHTML = '';
    DOM.input.placeholder = 'Bir soru sorun veya dosya ekleyin...';
}

export function clearChat() {
    DOM.chatContainer.innerHTML = '';
    DOM.chatContainer.classList.add('hidden');
    DOM.welcomeContainer.classList.remove('hidden');
    hideDiffView();
}

export function loadConversation(messages) {
    clearChat();
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    if (conversationMessages.length > 0) {
        DOM.welcomeContainer.classList.add('hidden');
        DOM.chatContainer.classList.remove('hidden');
        conversationMessages.forEach(msg => {
            const content = (msg.role === 'assistant') ? marked.parse(msg.content) : `<p>${msg.content}</p>`;
            createMessageElement(msg.role, content);
        });
    }
}


// --- GÜNCELLENMİŞ Diff Fonksiyonları ---

/**
 * İki metin arasındaki satır bazlı farkları oluşturan basit bir fonksiyon.
 * @param {string} oldText - Eski metin.
 * @param {string} newText - Yeni metin.
 * @returns {string} Diff formatında birleştirilmiş metin.
 */
function createUnifiedDiff(oldText, newText) {
    const oldLines = oldText.split(/\r?\n/);
    const newLines = newText.split(/\r?\n/);
    const maxLen = Math.max(oldLines.length, newLines.length);
    const diffLines = [];

    for (let i = 0; i < maxLen; i++) {
        const oldLine = oldLines[i];
        const newLine = newLines[i];

        if (oldLine !== undefined && oldLine !== newLine) {
            if(oldLine.trim() !== '') {
                 diffLines.push(`- ${oldLine}`);
            }
        }
        if (newLine !== undefined && oldLine !== newLine) {
            if(newLine.trim() !== '') {
                 diffLines.push(`+ ${newLine}`);
            }
        }
        if (oldLine !== undefined && oldLine === newLine) {
            diffLines.push(`  ${oldLine}`);
        }
    }
    return diffLines.join('\n');
}

/**
 * Fark görünümünü (diff view) gösterir ve kod bloklarını doldurur.
 * @param {object} diffData - Orijinal ve değiştirilmiş kodları içeren veri.
 */
export function showDiffView(diffData) {
    const loadingElement = document.getElementById('ai-loading-placeholder');
    if (loadingElement) {
       loadingElement.remove();
    }
    
    const unifiedDiff = createUnifiedDiff(diffData.originalCode, diffData.modifiedCode);
    
    // GÜNCELLEME: Tek bir kod bloğunu dolduruyoruz.
    DOM.unifiedDiffCodeBlock.textContent = unifiedDiff;
    
    // highlight.js'in yeni kodları 'diff' diline göre renklendirmesini sağla
    hljs.highlightElement(DOM.unifiedDiffCodeBlock);

    DOM.diffContainer.classList.remove('hidden');
    isDiffViewActive = true;
    setInputEnabled(false);
}

/**
 * Fark görünümünü (diff view) gizler ve durumu sıfırlar.
 */
export function hideDiffView() {
    DOM.diffContainer.classList.add('hidden');
    // GÜNCELLEME: Tek kod bloğunu temizliyoruz.
    DOM.unifiedDiffCodeBlock.textContent = '';
    isDiffViewActive = false;
    setInputEnabled(true);
}