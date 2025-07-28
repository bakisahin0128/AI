import axios from 'axios';
import * as vscode from 'vscode';
import { VllmCompletionResponse, VllmChatCompletionResponse, ChatMessage } from '../types';
import { EXTENSION_ID, SETTINGS_KEYS, VLLM_PARAMS } from '../core/constants';

/**
 * A service class to handle all API interactions with the vLLM server.
 */
export class VllmApiService {

    constructor() {}

    /**
     * Retrieves the active vLLM base URL from VS Code's configuration.
     * It relies on the default value defined in 'package.json'.
     * @returns The base URL string for the vLLM server.
     */
    public getBaseUrl(): string {
        const config = vscode.workspace.getConfiguration(EXTENSION_ID);
        // İkinci parametre (fallback) kaldırıldı. VS Code varsayılan değeri package.json'dan alacak.
        // '|| ""' ifadesi, olası bir 'undefined' durumuna karşı kodu güvenceye alır.
        return config.get<string>(SETTINGS_KEYS.vllmBaseUrl) || '';
    }

    /**
     * Retrieves the active model name from VS Code's configuration.
     * It relies on the default value defined in 'package.json'.
     * @returns The model name string.
     */
    public getModelName(): string {
        const config = vscode.workspace.getConfiguration(EXTENSION_ID);
        // İkinci parametre (fallback) kaldırıldı.
        return config.get<string>(SETTINGS_KEYS.vllmModelName) || '';
    }
    
    /**
     * Checks the connection to the vLLM server by sending a simple request.
     * @returns A promise that resolves to true if the connection is successful, otherwise false.
     */
    public async checkConnection(): Promise<boolean> {
        const url = `${this.getBaseUrl()}/models`;
        if (!url) return false; // Adres boşsa kontrol etme.

        try {
            await axios.get(url, { timeout: 3000 });
            return true;
        } catch (error) {
            console.error("vLLM Connection Check Error:", error);
            return false;
        }
    }

    /**
     * Generates content based on a single text prompt (for code completion, fixes, etc.).
     * @param prompt The input string to send to the model.
     * @returns A promise that resolves to the AI-generated text.
     */
    public async generateContent(prompt: string): Promise<string> {
        const url = `${this.getBaseUrl()}/completions`;
        const model = this.getModelName();

        if (!url || !model) {
            throw new Error('vLLM URL or Model Name is not configured.');
        }

        const data = {
            model: model,
            prompt: prompt,
            ...VLLM_PARAMS.completion
        };
        const headers = { 'Content-Type': 'application/json' };

        try {
            const response = await axios.post<VllmCompletionResponse>(url, data, { headers });
            if (response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].text;
            }
            throw new Error('Invalid response from vLLM server.');
        } catch (error: any) {
            console.error("vLLM API Error:", error.response ? error.response.data : error.message);
            throw new Error('An error occurred during the vLLM API request. Ensure the server is running and settings are correct.');
        }
    }
    
    /**
     * Generates content based on a conversation history (for chat interactions).
     * @param messages An array of chat messages representing the conversation history.
     * @returns A promise that resolves to the AI-generated chat message content.
     */
    public async generateChatContent(messages: ChatMessage[]): Promise<string> {
        const url = `${this.getBaseUrl()}/chat/completions`;
        const model = this.getModelName();

        if (!url || !model) {
            throw new Error('vLLM URL or Model Name is not configured.');
        }
        
        const data = {
            model: model,
            messages: messages,
            ...VLLM_PARAMS.chat
        };
        const headers = { 'Content-Type': 'application/json' };
        
        try {
            const response = await axios.post<VllmChatCompletionResponse>(url, data, { headers });
            if (response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            }
            throw new Error('Invalid chat response from vLLM server.');
        } catch (error: any) {
            console.error("vLLM Chat API Error:", error.response ? error.response.data : error.message);
            throw new Error('An error occurred during the vLLM API request. Ensure the server is running and settings are correct.');
        }
    }
}