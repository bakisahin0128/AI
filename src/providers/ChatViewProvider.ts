/* ==========================================================================
   DOSYA 6: src/providers/ChatViewProvider.ts (YENİDEN DÜZENLENMİŞ ANA DOSYA)
   
   SORUMLULUK: Artık sadece bir orkestra şefi gibi davranır. Webview'i
   oluşturur, yöneticileri (manager) başlatır ve gelen mesajları ilgili
   yöneticiye yönlendirir.
   ========================================================================== */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EXTENSION_ID } from '../core/constants';
import { getNonce } from '../core/utils';
import { ApiServiceManager } from '../services/ApiServiceManager';
import { ConversationManager } from '../features/ConversationManager';
import { MessageHandler } from '../features/MessageHandler';
import { ContextManager } from '../features/ContextManager';
import { SettingsManager } from '../features/SettingsManager';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = `${EXTENSION_ID}.chatView`;
    private _view?: vscode.WebviewView;

    // Yönetici sınıflarını başlatıyoruz
    private readonly conversationManager: ConversationManager;
    private readonly messageHandler: MessageHandler;
    private readonly contextManager: ContextManager;
    private readonly settingsManager: SettingsManager;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly apiManager: ApiServiceManager
    ) {
        this.conversationManager = new ConversationManager(_context);
        this.messageHandler = new MessageHandler(this.conversationManager, apiManager);
        this.contextManager = new ContextManager();
        this.settingsManager = new SettingsManager();
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui')]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Gelen mesajları ilgili yöneticilere delege et
        webviewView.webview.onDidReceiveMessage(async data => {
            if (!this._view) return;

            switch (data.type) {
                case 'askAI': {
                    const userMessage = data.payload;
                    // DEĞİŞİKLİK: Tek bir dosya yerine dosya dizisini kontrol et.
                    if (this.contextManager.uploadedFileContexts.length > 0) {
                        await this.messageHandler.handleFileContextInteraction(userMessage, this.contextManager.uploadedFileContexts, this._view.webview);
                    } else if (this.contextManager.activeContextText && this.contextManager.activeEditorUri && this.contextManager.activeSelection) {
                        await this.messageHandler.handleContextualModification(userMessage, this.contextManager.activeContextText, this.contextManager.activeEditorUri, this.contextManager.activeSelection, this._view.webview);
                        this.contextManager.clearAll(this._view.webview);
                    } else {
                        await this.messageHandler.handleStandardChat(userMessage, this._view.webview);
                    }
                    break;
                }

                case 'newChat': {
                    const activeConv = this.conversationManager.getActive();
                    // Eğer mevcut sohbet zaten boşsa veya sadece sistem mesajı varsa bir şey yapma
                    if (activeConv && activeConv.messages.length <= 1 && this.contextManager.uploadedFileContexts.length === 0) break; 
                    
                    // YENİ EKLENEN SATIR: Yeni sohbete başlamadan önce dosya bağlamını temizle.
                    this.contextManager.clearAll(this._view.webview);

                    this.conversationManager.createNew();
                    this._view.webview.postMessage({ type: 'clearChat' });
                    break;
                }

                case 'requestHistory': {
                    const historySummary = this.conversationManager.getHistorySummary();
                    this._view.webview.postMessage({ type: 'loadHistory', payload: historySummary });
                    break;
                }

                case 'switchChat': {
                    const conversation = this.conversationManager.switchConversation(data.payload.conversationId);
                    if (conversation) {
                        this._view.webview.postMessage({ type: 'loadConversation', payload: conversation.messages });
                    }
                    break;
                }

                case 'deleteChat': {
                    const nextConversation = this.conversationManager.deleteConversation(data.payload.conversationId);
                    if (nextConversation) {
                        this._view.webview.postMessage({ type: 'loadConversation', payload: nextConversation.messages });
                    } else {
                        this._view.webview.postMessage({ type: 'clearChat' });
                    }
                    // Geçmiş listesini de güncelle
                    const historySummary = this.conversationManager.getHistorySummary();
                    this._view.webview.postMessage({ type: 'loadHistory', payload: historySummary });
                    break;
                }
                
                case 'requestFileUpload': 
                    await this.contextManager.setFileContext(this._view.webview); 
                    break;
                
                // YENİ: Tek bir dosyayı kaldırma isteğini işle.
                case 'removeFileContext': 
                    this.contextManager.removeFileContext(data.payload.fileName, this._view.webview);
                    break;
                
                case 'clearFileContext': // Bu artık kullanılmayacak, removeFileContext'e bırakıldı ama acil durum için kalabilir.
                    this.contextManager.clearAll(this._view.webview); 
                    break;
                
                case 'requestConfig': 
                    this.settingsManager.sendConfigToWebview(this._view.webview); 
                    break;
                
                case 'saveSettings': 
                    await this.settingsManager.saveSettings(data.payload); 
                    break;
            }
        });

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                const activeConv = this.conversationManager.getActive();
                if (activeConv) {
                    this._view?.webview.postMessage({ type: 'loadConversation', payload: activeConv.messages });
                }
            }
        });
    }
    
    // Bu public metot, extension.ts'den çağrılmaya devam edecek
    public setActiveContext(uri: vscode.Uri, selection: vscode.Selection, text: string) {
        if (this._view) {
            this.contextManager.setEditorContext(uri, selection, text, this._view.webview);
        }
    }
    
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const toUri = (filePath: string) => webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', filePath));
        const htmlPath = path.join(this._context.extensionUri.fsPath, 'webview-ui', 'chat.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        const nonce = getNonce();

        return htmlContent
            .replace(/{{cspSource}}/g, webview.cspSource)
            .replace(/{{nonce}}/g, nonce)
            .replace(/{{chat_css_uri}}/g, toUri('css/chat.css').toString())
            .replace(/{{chat_js_uri}}/g, toUri('js/app.js').toString())
            .replace(/{{ai_icon_uri}}/g, toUri('assets/baykar-icon.svg').toString())
            .replace(/{{user_icon_uri}}/g, toUri('assets/BaykarLogo.svg').toString())
            .replace(/{{logo_uri}}/g, toUri('assets/BaykarLogo.svg').toString())
            .replace(/{{send_icon_uri}}/g, toUri('assets/baykar-icon.svg').toString())
            .replace(/{{attach_icon_uri}}/g, toUri('assets/attach.svg').toString());
    }
}