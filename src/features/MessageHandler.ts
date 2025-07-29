/* ==========================================================================
   DOSYA 2: src/features/MessageHandler.ts (NİHAİ SÜRÜM)
   
   SORUMLULUK: Webview'den gelen 'askAI' gibi ana komutları işler.
   YENİ: API'den gelen detaylı hata mesajlarını doğrudan kullanıcıya gösterir.
   ========================================================================== */

import * as vscode from 'vscode';
import { ApiServiceManager } from '../services/ApiServiceManager';
import { ConversationManager } from './ConversationManager';
import { createModificationPrompt, createExplanationPrompt, createFileInteractionAnalysisPrompt, createSelectionInteractionAnalysisPrompt } from '../core/promptBuilder';
import { cleanLLMCodeBlock, cleanLLMJsonBlock } from '../core/utils';
import { ChatMessage, DiffData, ApproveChangeArgs } from '../types/index';
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
            // GÜNCELLENDİ: Detaylı hata mesajını göster.
            const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
            webview.postMessage({ type: 'addResponse', payload: `**Hata:** ${errorMessage}` });
        }
    }

    public async handleFileContextInteraction(instruction: string, contexts: Array<{ uri: vscode.Uri; content: string; fileName: string; }>, webview: vscode.Webview) {
        this.conversationManager.addMessage('user', instruction);
        let analysisResponseRaw = '';

        try {
            const analysisPrompt = createFileInteractionAnalysisPrompt(contexts, instruction);
            analysisResponseRaw = await this.apiManager.generateContent(analysisPrompt);

            const cleanedJsonString = cleanLLMJsonBlock(analysisResponseRaw);
            const analysisResult = JSON.parse(cleanedJsonString);

            const { intent, fileName, explanation } = analysisResult;

            if (!intent || !explanation) {
                throw new Error('Modelden beklenen formatta JSON yanıtı alınamadı: "intent" veya "explanation" eksik.');
            }

            if (intent === 'answer') {
                this.conversationManager.addMessage('assistant', explanation);
                webview.postMessage({ type: 'addResponse', payload: explanation });
                return;
            }

            if (intent === 'modify') {
                const contextToModify = contexts.find(c => c.fileName === fileName);

                if (!contextToModify) {
                    const errorMsg = `**Hata:** Model, mevcut olmayan bir dosyayı (${fileName || 'belirtilmemiş'}) değiştirmeye çalıştı.`;
                    this.conversationManager.addMessage('assistant', errorMsg);
                    webview.postMessage({ type: 'addResponse', payload: errorMsg });
                    return;
                }

                // ÖNCE KODU DEĞİŞTİR
                const modificationPrompt = createModificationPrompt(instruction, contextToModify.content);
                const modifiedCodeResponse = await this.apiManager.generateContent(modificationPrompt);
                const cleanedCode = cleanLLMCodeBlock(modifiedCodeResponse);
                
                // ŞİMDİ AÇIKLAMAYI VE FARKI AYNI ANDA GÖNDER
                this.conversationManager.addMessage('assistant', explanation);
                webview.postMessage({ type: 'addResponse', payload: explanation });
                
                const diffData: DiffData = {
                    originalCode: contextToModify.content,
                    modifiedCode: cleanedCode,
                    context: {
                        type: 'file',
                        fileUri: contextToModify.uri.toString()
                    }
                };
                webview.postMessage({ type: 'showDiff', payload: diffData });
            }

        } catch (error: any) {
            console.error("File Interaction API Error:", error);
            this.conversationManager.removeLastMessage();

            // GÜNCELLENDİ: Hata yönetimini basitleştir ve detaylı hata göster.
            const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";

            if (errorMessage.includes('JSON') && analysisResponseRaw) {
                console.log("JSON parsing failed. Falling back to direct answer.");
                this.conversationManager.addMessage('assistant', analysisResponseRaw);
                webview.postMessage({ type: 'addResponse', payload: analysisResponseRaw });
            } else {
                webview.postMessage({ type: 'addResponse', payload: `**Hata:** ${errorMessage}` });
            }
        }
    }

    public async handleContextualModification(instruction: string, codeToModify: string, uri: vscode.Uri, selection: vscode.Selection, webview: vscode.Webview) {
        this.conversationManager.addMessage('user', instruction);
        let analysisResponseRaw = '';
        
        try {
            const analysisPrompt = createSelectionInteractionAnalysisPrompt(codeToModify, instruction);
            analysisResponseRaw = await this.apiManager.generateContent(analysisPrompt);

            const cleanedJsonString = cleanLLMJsonBlock(analysisResponseRaw);
            const analysisResult = JSON.parse(cleanedJsonString);

            const { intent, explanation } = analysisResult;

            if (!intent || !explanation) {
                throw new Error('Modelden beklenen formatta JSON yanıtı alınamadı: "intent" veya "explanation" eksik.');
            }

            if (intent === 'answer') {
                this.conversationManager.addMessage('assistant', explanation);
                webview.postMessage({ type: 'addResponse', payload: explanation });
                return;
            }
            
            if (intent === 'modify') {
                // ÖNCE KODU DEĞİŞTİR
                const modificationPrompt = createModificationPrompt(instruction, codeToModify);
                const modifiedCodeResponse = await this.apiManager.generateContent(modificationPrompt);
                const cleanedCode = cleanLLMCodeBlock(modifiedCodeResponse);

                // ŞİMDİ AÇIKLAMAYI VE FARKI AYNI ANDA GÖNDER
                this.conversationManager.addMessage('assistant', explanation);
                webview.postMessage({ type: 'addResponse', payload: explanation });

                const diffData: DiffData = {
                    originalCode: codeToModify,
                    modifiedCode: cleanedCode,
                    context: {
                        type: 'selection',
                        selection: { uri: uri.toString(), range: [selection.start.line, selection.start.character, selection.end.line, selection.end.character] }
                    }
                };
                webview.postMessage({ type: 'showDiff', payload: diffData });
            }
        } catch (error: any) {
            console.error("Contextual Modification API Error:", error);
            this.conversationManager.removeLastMessage();
            
            // GÜNCELLENDİ: Hata yönetimini basitleştir ve detaylı hata göster.
            const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";

            if (errorMessage.includes('JSON') && analysisResponseRaw) {
                console.log("JSON parsing failed. Falling back to direct answer.");
                this.conversationManager.addMessage('assistant', analysisResponseRaw);
                webview.postMessage({ type: 'addResponse', payload: analysisResponseRaw });
            } else {
                webview.postMessage({ type: 'addResponse', payload: `**Hata:** ${errorMessage}` });
            }
        }
    }
    
    public async handleApproveChange(args: ApproveChangeArgs, webview: vscode.Webview) {
        const { diff } = args;
        try {
            if (diff.context.type === 'file' && diff.context.fileUri) {
                const uri = vscode.Uri.parse(diff.context.fileUri);
                const writeData = Buffer.from(diff.modifiedCode, 'utf8');
                await vscode.workspace.fs.writeFile(uri, writeData);
                vscode.window.showInformationMessage(`'${vscode.workspace.asRelativePath(uri)}' dosyası başarıyla güncellendi.`);
            } else if (diff.context.type === 'selection' && diff.context.selection) {
                const uri = vscode.Uri.parse(diff.context.selection.uri);
                const rangeArray = diff.context.selection.range;
                const selection = new vscode.Selection(new vscode.Position(rangeArray[0], rangeArray[1]), new vscode.Position(rangeArray[2], rangeArray[3]));
                const edit = new vscode.WorkspaceEdit();
                edit.replace(uri, selection, diff.modifiedCode);
                await vscode.workspace.applyEdit(edit);
                vscode.window.showInformationMessage('Kodunuz başarıyla güncellendi!');
            }
            webview.postMessage({ type: 'changeApproved' });
        } catch (error) {
            console.error('Değişiklik uygulanırken hata oluştu:', error);
            const errorMessage = "Değişiklik uygulanırken bir hata oluştu. Lütfen tekrar deneyin.";
            vscode.window.showErrorMessage(errorMessage);
            webview.postMessage({ type: 'addResponse', payload: errorMessage });
        }
    }

}