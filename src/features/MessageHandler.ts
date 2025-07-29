/* ==========================================================================
   DOSYA 2: src/features/MessageHandler.ts (NİHAİ SÜRÜM)
   
   SORUMLULUK: Webview'den gelen 'askAI' gibi ana komutları işler.
   API çağrılarını yapar ve VS Code editöründe değişiklikleri uygular.
   YENİ: Dosya etkileşiminde önce niyeti belirler (soru/değişiklik) ve akışı
   buna göre yönlendirir.
   ========================================================================== */

import * as vscode from 'vscode';
import { ApiServiceManager } from '../services/ApiServiceManager';
import { ConversationManager } from './ConversationManager';
// YENİ: Güncellenmiş tüm prompt'ları import ediyoruz.
import { createModificationPrompt, createExplanationPrompt, createFileInteractionAnalysisPrompt } from '../core/promptBuilder';
import { cleanLLMCodeBlock } from '../core/utils';
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
            webview.postMessage({ type: 'addResponse', payload: this.getErrorMessage() });
        }
    }

    // --- TAMAMEN YENİLENEN FONKSİYON ---
    public async handleFileContextInteraction(instruction: string, contexts: Array<{ uri: vscode.Uri; content: string; fileName: string; }>, webview: vscode.Webview) {
        this.conversationManager.addMessage('user', instruction);
        
        try {
            // 1. AŞAMA: NİYET ANALİZİ
            const analysisPrompt = createFileInteractionAnalysisPrompt(contexts, instruction);
            const analysisResponse = await this.apiManager.generateContent(analysisPrompt);

            // Analiz çıktısını işle (INTENT, FILENAME, EXPLANATION'ı ayır)
            const intentMatch = analysisResponse.match(/^INTENT:\s*(.*)/m);
            const fileNameMatch = analysisResponse.match(/^FILENAME:\s*(.*)/m);
            const explanationMatch = analysisResponse.match(/EXPLANATION:\s*([\s\S]*)/m);

            if (!intentMatch || !explanationMatch) {
                throw new Error('Modelden beklenen formatta analiz yanıtı alınamadı.');
            }

            const intent = intentMatch[1].trim();
            const explanation = explanationMatch[1].trim();

            // 2. AŞAMA: DALLANMA
            if (intent === 'answer') {
                // Eğer niyet sadece soruya cevap vermekse, açıklamayı göster ve bitir.
                this.conversationManager.addMessage('assistant', explanation);
                webview.postMessage({ type: 'addResponse', payload: explanation });
                return; // Süreci burada sonlandır.
            }

            // Eğer niyet 'modify' ise, kod değiştirme akışına devam et.
            if (intent === 'modify') {
                const targetFileName = fileNameMatch ? fileNameMatch[1].trim() : '';
                const contextToModify = contexts.find(c => c.fileName === targetFileName);

                if (!contextToModify) {
                    const errorMsg = `**Hata:** Model, mevcut olmayan bir dosyayı (${targetFileName}) değiştirmeye çalıştı veya bir dosya adı belirtmedi.`;
                    this.conversationManager.addMessage('assistant', errorMsg);
                    webview.postMessage({ type: 'addResponse', payload: errorMsg });
                    return;
                }

                // 2a. KODU DEĞİŞTİR
                const modificationPrompt = createModificationPrompt(instruction, contextToModify.content);
                const modifiedCodeResponse = await this.apiManager.generateContent(modificationPrompt);
                const cleanedCode = cleanLLMCodeBlock(modifiedCodeResponse);

                // 2b. AÇIKLAMA ÜRET
                const finalExplanationPrompt = createExplanationPrompt(contextToModify.content, cleanedCode);
                const finalExplanation = await this.apiManager.generateChatContent([
                    { role: 'user', content: finalExplanationPrompt }
                ]);
                
                this.conversationManager.addMessage('assistant', finalExplanation);
                webview.postMessage({ type: 'addResponse', payload: finalExplanation });

                // 2c. ONAYA GÖNDER
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
            webview.postMessage({ type: 'addResponse', payload: this.getErrorMessage() });
        }
    }

    public async handleContextualModification(instruction: string, codeToModify: string, uri: vscode.Uri, selection: vscode.Selection, webview: vscode.Webview) {
        // Bu fonksiyon 'modify' niyetinde olduğu için doğrudan kod değiştirme akışını kullanır.
        // Bu yüzden "önce kod, sonra açıklama" mantığı burada doğru çalışır.
        this.conversationManager.addMessage('user', instruction);
        try {
            const modifiedCode = await this.apiManager.generateContent(createModificationPrompt(instruction, codeToModify));
            const cleanedCode = cleanLLMCodeBlock(modifiedCode);
            
            const explanation = await this.apiManager.generateChatContent([{ role: 'user', content: createExplanationPrompt(codeToModify, cleanedCode) }]);
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
        } catch (error: any) {
            console.error("Contextual Modification API Error:", error);
            this.conversationManager.removeLastMessage();
            webview.postMessage({ type: 'addResponse', payload: this.getErrorMessage() });
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

    private getErrorMessage(): string {
        const activeService = this.apiManager.getActiveServiceName();
        return activeService === API_SERVICES.gemini 
            ? UI_MESSAGES.geminiConnectionError 
            : UI_MESSAGES.vllmConnectionError;
    }
}