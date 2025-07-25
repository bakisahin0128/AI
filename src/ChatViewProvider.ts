// src/ChatViewProvider.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

interface ChatTurn {
    role: 'user' | 'model';
    parts: { text: string }[];
}

// Gemini'den beklediğimiz JSON formatı için interface
interface AiResponse {
    intent: 'answer' | 'modify'; // Yapay zekanın anladığı niyet
    explanation: string;         // Kullanıcıya gösterilecek açıklama (Markdown)
    modifiedCode: string;        // Sadece niyet 'modify' ise dolu olacak
}

interface GeminiResponse {
    candidates: Array<{ content: ChatTurn }>;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'baykar-ai-fixer.chatView';
    private _view?: vscode.WebviewView;
    private conversationHistory: ChatTurn[] = [];

    private activeEditorUri?: vscode.Uri;
    private activeSelection?: vscode.Selection;
    private activeContextText?: string;

    private uploadedFileContext?: {
        uri: vscode.Uri;
        content: string;
        fileName: string;
    };

    constructor(private readonly _context: vscode.ExtensionContext) {
        const initialPrompt = `Sen Baykar bünyesinde çalışan, uzman bir yazılım geliştirme asistanısın. Cevaplarını, okunabilirliği artırmak için listeler, kalın metinler ve kod parçacıkları gibi zengin formatlar içeren Markdown formatında oluştur. Kod bloklarını python gibi dil belirterek ver.`;
        this.conversationHistory.push({ role: 'user', parts: [{ text: initialPrompt }] });
        this.conversationHistory.push({ role: 'model', parts: [{ text: 'Anladım. Uzman bir yazılım geliştirme asistanı olarak size yardımcı olmaya hazırım. Lütfen sorunuzu sorun.' }] });
    }

