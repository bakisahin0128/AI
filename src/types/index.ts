import * as vscode from 'vscode';
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

// YENİ EKLENDİ: Tek bir konuşma oturumunu temsil eder.
export interface Conversation {
    id: string; // Her konuşma için benzersiz ID
    timestamp: number; // Sıralama için oluşturulma zamanı
    title: string; // Konuşma başlığı (örn: ilk kullanıcı mesajı)
    messages: ChatMessage[]; // O konuşmaya ait mesajlar
}


/** * Defines the expected JSON response structure from the LLM after file analysis/modification.
 * (Used in ChatViewProvider)
 */
export interface AiResponse {
    intent: 'answer' | 'modify';
    explanation: string;
    fileName?: string; // YENİ: Değiştirilen dosyanın adını tutmak için eklendi.
    modifiedCode: string;
}

//================================================
// VS Code Command Argument Types
//================================================

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