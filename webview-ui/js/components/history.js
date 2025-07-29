/* ==========================================================================
   HISTORY (GEÇMİŞ) BİLEŞENİ
   Geçmiş panelinin açılıp kapanması ve içeriğinin doldurulması.
   ========================================================================== */
   
import * as DOM from '../dom.js';
import * as VsCode from '../vscode.js';

export function initHistory() {
    DOM.historyButton.addEventListener('click', () => {
        const isHidden = DOM.historyPanel.classList.toggle('hidden');
        if (!isHidden) {
            VsCode.postMessage('requestHistory');
        }
    });
}

export function populateHistory(history) {
    DOM.historyListContainer.innerHTML = '';
    if (!history || history.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'history-empty-message';
        emptyMessage.textContent = 'Henüz bir konuşma geçmişi yok.';
        DOM.historyListContainer.appendChild(emptyMessage);
        return;
    }

    history.forEach(conv => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.title = conv.title;
        card.dataset.id = conv.id;

        const title = document.createElement('span');
        title.textContent = conv.title;
        card.appendChild(title);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-chat-button';
        deleteButton.title = 'Sohbeti Sil';
        deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg>`;
        
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            VsCode.postMessage('deleteChat', { conversationId: conv.id });
        });
        card.appendChild(deleteButton);

        card.addEventListener('click', () => {
            VsCode.postMessage('switchChat', { conversationId: conv.id });
            DOM.historyPanel.classList.add('hidden');
        });

        DOM.historyListContainer.appendChild(card);
    });
}