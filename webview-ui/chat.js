// webview-ui/chat.js
(function () {
    const vscode = acquireVsCodeApi();

    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-'
    });

    // --- DOM Element References ---
    const chatContainer = document.getElementById('chat-container');
    const input = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const welcomeContainer = document.getElementById('welcome-container');
    const attachFileButton = document.getElementById('attach-file-button');
    const fileContextArea = document.getElementById('file-context-area');

    // YENİ: Settings Modal Elements
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const settingsForm = document.getElementById('settings-form');
    const cancelSettingsButton = document.getElementById('cancel-settings-button');
    const serviceSelect = document.getElementById('service-select');
    const vllmSettings = document.getElementById('vllm-settings');
    const vllmUrlInput = document.getElementById('vllm-url');
    const vllmModelInput = document.getElementById('vllm-model');
    const geminiSettings = document.getElementById('gemini-settings');
    const geminiKeyInput = document.getElementById('gemini-key');
    
    // --- Icon URIs ---
    const AI_ICON_URI = chatContainer.dataset.aiIconUri;
    const USER_ICON_URI = chatContainer.dataset.userIconUri;

    // --- Settings Modal Logic ---
    settingsButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'requestConfig' });
        settingsModal.classList.remove('hidden');
    });

    function closeModal() {
        settingsModal.classList.add('hidden');
    }

    cancelSettingsButton.addEventListener('click', closeModal);
    settingsModal.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            closeModal();
        }
    });

    serviceSelect.addEventListener('change', () => {
        if (serviceSelect.value === 'Gemini') {
            vllmSettings.classList.add('hidden');
            geminiSettings.classList.remove('hidden');
        } else {
            vllmSettings.classList.remove('hidden');
            geminiSettings.classList.add('hidden');
        }
    });

    settingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const settings = {
            activeApiService: serviceSelect.value,
            vllmBaseUrl: vllmUrlInput.value,
            vllmModelName: vllmModelInput.value,
            geminiApiKey: geminiKeyInput.value
        };
        vscode.postMessage({ type: 'saveSettings', payload: settings });
        closeModal();
    });

    // --- Message and UI Functions (Mevcut fonksiyonlarınız burada) ---
    function addUserMessage(text) { /* ... mevcut kod ... */ }
    function showAiLoadingIndicator() { /* ... mevcut kod ... */ }
    function showAiResponse(responseText) { /* ... mevcut kod ... */ }
    function typeWriterEffect(markdownText, containerElement) { /* ... mevcut kod ... */ }
    function addCopyButtonsToCodeBlocks(element) { /* ... mevcut kod ... */ }
    function addAiMessage(text) { /* ... mevcut kod ... */ }
    function displayFileTag(fileName) { /* ... mevcut kod ... */ }
    function clearFileTag() { /* ... mevcut kod ... */ }

    // --- Main Event Listeners ---
    function handleSendMessage() {
        const text = input.value;
        if (text.trim() === '') return;
        addUserMessage(text);
        showAiLoadingIndicator();
        input.value = '';
        vscode.postMessage({ type: 'askAI', value: text });
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

    // Listen for messages from the extension backend.
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
            // YENİ: Load config from extension and populate form
            case 'loadConfig':
                const config = message.payload;
                vllmUrlInput.value = config.vllmBaseUrl;
                vllmModelInput.value = config.vllmModelName;
                geminiKeyInput.value = config.geminiApiKey;
                serviceSelect.value = config.activeApiService;
                serviceSelect.dispatchEvent(new Event('change')); // Trigger change to show correct section
                break;
        }
    });

    // --- Mevcut Fonksiyonların Gövdelerini Buraya Kopyalayın ---
    // (addUserMessage, showAiLoadingIndicator vb. fonksiyonların tam kodlarını
    // yukarıdaki `/* ... mevcut kod ... */` yorumları yerine yapıştırın)
    
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
            contentElement.innerHTML = ''; 
            typeWriterEffect(responseText, contentElement);
        }
        loadingElement.id = '';
    }

    function typeWriterEffect(markdownText, containerElement) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = marked.parse(markdownText);
        const children = Array.from(tempDiv.children);
        let i = 0;
        function appendNextElement() {
            if (i < children.length) {
                const element = children[i];
                element.classList.add('fade-in');
                containerElement.appendChild(element);
                if (element.tagName === 'PRE') {
                    addCopyButtonsToCodeBlocks(containerElement);
                }
                chatContainer.scrollTop = chatContainer.scrollHeight;
                i++;
                setTimeout(appendNextElement, 150); 
            }
        }
        appendNextElement();
    }

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
}());