// webview-ui/chat.js

const vscode = acquireVsCodeApi();

// marked.js ve Highlight.js entegrasyonu
marked.setOptions({
    highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-'
});

const chatContainer = document.getElementById('chat-container');
const input = document.getElementById('prompt-input');
const sendButton = document.getElementById('send-button');
const welcomeContainer = document.getElementById('welcome-container');
const attachFileButton = document.getElementById('attach-file-button');
const fileContextArea = document.getElementById('file-context-area');

const AI_ICON_URI = chatContainer.dataset.aiIconUri;
const USER_ICON_URI = chatContainer.dataset.userIconUri;

/**
 * Normal bir kullanıcı mesajı ekler.
 * @param {string} text Mesaj metni
 */
function addUserMessage(text) {
    if (welcomeContainer.style.display !== 'none') {
        welcomeContainer.style.display = 'none';
    }
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message fade-in'; 
    
    const avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'avatar-wrapper';
    const iconElement = document.createElement('img');
    iconElement.className = 'avatar-icon';
    iconElement.src = USER_ICON_URI;
    avatarWrapper.appendChild(iconElement);
    messageElement.appendChild(avatarWrapper);

    const contentElement = document.createElement('div');
    contentElement.textContent = text;
    messageElement.appendChild(contentElement);

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Yapay zeka cevap verirken animasyonlu bir yer tutucu gösterir.
 */
function showAiLoadingIndicator() {
    if (welcomeContainer.style.display !== 'none') {
        welcomeContainer.style.display = 'none';
    }
    const messageElement = document.createElement('div');
    messageElement.id = 'ai-loading-placeholder';
    messageElement.className = 'message ai-message';

    const avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'avatar-wrapper loading';
    const iconElement = document.createElement('img');
    iconElement.className = 'avatar-icon';
    iconElement.src = AI_ICON_URI;
    avatarWrapper.appendChild(iconElement);
    messageElement.appendChild(avatarWrapper);

    const contentElement = document.createElement('div');
    contentElement.innerHTML = '<i>Yapay zeka düşünüyor...</i>';
    messageElement.appendChild(contentElement);

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Yüklenme animasyonunu kaldırır ve gelen cevabı "yazarak" gösterir.
 * @param {string} responseText Yapay zekadan gelen Markdown metni
 */
function showAiResponse(responseText) {
    const loadingElement = document.getElementById('ai-loading-placeholder');
    if (!loadingElement) {
        addAiMessage(responseText);
        return;
    }

    const avatarWrapper = loadingElement.querySelector('.avatar-wrapper');
    avatarWrapper?.classList.remove('loading');

    const contentElement = loadingElement.querySelector('div:not(.avatar-wrapper)');
    if (contentElement) {
        // GÜNCELLENDİ: İçeriği temizle ve yazma efektini başlat
        contentElement.innerHTML = ''; 
        typeWriterEffect(responseText, contentElement);
    }
    
    loadingElement.id = '';
}

/**
 * GÜNCELLENDİ: Metni daktilo efektiyle yazan fonksiyon.
 * Markdown'ı HTML'e çevirir ve elementleri tek tek ekler.
 * @param {string} markdownText 
 * @param {HTMLElement} containerElement 
 */
function typeWriterEffect(markdownText, containerElement) {
    // 1. Markdown'ı HTML'e çevir ve geçici bir div'e koy
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = marked.parse(markdownText);

    // 2. Cevabı oluşturan tüm ana elementleri (p, pre, ul, vb.) al
    const children = Array.from(tempDiv.children);
    let i = 0;

    function appendNextElement() {
        if (i < children.length) {
            const element = children[i];
            element.classList.add('fade-in'); // Her elemente animasyon class'ı ekle
            containerElement.appendChild(element);

            // Eğer eklenen element bir kod bloğu ise kopyalama butonunu ekle
            if (element.tagName === 'PRE') {
                addCopyButtonsToCodeBlocks(containerElement);
            }
            
            // Sohbeti en alta kaydır
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            i++;
            // Bir sonraki elementi küçük bir gecikmeyle ekle
            setTimeout(appendNextElement, 150); 
        }
    }

    appendNextElement();
}


/**
 * Verilen bir element içindeki tüm kod bloklarına kopyalama butonu ekler.
 * @param {HTMLElement} element 
 */
function addCopyButtonsToCodeBlocks(element) {
    element.querySelectorAll('pre:not(:has(.copy-button))').forEach(preElement => {
        const container = document.createElement('div');
        container.className = 'code-block-container';
        preElement.parentNode.replaceChild(container, preElement);
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

/**
 * Normal bir AI mesajı ekler (yer tutucu veya animasyon olmadan).
 * @param {string} text Mesaj metni
 */
function addAiMessage(text) {
     if (welcomeContainer.style.display !== 'none') {
        welcomeContainer.style.display = 'none';
    }
    const messageElement = document.createElement('div');
    messageElement.className = 'message ai-message fade-in';

    const avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'avatar-wrapper';
    const iconElement = document.createElement('img');
    iconElement.className = 'avatar-icon';
    iconElement.src = AI_ICON_URI;
    avatarWrapper.appendChild(iconElement);
    messageElement.appendChild(avatarWrapper);

    const contentElement = document.createElement('div');
    contentElement.innerHTML = marked.parse(text);
    addCopyButtonsToCodeBlocks(contentElement);
    messageElement.appendChild(contentElement);

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}


// --- Dosya Etiketi Fonksiyonları ---
function displayFileTag(fileName) {
    fileContextArea.innerHTML = '';
    const tagElement = document.createElement('div');
    tagElement.className = 'file-tag';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = fileName;
    tagElement.appendChild(nameSpan);
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-file-button';
    removeButton.title = 'Dosyayı Kaldır';
    removeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z" /></svg>`;
    removeButton.addEventListener('click', () => vscode.postMessage({ type: 'clearFileContext' }));
    tagElement.appendChild(removeButton);
    fileContextArea.appendChild(tagElement);
    input.placeholder = `${fileName} hakkında bir talimat girin...`;
}

function clearFileTag() {
    fileContextArea.innerHTML = '';
    input.placeholder = 'Bir soru sorun veya dosya ekleyin...';
}

// --- Ana Event Listener'lar ---
function handleSendMessage() {
    const text = input.value;
    if (text.trim() === '') return;

    addUserMessage(text);
    showAiLoadingIndicator();
    
    input.value = '';
    vscode.postMessage({ type: 'askGemini', value: text });
}

sendButton.addEventListener('click', handleSendMessage);
input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
    }
});
attachFileButton.addEventListener('click', () => {
    vscode.postMessage({ type: 'requestFileUpload' });
});

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'addResponse':
            showAiResponse(message.value);
            break;
        case 'contextSet':
            clearFileTag();
            addAiMessage(message.value);
            input.placeholder = message.value;
            break;
        case 'fileContextSet':
            displayFileTag(message.fileName);
            break;
        case 'clearContext':
            clearFileTag();
            break;
    }
});
