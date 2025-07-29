import { API_SERVICES } from '../core/constants';

// A type for the names of available services
export type ApiServiceName = typeof API_SERVICES[keyof typeof API_SERVICES];

//================================================
// API and Service Types
//================================================

/** Defines the structure of a standard completion response from the vLLM API. */
export interface VllmCompletionResponse {
    choices: Array<{
        text: string;
    }>;
}

/** Defines the structure of a chat completion response from the vLLM API. */
export interface VllmChatCompletionResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

/** Defines the structure for a single message in the conversation history. */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/** Represents a single conversation session. */
export interface Conversation {
    id: string; 
    timestamp: number; 
    title: string; 
    messages: ChatMessage[];
}


/** * Defines the expected JSON response structure from the LLM after file analysis/modification.
 * (Used in ChatViewProvider)
 */
export interface AiResponse {
    intent: 'answer' | 'modify';
    explanation: string;
    fileName?: string; 
    modifiedCode: string;
}

//================================================
// VS Code Command and Webview Message Argument Types
//================================================

/** * YENİ: Webview'e fark (diff) görünümünü göstermek için gönderilecek veri yapısı.
 * Bu yapı, hem eski hem de yeni kodu ve değişikliğin uygulanması için
 * gerekli bağlamı içerir.
 */
export interface DiffData {
    originalCode: string;
    modifiedCode: string;
    // Değişikliğin tam bir dosyaya mı yoksa sadece bir seçime mi ait olduğunu belirtir.
    context: {
        type: 'file' | 'selection';
        // 'file' tipi için değiştirilecek dosyanın URI'si.
        fileUri?: string; 
        // 'selection' tipi için dosya URI'si ve seçim aralığı.
        selection?: {
            uri: string;
            range: [number, number, number, number];
        };
    };
}

/** * YENİ: Kullanıcı "Onayla" butonuna tıkladığında webview'den eklentiye gönderilecek 
 * veri yapısı. `DiffData`'yı tekrar içerir, böylece eklenti hangi değişikliği 
 * uygulayacağını bilir.
 */
export interface ApproveChangeArgs {
    diff: DiffData;
}


/** Defines the structure of arguments for the 'applyFix' command. */
export interface ApplyFixArgs {
  uri: string;
  diagnostic: {
    message: string;
    // [startLine, startChar, endLine, endChar]
    range: [number, number, number, number];
  };
}

/** Defines the structure of arguments for the 'modifyWithInput' command. */
export interface ModifyWithInputArgs {
    uri: string;
    // [startLine, startChar, endLine, endChar]
    range: [number, number, number, number];
}