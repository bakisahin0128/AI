// src/core/constants.ts

// --- Core Extension Identity ---
export const EXTENSION_NAME = 'İvme';
export const EXTENSION_ID = 'baykar-ai-fixer';
export const PUBLISHER_NAME = 'Baykar';

// --- API Service Configuration ---
export const API_SERVICES = {
    vllm: 'vLLM',
    gemini: 'Gemini'
};

// --- Command Identifiers ---
// Ayar komutları arayüze taşındığı için kaldırıldı.
export const COMMAND_IDS = {
    applyFix: `${EXTENSION_ID}.applyFix`,
    modifyWithInput: `${EXTENSION_ID}.modifyWithInput`,
    showChat: `baykar-ai.showChat`,
    sendToChat: `baykar-ai.sendToChat`,
    checkVllmStatus: `${EXTENSION_ID}.checkVllmStatus`, // Genel bağlantı kontrolü için kalabilir
};

// --- VS Code Settings Keys ---
// Bunlar ayarlara erişmek için anahtar görevi görür, olduğu gibi kalmalıdır.
export const SETTINGS_KEYS = {
    // General
    activeApiService: 'api.activeService',
    // vLLM
    vllmBaseUrl: 'vllm.baseUrl',
    vllmModelName: 'vllm.modelName',
    // Gemini
    geminiApiKey: 'gemini.apiKey',
    conversationHistoryLimit: 'chat.conversationHistoryLimit' 
};

// --- Gemini Model Adı ---
// Bu, kullanıcı tarafından değiştirilen bir varsayılan değil, kod içinde kullanılan
// sabit bir değer olduğu için burada kalabilir.
export const GEMINI_MODEL_NAME = 'gemini-2.0-flash';

// --- API Parameters ---
// Bunlar kullanıcı ayarı değil, API'ye gönderilen sabit parametrelerdir. Burada kalmaları doğrudur.
export const VLLM_PARAMS = {
    completion: { max_tokens: 2048, temperature: 0.1 },
    chat: { max_tokens: 2048, temperature: 0.7 }
};

export const GEMINI_PARAMS = {
    completion: { maxOutputTokens: 2048, temperature: 0.1 },
    chat: { maxOutputTokens: 2048, temperature: 0.7 }
};

// --- User Interface Messages ---
// Kullanıcıya gösterilen mesajlar burada kalabilir.
export const UI_MESSAGES = {
    thinking: `${EXTENSION_NAME} düşünüyor...`,
    codeFixed: `Kod, ${EXTENSION_NAME} ile başarıyla düzeltildi!`,
    codeModified: `Kod, ${EXTENSION_NAME} ile başarıyla düzenlendi!`,
    vllmConnectionError: `${EXTENSION_NAME} yerel LLM sunucusuna bağlanamadı. Lütfen sohbet panelindeki ayarları kontrol edin.`,
    geminiConnectionError: `${EXTENSION_NAME} Gemini API'ye bağlanamadı. Lütfen API anahtarınızı sohbet panelindeki ayarlardan kontrol edin.`,
    apiServiceSwitched: (service: string) => `Aktif servis ${service} olarak değiştirildi.`,
    activeService: (service: string) => `Aktif Servis: ${service}`,
    // Eski prompt mesajları artık kullanılmadığı için kaldırılabilir veya saklanabilir.
    vllmStatusChecking: 'vLLM sunucu durumu kontrol ediliyor...',
    vllmStatusSuccess: 'vLLM sunucusuyla bağlantı başarılı!',
    vllmStatusError: 'vLLM sunucusuna ulaşılamadı. Lütfen adresin doğru olduğundan ve sunucunun çalıştığından emin olun.',
    vllmModelSuccess: 'vLLM model adı başarıyla kaydedildi.',
    geminiApiKeySuccess: 'Gemini API anahtarı başarıyla kaydedildi.',
};