import * as vscode from 'vscode';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, StartChatParams } from '@google/generative-ai';
// DEĞİŞİKLİK: 'GEMINI_DEFAULTS' kaldırıldı, yerine 'GEMINI_MODEL_NAME' import edildi.
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

    /**
     * API anahtarını VS Code ayarlarından günceller.
     * @returns Güncellenmiş API anahtarı.
     */
    public updateApiKey(): string | undefined {
        const config = vscode.workspace.getConfiguration(EXTENSION_ID);
        this.apiKey = config.get<string>(SETTINGS_KEYS.geminiApiKey);
        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
        }
        return this.apiKey;
    }

    /**
     * İYİLEŞTİRME: Gemini API'sine bağlantıyı ve API anahtarının geçerliliğini
     * küçük bir istek göndererek gerçekten kontrol eder.
     * @returns Bağlantı başarılıysa true, değilse false döner.
     */
    public async checkConnection(): Promise<boolean> {
        if (!this.genAI) {
            return false;
        }
        try {
            // API anahtarını ve bağlantıyı doğrulamak için hafif bir istek
            const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
            await model.countTokens("test");
            return true;
        } catch (error) {
            console.error("Gemini connection check failed:", error);
            return false;
        }
    }

    /**
     * Verilen bir metin istemine göre içerik üretir.
     * @param prompt Model'e gönderilecek metin.
     * @returns Yapay zeka tarafından üretilen metin.
     */
    public async generateContent(prompt: string): Promise<string> {
        if (!this.genAI) {
            throw new Error('Gemini API anahtarı ayarlanmamış.');
        }

        const model = this.genAI.getGenerativeModel({
            // DEĞİŞİKLİK: Sabit bir model adı kullanılıyor.
            model: GEMINI_MODEL_NAME,
            generationConfig: GEMINI_PARAMS.completion as GenerationConfig
        });

        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.error("Gemini API Error:", error);
            throw new Error('Gemini API isteği sırasında bir hata oluştu. API anahtarınızı ve internet bağlantınızı kontrol edin.');
        }
    }

    /**
     * Bir konuşma geçmişine dayanarak sohbet içeriği üretir.
     * @param messages Konuşma geçmişini temsil eden mesaj dizisi.
     * @returns Yapay zeka tarafından üretilen sohbet mesajı.
     */
    public async generateChatContent(messages: ChatMessage[]): Promise<string> {
        if (!this.genAI) {
            throw new Error('Gemini API anahtarı ayarlanmamış.');
        }

        // İYİLEŞTİRME: 'system' rolünü doğru şekilde işleyelim.
        const systemInstruction = messages.find(m => m.role === 'system');
        const history = messages
            .filter(m => m.role !== 'system') // Konuşma geçmişinden sistem mesajını çıkar
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
            // Sistem talimatını modele ayrıca veriyoruz
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
            throw new Error('Gemini sohbet API isteği sırasında bir hata oluştu.');
        }
    }
}