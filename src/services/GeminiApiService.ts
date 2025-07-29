import * as vscode from 'vscode';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, StartChatParams } from '@google/generative-ai';
import { EXTENSION_ID, GEMINI_MODEL_NAME, GEMINI_PARAMS, SETTINGS_KEYS } from '../core/constants';
import { ChatMessage } from '../types';

/**
 * Google Gemini API'si ile tüm etkileşimleri yöneten servis sınıfı.
 */
export class GeminiApiService {
    private genAI?: GoogleGenerativeAI;
    private apiKey?: string;

    constructor() {
        this.updateApiKey();
    }

    public updateApiKey(): string | undefined {
        const config = vscode.workspace.getConfiguration(EXTENSION_ID);
        this.apiKey = config.get<string>(SETTINGS_KEYS.geminiApiKey);
        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
        }
        return this.apiKey;
    }

    public async checkConnection(): Promise<boolean> {
        if (!this.genAI) {
            return false;
        }
        try {
            const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
            await model.countTokens("test");
            return true;
        } catch (error) {
            console.error("Gemini connection check failed:", error);
            return false;
        }
    }

    public async generateContent(prompt: string): Promise<string> {
        if (!this.genAI) {
            throw new Error('Gemini API anahtarı ayarlanmamış.');
        }

        const model = this.genAI.getGenerativeModel({
            model: GEMINI_MODEL_NAME,
            generationConfig: GEMINI_PARAMS.completion as GenerationConfig
        });

        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.error("Gemini API Error:", error);
            // GÜNCELLENDİ: Hata mesajını daha detaylı fırlat.
            throw new Error(`Gemini API Hatası: ${error.message}`);
        }
    }

    public async generateChatContent(messages: ChatMessage[]): Promise<string> {
        if (!this.genAI) {
            throw new Error('Gemini API anahtarı ayarlanmamış.');
        }

        const systemInstruction = messages.find(m => m.role === 'system');
        const history = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
        
        const lastMessage = history.pop();
        if (!lastMessage) {
            return '';
        }

        const model = this.genAI.getGenerativeModel({
            model: GEMINI_MODEL_NAME,
            generationConfig: GEMINI_PARAMS.chat as GenerationConfig,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
            ],
            systemInstruction: systemInstruction ? { role: "system", parts: [{ text: systemInstruction.content }] } : undefined
        });

        try {
            const chatParams: StartChatParams = {
                history: history,
            };

            const chat = model.startChat(chatParams);
            const result = await chat.sendMessage(lastMessage.parts[0].text);
            return result.response.text();
        } catch (error: any) {
            console.error("Gemini Chat API Error:", error);
            // GÜNCELLENDİ: Hata mesajını daha detaylı fırlat.
            throw new Error(`Gemini Sohbet Hatası: ${error.message}`);
        }
    }
}