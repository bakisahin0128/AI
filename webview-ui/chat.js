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

const AI_ICON_URI = chatContainer.dataset.aiIconUri;
const USER_ICON_URI = chatContainer.dataset.userIconUri;

function addMessage(text, className) {
    if (welcomeContainer.style.display !== 'none') {
        welcomeContainer.style.display = 'none';
    }

    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + className;

    const iconElement = document.createElement('img');
    iconElement.className = 'avatar-icon';
    iconElement.src = (className === 'ai-message') ? AI_ICON_URI : USER_ICON_URI;
    messageElement.appendChild(iconElement);

    const contentElement = document.createElement('div');

    if (className === 'ai-message') {
        // AI mesajını Markdown olarak işle ve HTML'e çevir
        contentElement.innerHTML = marked.parse(text);

        // YENİ: KOD BLOKLARINA KOPYALA BUTONU EKLEME
        // Markdown'dan oluşturulan tüm kod bloklarını bul
        contentElement.querySelectorAll('pre code').forEach(codeBlock => {
            const preElement = codeBlock.parentElement; // <pre> etiketini al
            
            // pre elementini yeni bir konteyner içine taşı
            const container = document.createElement('div');
            container.className = 'code-block-container';
            // pre elementini DOM'da container ile değiştir ve sonra pre'yi container'ın içine ekle
            preElement.parentNode.replaceChild(container, preElement);
            container.appendChild(preElement);

            // Kopyala butonunu oluştur
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.textContent = 'Kopyala';

            // Butona tıklama olayını ekle
            copyButton.addEventListener('click', () => {
                const codeToCopy = codeBlock.textContent;
                navigator.clipboard.writeText(codeToCopy).then(() => {
                    copyButton.textContent = 'Kopyalandı!';
                    setTimeout(() => {
                        copyButton.textContent = 'Kopyala';
                    }, 2000); // 2 saniye sonra eski haline dön
                }).catch(err => {
                    console.error('Kopyalama başarısız oldu:', err);
                    copyButton.textContent = 'Hata!';
                });
            });

            // Butonu konteyner'a ekle
            container.appendChild(copyButton);
        });

    } else {
        // Kullanıcı mesajını düz metin olarak işle
        contentElement.className = 'text-content';
        contentElement.textContent = text;
    }
    
    messageElement.appendChild(contentElement);
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ... (sendMessage ve diğer event listener'lar aynı kalıyor)
function sendMessage() {
    const text = input.value;
    if (text.trim() === '') return;
    addMessage(text, 'user-message');
    input.value = '';
    vscode.postMessage({ type: 'askGemini', value: text });
}
sendButton.addEventListener('click', sendMessage);
input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});
window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'addResponse') {
        addMessage(message.value, 'ai-message');
    }
});