    /**
     * Panelin o an görünür olup olmadığını kontrol eder.
     * @returns boolean
     */
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

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'requestFileUpload':
                    await this.handleFileUpload();
                    break;
                case 'clearFileContext':
                    this.clearAllContexts();
                    break;
                case 'askGemini':
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
            }
        });
    }

    private async handleFileUpload() {
        const options: vscode.OpenDialogOptions = { 
            canSelectMany: false, 
            openLabel: 'Dosyayı Seç' 
        };
        const fileUriArray = await vscode.window.showOpenDialog(options);
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
        const apiKey = await this._context.secrets.get('baykar-ai-fixer-apiKey');
        if (!apiKey) {
            this._view?.webview.postMessage({ type: 'addResponse', value: 'API Anahtarı bulunamadı.' });
            return;
        }
        // Arayüze "düşünüyor" mesajı göndermiyoruz, bu artık chat.js'de anında yapılıyor.

        const prompt = `
        Sen bir uzman yazılım geliştirme asistanısın. Kullanıcının talimatını ve sağlanan dosya içeriğini analiz et.
        
        GÖREVİN:
        1.  Önce kullanıcının niyetini belirle:
            - Eğer kullanıcı soru soruyor, açıklama istiyor, analiz talep ediyor veya bir şeyi bulmasını istiyorsa (örn: "bu nedir?", "hatayı bul", "özetle"), niyet 'answer' (cevapla) olmalıdır.
            - Eğer kullanıcı açıkça dosyayı değiştirmeyi, düzeltmeyi, ekleme yapmayı veya yeniden düzenlemeyi istiyorsa (örn: "düzelt", "ekle", "değiştir", "refactor et"), niyet 'modify' (değiştir) olmalıdır.

        2.  Cevabını MUTLAKA aşağıdaki JSON formatında oluştur. Başka hiçbir metin ekleme.
            
            \`\`\`json
            {
              "intent": "answer" | "modify",
              "explanation": "Kullanıcıya gösterilecek detaylı ve Markdown formatında açıklama metni. Cevabını veya yaptığın değişikliği burada anlat.",
              "modifiedCode": "Eğer niyet 'modify' ise, dosyanın baştan sona değiştirilmiş tam içeriğini buraya yaz. Eğer niyet 'answer' ise bu alanı boş bir string olarak bırak (\\\"\\\")."
            }
            \`\`\`

        KULLANICI BİLGİLERİ:
        - Dosya Adı: "${context.fileName}"
        - Kullanıcı Talimatı: "${instruction}"
        
        DOSYANIN MEVCUT İÇERİĞİ:
        ---
        ${context.content}
        ---
        `;

        try {
            const modelName = 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
            const data = { contents: [{ parts: [{ text: prompt }] }] };
            const headers = { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey };
            
            const response = await axios.post<GeminiResponse>(url, data, { headers });
            const responseText = response.data.candidates[0].content.parts[0].text;
            
            const aiResponse: AiResponse = JSON.parse(responseText.trim().replace(/^```json\s*|```\s*$/g, '').trim());

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
            this._view?.webview.postMessage({ type: 'addResponse', value: 'Üzgünüm, isteğinizi işlerken bir hata oluştu. Lütfen tekrar deneyin.' });
        }
    }

    private async handleStandardChat(userMessage: string) {
        this.conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
        const apiKey = await this._context.secrets.get('baykar-ai-fixer-apiKey');
        if (!apiKey) {
            this._view?.webview.postMessage({ type: 'addResponse', value: 'API Anahtarı bulunamadı. Lütfen `Baykar AI: LLM API Anahtarını Ayarla` komutu ile anahtarınızı ayarlayın.' });
            return;
        }
        try {
            const modelName = 'gemini-1.5-flash'; 
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
            const requestData = { contents: this.conversationHistory };
            const headers = { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey };
            const response = await axios.post<GeminiResponse>(url, requestData, { headers });
            const aiResponse = response.data.candidates[0].content.parts[0].text;
            this.conversationHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
            this._view?.webview.postMessage({ type: 'addResponse', value: aiResponse });
        } catch (error: any) {
            console.error("Chat API Hatası:", error.response ? error.response.data.error : error);
            this.conversationHistory.pop();
            this._view?.webview.postMessage({ type: 'addResponse', value: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' });
        }
    }

    private async handleContextualModification(instruction: string, codeToModify: string, uri: vscode.Uri, selection: vscode.Selection) {
        const apiKey = await this._context.secrets.get('baykar-ai-fixer-apiKey');
        if (!apiKey) {
            this._view?.webview.postMessage({ type: 'addResponse', value: 'API Anahtarı bulunamadı.' });
            return;
        }
        // Arayüze "düşünüyor" mesajı göndermiyoruz, bu artık chat.js'de anında yapılıyor.
        const prompt = `Sen bir uzman Python geliştiricisisin. Aşağıdaki Python kodunu verilen talimata göre değiştir. Sadece ve sadece, başka hiçbir açıklama veya yorum eklemeden, istenen değişikliği yapılmış yeni kodu yanıt olarak ver.\n\nTALİMAT: "${instruction}"\n\nDEĞİŞTİRİLECEK KOD:\n---\n${codeToModify}\n---`;
        try {
            const modelName = 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
            const data = { contents: [{ parts: [{ text: prompt }] }] };
            const headers = { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey };
            const response = await axios.post<GeminiResponse>(url, data, { headers });
            let modifiedCode = response.data.candidates[0].content.parts[0].text;
            let cleanedCode = modifiedCode.trim().replace(/^```python\s*|```\s*$/g, '').trim();
            const edit = new vscode.WorkspaceEdit();
            edit.replace(uri, selection, cleanedCode);
            await vscode.workspace.applyEdit(edit);
            this._view?.webview.postMessage({ type: 'addResponse', value: `Kodunuz başarıyla güncellendi!\n\n\`\`\`python\n${cleanedCode}\n\`\`\`` });
        } catch (error: any) {
            console.error("Contextual Modification API Error:", error.response ? error.response.data.error : error);
            this._view?.webview.postMessage({ type: 'addResponse', value: 'Üzgünüm, kodunuzu değiştirirken bir hata oluştu.' });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const toUri = (filePath: string) => {
            return webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', filePath));
        };
        const htmlPath = path.join(this._context.extensionUri.fsPath, 'webview-ui', 'chat.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        const aiIconUri = toUri('baykar-icon.svg');
        const userIconUri = toUri('BaykarLogo.svg');
        const logoUri = toUri('BaykarLogo.svg');
        const sendIconUri = toUri('baykar-icon.svg');
        const attachIconUri = toUri('attach.svg'); 

        htmlContent = htmlContent
            .replace(/{{chat_css_uri}}/g, toUri('chat.css').toString())
            .replace(/{{chat_js_uri}}/g, toUri('chat.js').toString())
            .replace(/{{ai_icon_uri}}/g, aiIconUri.toString())
            .replace(/{{user_icon_uri}}/g, userIconUri.toString())
            .replace(/{{logo_uri}}/g, logoUri.toString())
            .replace(/{{send_icon_uri}}/g, sendIconUri.toString())
            .replace(/{{attach_icon_uri}}/g, attachIconUri.toString());

        return htmlContent;
    }
}
