import * as vscode from 'vscode';
import { VllmApiService } from './VllmApiService';
import { GeminiApiService } from './GeminiApiService';
import { EXTENSION_ID, SETTINGS_KEYS, API_SERVICES } from '../core/constants';
import { ApiServiceName, ChatMessage } from '../types';

// Define a common interface that both services will adhere to.
export interface IApiService {
    checkConnection(): Promise<boolean>;
    generateContent(prompt: string): Promise<string>;
    generateChatContent(messages: ChatMessage[]): Promise<string>;
}

/**
 * Manages the active AI service (vLLM or Gemini) and delegates API calls.
 * This class ensures that the rest of the extension doesn't need to know
 * which service is currently active.
 */
export class ApiServiceManager {
    private vllmService: VllmApiService;
    private geminiService: GeminiApiService;
    private _activeServiceName: ApiServiceName;

    constructor() {
        this.vllmService = new VllmApiService();
        this.geminiService = new GeminiApiService();
        this._activeServiceName = this.getActiveServiceNameFromSettings();

        // Listen for configuration changes to update the active service
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(`${EXTENSION_ID}.${SETTINGS_KEYS.activeApiService}`) || e.affectsConfiguration(`${EXTENSION_ID}.${SETTINGS_KEYS.geminiApiKey}`)) {
                this._activeServiceName = this.getActiveServiceNameFromSettings();
                this.geminiService.updateApiKey(); // Re-initialize Gemini service if key changes
            }
        });
    }

    /**
     * Reads the active service name from VS Code settings.
     * @returns The configured service name, defaulting to vLLM.
     */
    private getActiveServiceNameFromSettings(): ApiServiceName {
        const config = vscode.workspace.getConfiguration(EXTENSION_ID);
        return config.get<ApiServiceName>(SETTINGS_KEYS.activeApiService, API_SERVICES.vllm);
    }

    /**
     * Returns the currently active service instance based on configuration.
     * @returns The active IApiService implementation (VllmApiService or GeminiApiService).
     */
    private getActiveService(): IApiService {
        if (this._activeServiceName === API_SERVICES.gemini) {
            return this.geminiService;
        }
        return this.vllmService;
    }

    public getActiveServiceName(): ApiServiceName {
        return this._activeServiceName;
    }

    // --- Delegated Methods ---

    public async checkConnection(): Promise<boolean> {
        return this.getActiveService().checkConnection();
    }

    public async generateContent(prompt: string): Promise<string> {
        return this.getActiveService().generateContent(prompt);
    }

    public async generateChatContent(messages: ChatMessage[]): Promise<string> {
        return this.getActiveService().generateChatContent(messages);
    }
}