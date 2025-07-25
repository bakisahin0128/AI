import * as vscode from 'vscode';
import axios from 'axios';
import { BaykarAiActionProvider } from './BaykarAiActionProvider';
import { BaykarAiHoverProvider } from './BaykarAiHoverProvider';
import { ChatViewProvider } from './ChatViewProvider';

const API_KEY_SECRET_KEY = 'baykar-ai-fixer-apiKey';

interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>
        }
    }>;
}

export function activate(context: vscode.ExtensionContext) {

    console.log('Tebrikler, "baykar-ai-fixer" eklentiniz şimdi aktif!');

    // --- ChatProvider'ı en başta oluşturun ki diğer komutlar ona erişebilsin
    const chatProvider = new ChatViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatProvider)
    );

    // API Anahtarı ayarlama komutu
    let setApiKeyCommand = vscode.commands.registerCommand('baykar-ai-fixer.setApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Lütfen Gemini API Anahtarınızı Girin',
            password: true,
            ignoreFocusOut: true
        });
        if (apiKey) {
            await context.secrets.store(API_KEY_SECRET_KEY, apiKey);
            vscode.window.showInformationMessage('API Anahtarı başarıyla kaydedildi.');
        } else {
            vscode.window.showWarningMessage('API Anahtarı girilmedi.');
        }
    });
    context.subscriptions.push(setApiKeyCommand);

    // Hata düzeltme komutu
    let applyFixCommand = vscode.commands.registerCommand('baykar-ai-fixer.applyFix',
        async (args: { uri: string, diagnostic: { message: string, range: [number, number, number, number] } }) => {
            // ... Bu komutun içeriği aynı kalıyor ...
            const uri = vscode.Uri.parse(args.uri);
            const document = await vscode.workspace.openTextDocument(uri);
            const range = new vscode.Range(new vscode.Position(args.diagnostic.range[0], args.diagnostic.range[1]), new vscode.Position(args.diagnostic.range[2], args.diagnostic.range[3]));
            const diagnostic = new vscode.Diagnostic(range, args.diagnostic.message);
            const apiKey = await context.secrets.get(API_KEY_SECRET_KEY);

            if (!apiKey) {
                vscode.window.showErrorMessage('Baykar AI API Anahtarı bulunamadı. Lütfen "Baykar AI: LLM API Anahtarını Ayarla" komutunu çalıştırarak anahtarınızı girin.');
                return;
            }

            const fullCode = document.getText();
            const prompt = `Aşağıdaki Python kodunda belirtilen hatayı düzelt. Sadece ve sadece, başka hiçbir açıklama veya yorum eklemeden, düzeltilmiş Python kodunun tamamını yanıt olarak ver. HATA BİLGİSİ: - Hata Mesajı: "${diagnostic.message}" - Satır Numarası: ${diagnostic.range.start.line + 1} DÜZELTİLECEK KODUN TAMAMI: --- ${fullCode} ---`;

            await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Baykar AI (Gemini) Düşünüyor...", cancellable: true }, async (progress, token) => {
                try {
                    const modelName = 'gemini-1.5-flash';
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
                    const data = { contents: [{ parts: [{ text: prompt }] }] };
                    const headers = { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey };
                    const response = await axios.post<GeminiResponse>(url, data, { headers });
                    let correctedCode = response.data.candidates[0].content.parts[0].text;
                    let cleanedCode = correctedCode.trim().replace(/^```python\s*|```\s*$/g, '').trim();
                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(fullCode.length));
                    edit.replace(document.uri, fullRange, cleanedCode);
                    await vscode.workspace.applyEdit(edit);
                    vscode.window.showInformationMessage('Kod, Baykar AI ile başarıyla düzeltildi!');
                } catch (error: any) {
                    console.error("API Hatası:", error.response ? error.response.data : error.message);
                    vscode.window.showErrorMessage('Baykar AI (Gemini) isteği sırasında bir hata oluştu.');
                }
            });
        });
    context.subscriptions.push(applyFixCommand);

    // Seçili kodu değiştirme komutu
    let modifyWithInputCommand = vscode.commands.registerCommand('baykar-ai-fixer.modifyWithInput',
        async (args: { uri: string, range: [number, number, number, number] }) => {
            // ... Bu komutun içeriği aynı kalıyor ...
            const uri = vscode.Uri.parse(args.uri);
            const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri.toString());
            if (!editor) {
                vscode.window.showErrorMessage('İlgili metin editörü bulunamadı.');
                return;
            }

            const selection = new vscode.Selection(
                new vscode.Position(args.range[0], args.range[1]),
                new vscode.Position(args.range[2], args.range[3])
            );

            const apiKey = await context.secrets.get(API_KEY_SECRET_KEY);
            if (!apiKey) {
                vscode.window.showErrorMessage('Baykar AI API Anahtarı bulunamadı. Lütfen "Baykar AI: LLM API Anahtarını Ayarla" komutunu çalıştırarak anahtarınızı girin.');
                return;
            }

            const userInstruction = await vscode.window.showInputBox({
                prompt: 'Seçili kod üzerinde ne yapmak istersiniz?',
                placeHolder: 'Örn: bu koda dokümantasyon ekle, try-catch bloğuna al, performansı iyileştir...'
            });

            if (!userInstruction) {
                return;
            }

            const selectedText = editor.document.getText(selection);
            const prompt = `Sen bir uzman Python geliştiricisisin. Aşağıdaki Python kodunu verilen talimata göre değiştir. Sadece ve sadece, başka hiçbir açıklama veya yorum eklemeden, istenen değişikliği yapılmış yeni kodu yanıt olarak ver.\n\nTALİMAT: "${userInstruction}"\n\nDEĞİŞTİRİLECEK KOD:\n---\n${selectedText}\n---`;

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Baykar AI İsteğinizi İşliyor...",
                cancellable: true
            }, async (progress, token) => {
                try {
                    const modelName = 'gemini-1.5-flash';
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
                    const data = { contents: [{ parts: [{ text: prompt }] }] };
                    const headers = { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey };
                    const response = await axios.post<GeminiResponse>(url, data, { headers });
                    let modifiedCode = response.data.candidates[0].content.parts[0].text;
                    let cleanedCode = modifiedCode.trim().replace(/^```python\s*|```\s*$/g, '').trim();

                    editor.edit(editBuilder => {
                        editBuilder.replace(selection, cleanedCode);
                    });
                    vscode.window.showInformationMessage('Kod, Baykar AI ile başarıyla düzenlendi!');
                } catch (error: any) {
                    console.error("API Hatası:", error.response ? error.response.data : error.message);
                    vscode.window.showErrorMessage('Baykar AI (Gemini) isteği sırasında bir hata oluştu.');
                }
            });
        });
    context.subscriptions.push(modifyWithInputCommand);

    // --- YENİ KOMUT: Seçili kodu ve konumunu Chat Provider'a gönderir
    let sendToChatCommand = vscode.commands.registerCommand('baykar-ai.sendToChat', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && !editor.selection.isEmpty) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            // Chat Provider'a bağlamı set etmesini söyle
            chatProvider.setActiveContext(editor.document.uri, selection, selectedText);

            // Kullanıcıya kolaylık olması için Chat panelini açıp oraya odaklan
            vscode.commands.executeCommand('baykar-ai-fixer.chatView.focus');
        } else {
            vscode.window.showInformationMessage('Lütfen önce bir kod bloğu seçin.');
        }
    });
    context.subscriptions.push(sendToChatCommand);


    // --- Provider'ların Kaydı
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider('python', new BaykarAiActionProvider(context), {
            providedCodeActionKinds: BaykarAiActionProvider.providedCodeActionKinds
        })
    );
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('python', new BaykarAiHoverProvider())
    );
    // Chat provider zaten yukarıda kaydedildi.

    // Durum Çubuğu Butonu ve Komutu
    const statusBarButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarButton.command = 'baykar-ai.showChat';
    statusBarButton.text = `$(comment-discussion) Baykar AI`;
    statusBarButton.tooltip = "Baykar AI Sohbet Panelini Aç";
    statusBarButton.show();
    context.subscriptions.push(statusBarButton);

    let showChatCommand = vscode.commands.registerCommand('baykar-ai.showChat', () => {
        vscode.commands.executeCommand('baykar-ai-fixer.chatView.focus');
    });
    context.subscriptions.push(showChatCommand);
}

export function deactivate() { }