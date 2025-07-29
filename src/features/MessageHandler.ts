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

    public async handleFileContextInteraction(instruction: string, context: { uri: vscode.Uri; content: string; fileName: string; }, webview: vscode.Webview) {
        try {
            const prompt = createFileInteractionPrompt(context.fileName, instruction, context.content);
            const responseText = await this.apiManager.generateContent(prompt);
            const cleanedJson = cleanLLMJsonBlock(responseText);
            const aiResponse: AiResponse = JSON.parse(cleanedJson);

            if (aiResponse.explanation) {
                webview.postMessage({ type: 'addResponse', payload: aiResponse.explanation });
            }

            if (aiResponse.intent === 'modify' && aiResponse.modifiedCode) {
                const writeData = Buffer.from(aiResponse.modifiedCode, 'utf8');
                await vscode.workspace.fs.writeFile(context.uri, writeData);
                // Dosya içeriğini güncel tutmak için context'i de güncelle
                context.content = aiResponse.modifiedCode;
            }

        } catch (error: any) {
            console.error("File Interaction API Error:", error);
            webview.postMessage({ type: 'addResponse', payload: this.getErrorMessage() });
        }
    }

    public async handleContextualModification(instruction: string, codeToModify: string, uri: vscode.Uri, selection: vscode.Selection, webview: vscode.Webview) {
        try {
            const prompt = createModificationPrompt(instruction, codeToModify);
            const modifiedCode = await this.apiManager.generateContent(prompt);
            const cleanedCode = cleanLLMCodeBlock(modifiedCode);

            const edit = new vscode.WorkspaceEdit();
            edit.replace(uri, selection, cleanedCode);
            await vscode.workspace.applyEdit(edit);

            webview.postMessage({ type: 'addResponse', payload: `Kodunuz başarıyla güncellendi!\n\n\`\`\`python\n${cleanedCode}\n\`\`\`` });

        } catch (error: any) {
            console.error("Contextual Modification API Error:", error);
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