/* ==========================================================================
   DOSYA 2: src/features/MessageHandler.ts (YENİ DOSYA)
   
   SORUMLULUK: Webview'den gelen 'askAI' gibi ana komutları işler.
   API çağrılarını yapar ve VS Code editöründe değişiklikleri uygular.
   ========================================================================== */

import * as vscode from 'vscode';
import { ApiServiceManager } from '../services/ApiServiceManager';
import { ConversationManager } from './ConversationManager';
import { createFileInteractionPrompt, createModificationPrompt } from '../core/promptBuilder';
import { cleanLLMCodeBlock, cleanLLMJsonBlock } from '../core/utils';
import { AiResponse, ChatMessage } from '../types/index';
import { EXTENSION_ID, SETTINGS_KEYS, UI_MESSAGES, API_SERVICES } from '../core/constants';

export class MessageHandler {
    constructor(
        private readonly conversationManager: ConversationManager,
        private readonly apiManager: ApiServiceManager
    ) {}

    public async handleStandardChat(userMessage: string, webview: vscode.Webview) {
        this.conversationManager.addMessage('user', userMessage);

        try {
            const activeConversation = this.conversationManager.getActive();
            if (!activeConversation) throw new Error("Aktif konuşma bulunamadı.");

            const config = vscode.workspace.getConfiguration(EXTENSION_ID);
            const historyLimit = config.get<number>(SETTINGS_KEYS.conversationHistoryLimit, 2);
            
            const systemPrompt = activeConversation.messages.find(m => m.role === 'system');
            const currentMessages = activeConversation.messages.filter(m => m.role !== 'system');
            const limitedMessages = currentMessages.slice(-(historyLimit * 2 + 1));
            const messagesForApi: ChatMessage[] = systemPrompt ? [systemPrompt, ...limitedMessages] : limitedMessages;
            
            const aiResponse = await this.apiManager.generateChatContent(messagesForApi);
            this.conversationManager.addMessage('assistant', aiResponse);
            webview.postMessage({ type: 'addResponse', payload: aiResponse });

        } catch (error: any) {
            console.error("Chat API Error:", error);
            this.conversationManager.removeLastMessage();
            webview.postMessage({ type: 'addResponse', payload: this.getErrorMessage() });
        }
    }

    // DEĞİŞİKLİK: Fonksiyon artık tek bir context yerine bir context dizisi alıyor.
    public async handleFileContextInteraction(instruction: string, contexts: Array<{ uri: vscode.Uri; content: string; fileName: string; }>, webview: vscode.Webview) {
        this.conversationManager.addMessage('user', instruction);
        
        try {
            // DEĞİŞİKLİK: Prompt'a tüm dosya context'lerini gönder.
            const prompt = createFileInteractionPrompt(contexts, instruction);
            const responseText = await this.apiManager.generateContent(prompt);
            const cleanedJson = cleanLLMJsonBlock(responseText);
            const aiResponse: AiResponse = JSON.parse(cleanedJson);

            if (aiResponse.explanation) {
                this.conversationManager.addMessage('assistant', aiResponse.explanation);
                webview.postMessage({ type: 'addResponse', payload: aiResponse.explanation });
            }

            // DEĞİŞİKLİK: Eğer intent 'modify' ise, doğru dosyayı bul ve güncelle.
            if (aiResponse.intent === 'modify' && aiResponse.modifiedCode && aiResponse.fileName) {
                const contextToModify = contexts.find(c => c.fileName === aiResponse.fileName);
                
                if (contextToModify) {
                    const writeData = Buffer.from(aiResponse.modifiedCode, 'utf8');
                    await vscode.workspace.fs.writeFile(contextToModify.uri, writeData);
                    // Dosya içeriğini güncel tutmak için context'i de güncelle
                    contextToModify.content = aiResponse.modifiedCode;
                    vscode.window.showInformationMessage(`'${aiResponse.fileName}' dosyası başarıyla güncellendi.`);
                } else {
                    // YENİ: AI'ın döndürdüğü dosya adı bağlamda bulunamazsa hata yönetimi.
                    const errorMsg = `**Hata:** Model, mevcut olmayan bir dosyayı (${aiResponse.fileName}) değiştirmeye çalıştı.`;
                    this.conversationManager.addMessage('assistant', errorMsg);
                    webview.postMessage({ type: 'addResponse', payload: errorMsg });
                }
            }

        } catch (error: any) {
            console.error("File Interaction API Error:", error);
            this.conversationManager.removeLastMessage();
            webview.postMessage({ type: 'addResponse', payload: this.getErrorMessage() });
        }
    }

    public async handleContextualModification(instruction: string, codeToModify: string, uri: vscode.Uri, selection: vscode.Selection, webview: vscode.Webview) {
        this.conversationManager.addMessage('user', instruction);

        try {
            const prompt = createModificationPrompt(instruction, codeToModify);
            const modifiedCode = await this.apiManager.generateContent(prompt);
            const cleanedCode = cleanLLMCodeBlock(modifiedCode);

            const edit = new vscode.WorkspaceEdit();
            edit.replace(uri, selection, cleanedCode);
            await vscode.workspace.applyEdit(edit);

            const responsePayload = `Kodunuz başarıyla güncellendi!\n\n\`\`\`python\n${cleanedCode}\n\`\`\``;
            this.conversationManager.addMessage('assistant', responsePayload);
            webview.postMessage({ type: 'addResponse', payload: responsePayload });

        } catch (error: any) {
            console.error("Contextual Modification API Error:", error);
            this.conversationManager.removeLastMessage();
            webview.postMessage({ type: 'addResponse', payload: this.getErrorMessage() });
        }
    }

    private getErrorMessage(): string {
        const activeService = this.apiManager.getActiveServiceName();
        return activeService === API_SERVICES.gemini 
            ? UI_MESSAGES.geminiConnectionError 
            : UI_MESSAGES.vllmConnectionError;
    }
}