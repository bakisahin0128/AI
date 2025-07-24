// src/ChatViewProvider.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

// Gemini API'sinin beklediği formatta bir "dönüş" (turn) tipi tanımlayalım
interface ChatTurn {
    role: 'user' | 'model';
    parts: { text: string }[];
}

interface GeminiResponse {
    candidates: Array<{ content: ChatTurn }>;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'baykar-ai-fixer.chatView';
    private _view?: vscode.WebviewView;

    // YENİ: Sohbet geçmişini tutacak olan dizi
    private conversationHistory: ChatTurn[] = [];

    constructor(private readonly _context: vscode.ExtensionContext) {
        // YENİ: Eklenti ilk başladığında AI'nın rolünü ve kimliğini belirleyen
        // bir başlangıç mesajı ile geçmişi dolduruyoruz. Bu, kullanıcıya görünmez.
        
        const initialPrompt = `Sen Baykar bünyesinde çalışan, uzman bir yazılım geliştirme asistanısın. Cevaplarını, okunabilirliği artırmak için listeler, kalın metinler ve kod parçacıkları gibi zengin formatlar içeren Markdown formatında oluştur. Kod bloklarını python gibi dil belirterek ver.`;
        this.conversationHistory.push({ role: 'user', parts: [{ text: initialPrompt }] });
        this.conversationHistory.push({ role: 'model', parts: [{ text: 'Anladım. Uzman bir yazılım geliştirme asistanı olarak size yardımcı olmaya hazırım. Lütfen sorunuzu sorun.' }] });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui')]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Webview'den gelen mesajları dinle
        webviewView.webview.onDidReceiveMessage(async data => {
            if (data.type === 'askGemini') {
                const userMessage = data.value;

                // --- DEĞİŞİKLİK BURADA BAŞLIYOR ---

                // 1. Kullanıcının yeni mesajını sohbet geçmişine ekle
                this.conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

                const apiKey = await this._context.secrets.get('baykar-ai-fixer-apiKey');
                if (!apiKey) {
                    this._view?.webview.postMessage({ type: 'addResponse', value: 'API Anahtarı bulunamadı. Lütfen `Baykar AI: LLM API Anahtarını Ayarla` komutu ile anahtarınızı ayarlayın.' });
                    return;
                }

                try {
                    const modelName = 'gemini-2.0-flash';
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
                    
                    // 2. API'ye tek bir soru yerine, tüm konuşma geçmişini gönder
                    const requestData = { contents: this.conversationHistory };
                    
                    const headers = { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey };
                    const response = await axios.post<GeminiResponse>(url, requestData, { headers });
                    const aiResponse = response.data.candidates[0].content.parts[0].text;

                    // 3. AI'nın cevabını da sohbet geçmişine ekle
                    this.conversationHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
                    
                    // Cevabı Webview'e göndererek kullanıcıya göster
                    this._view?.webview.postMessage({ type: 'addResponse', value: aiResponse });

                } catch (error: any) {
                    console.error("Chat API Hatası:", error.response ? error.response.data.error : error);
                    // Hata durumunda son eklenen kullanıcı mesajını geçmişten kaldırabiliriz ki tekrar deneyebilsin.
                    this.conversationHistory.pop();
                    this._view?.webview.postMessage({ type: 'addResponse', value: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' });
                }

                // --- DEĞİŞİKLİK SONA ERDİ ---
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // ... bu fonksiyonun içeriği aynı kalıyor, değişiklik yok ...
        const toUri = (filePath: string) => {
            return webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', filePath));
        };

        const htmlPath = path.join(this._context.extensionUri.fsPath, 'webview-ui', 'chat.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        const aiIconUri = toUri('baykar-icon.svg');
        const userIconUri = toUri('BaykarLogo.svg');
        const logoUri = toUri('BaykarLogo.svg');
        const sendIconUri = toUri('baykar-icon.svg');

        htmlContent = htmlContent
            .replace(/{{chat_css_uri}}/g, toUri('chat.css').toString())
            .replace(/{{chat_js_uri}}/g, toUri('chat.js').toString())
            .replace(/{{ai_icon_uri}}/g, aiIconUri.toString())
            .replace(/{{user_icon_uri}}/g, userIconUri.toString())
            .replace(/{{logo_uri}}/g, logoUri.toString())
            .replace(/{{send_icon_uri}}/g, sendIconUri.toString());
        
        return htmlContent;
    }
}