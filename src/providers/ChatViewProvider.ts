// src/providers/ChatViewProvider.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { createFileInteractionPrompt, createModificationPrompt } from '../core/promptBuilder';
import { API_SERVICES, EXTENSION_ID, SETTINGS_KEYS, UI_MESSAGES } from '../core/constants';
import { cleanLLMCodeBlock, cleanLLMJsonBlock } from '../core/utils';
import { AiResponse, ChatMessage, ApiServiceName } from '../types/index';
import { ApiServiceManager } from '../services/ApiServiceManager';

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = `${EXTENSION_ID}.chatView`;
    private _view?: vscode.WebviewView;
    private conversationHistory: ChatMessage[] = [];

    private activeEditorUri?: vscode.Uri;
    private activeSelection?: vscode.Selection;
    private activeContextText?: string;
    private uploadedFileContext?: {
        uri: vscode.Uri;
        content: string;
        fileName: string;
    };

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly apiManager: ApiServiceManager
    ) {
        const initialSystemPrompt = `Sen Baykar bünyesinde çalışan, uzman bir yazılım geliştirme asistanısın. Cevaplarını, okunabilirliği artırmak için listeler, kalın metinler ve kod parçacıkları gibi zengin formatlar içeren Markdown formatında oluştur. Kod bloklarını python gibi dil belirterek ver.`;
        this.conversationHistory.push({ role: 'system', content: initialSystemPrompt });
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui')]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'askAI':
                    const userMessage = data.value;
                    if (this.uploadedFileContext) {
                        await this.handleFileContextInteraction(userMessage, this.uploadedFileContext);
                    } else if (this.activeContextText && this.activeEditorUri && this.activeSelection) {
                        await this.handleContextualModification(userMessage, this.activeContextText, this.activeEditorUri, this.activeSelection);
                        this.clearAllContexts();
                    } else {
                        await this.handleStandardChat(userMessage);
                    }
                    break;

                case 'requestFileUpload':
                    await this.handleFileUpload();
                    break;
                case 'clearFileContext':
                    this.clearAllContexts();
                    break;

                // --- Settings Related Messages ---
                case 'requestConfig':
                    this.sendConfigToWebview();
                    break;
                
                case 'saveSettings':
                    await this.saveSettings(data.payload);
                    break;
            }
        });
    }
    
    /**
     * Sends the current extension configuration to the webview to populate the settings modal.
     */
    private sendConfigToWebview() {
        if (!this._view) return;

        const config = vscode.workspace.getConfiguration(EXTENSION_ID);
        this._view.webview.postMessage({
            type: 'loadConfig',
            payload: {
                activeApiService: config.get<ApiServiceName>(SETTINGS_KEYS.activeApiService, API_SERVICES.vllm),
                vllmBaseUrl: config.get<string>(SETTINGS_KEYS.vllmBaseUrl, ''),
                vllmModelName: config.get<string>(SETTINGS_KEYS.vllmModelName, ''),
                geminiApiKey: config.get<string>(SETTINGS_KEYS.geminiApiKey, '')
            }
        });
    }

    /**
     * Saves the settings received from the webview to the global VS Code configuration.
     * @param settings The settings object from the webview's form.
     */
    private async saveSettings(settings: {
        activeApiService: ApiServiceName;
        vllmBaseUrl: string;
        vllmModelName: string;
        geminiApiKey: string;
    }) {
        const config = vscode.workspace.getConfiguration(EXTENSION_ID);
        try {
            // Update settings in parallel
            await Promise.all([
                config.update(SETTINGS_KEYS.activeApiService, settings.activeApiService, vscode.ConfigurationTarget.Global),
                config.update(SETTINGS_KEYS.vllmBaseUrl, settings.vllmBaseUrl.trim(), vscode.ConfigurationTarget.Global),
                config.update(SETTINGS_KEYS.vllmModelName, settings.vllmModelName.trim(), vscode.ConfigurationTarget.Global),
                config.update(SETTINGS_KEYS.geminiApiKey, settings.geminiApiKey.trim(), vscode.ConfigurationTarget.Global)
            ]);

            vscode.window.showInformationMessage('Ayarlar başarıyla kaydedildi.');
        } catch (error) {
            console.error("Failed to save settings:", error);
            vscode.window.showErrorMessage('Ayarlar kaydedilirken bir hata oluştu.');
        }
    }

    public isVisible(): boolean {
        return this._view?.visible ?? false;
    }

    public setActiveContext(uri: vscode.Uri, selection: vscode.Selection, text: string) {
        this.clearAllContexts();
        this.activeEditorUri = uri;
        this.activeSelection = selection;
        this.activeContextText = text;
        this._view?.webview.postMessage({
            type: 'contextSet',
            value: `Talimatınız seçili koda uygulanacaktır...`
        });
    }

    private clearAllContexts() {
        this.activeEditorUri = undefined;
        this.activeSelection = undefined;
        this.activeContextText = undefined;
        this.uploadedFileContext = undefined;
        this._view?.webview.postMessage({ type: 'clearContext' });
    }

    private getErrorMessage(): string {
        const activeService = this.apiManager.getActiveServiceName();
        return activeService === API_SERVICES.gemini 
            ? UI_MESSAGES.geminiConnectionError 
            : UI_MESSAGES.vllmConnectionError;
    }

    private async handleFileUpload() {
        const fileUriArray = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Dosyayı Seç' });
        if (fileUriArray && fileUriArray[0]) {
            const uri = fileUriArray[0];
            const fileBytes = await vscode.workspace.fs.readFile(uri);
            const content = Buffer.from(fileBytes).toString('utf8');
            const fileName = path.basename(uri.fsPath);

            this.clearAllContexts();
            this.uploadedFileContext = { uri, content, fileName };

            this._view?.webview.postMessage({ type: 'fileContextSet', fileName: fileName });
        }
    }

    private async handleFileContextInteraction(instruction: string, context: { uri: vscode.Uri; content: string; fileName: string; }) {
        try {
            const prompt = createFileInteractionPrompt(context.fileName, instruction, context.content);
            const responseText = await this.apiManager.generateContent(prompt);
            const cleanedJson = cleanLLMJsonBlock(responseText);
            const aiResponse: AiResponse = JSON.parse(cleanedJson);

            if (aiResponse.explanation) {
                this._view?.webview.postMessage({ type: 'addResponse', value: aiResponse.explanation });
            }

            if (aiResponse.intent === 'modify' && aiResponse.modifiedCode) {
                const writeData = Buffer.from(aiResponse.modifiedCode, 'utf8');
                await vscode.workspace.fs.writeFile(context.uri, writeData);
                this.uploadedFileContext!.content = aiResponse.modifiedCode;
            }

        } catch (error: any) {
            console.error("File Interaction API Error:", error);
            this._view?.webview.postMessage({ type: 'addResponse', value: this.getErrorMessage() });
        }
    }

    private async handleStandardChat(userMessage: string) {
        this.conversationHistory.push({ role: 'user', content: userMessage });

        try {
            const aiResponse = await this.apiManager.generateChatContent(this.conversationHistory);
            this.conversationHistory.push({ role: 'assistant', content: aiResponse });
            this._view?.webview.postMessage({ type: 'addResponse', value: aiResponse });
        } catch (error: any) {
            console.error("Chat API Error:", error);
            this.conversationHistory.pop();
            this._view?.webview.postMessage({ type: 'addResponse', value: this.getErrorMessage() });
        }
    }

    private async handleContextualModification(instruction: string, codeToModify: string, uri: vscode.Uri, selection: vscode.Selection) {
        try {
            const prompt = createModificationPrompt(instruction, codeToModify);
            const modifiedCode = await this.apiManager.generateContent(prompt);
            const cleanedCode = cleanLLMCodeBlock(modifiedCode);

            const edit = new vscode.WorkspaceEdit();
            edit.replace(uri, selection, cleanedCode);
            await vscode.workspace.applyEdit(edit);

            this._view?.webview.postMessage({ type: 'addResponse', value: `Kodunuz başarıyla güncellendi!\n\n\`\`\`python\n${cleanedCode}\n\`\`\`` });

        } catch (error: any) {
            console.error("Contextual Modification API Error:", error);
            this._view?.webview.postMessage({ type: 'addResponse', value: this.getErrorMessage() });
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
            .replace(/{{chat_css_uri}}/g, toUri('chat.css').toString())
            .replace(/{{chat_js_uri}}/g, toUri('chat.js').toString())
            .replace(/{{ai_icon_uri}}/g, toUri('assets/baykar-icon.svg').toString())
            .replace(/{{user_icon_uri}}/g, toUri('assets/BaykarLogo.svg').toString())
            .replace(/{{logo_uri}}/g, toUri('assets/BaykarLogo.svg').toString())
            .replace(/{{send_icon_uri}}/g, toUri('assets/baykar-icon.svg').toString())
            .replace(/{{attach_icon_uri}}/g, toUri('assets/attach.svg').toString());
    }
}