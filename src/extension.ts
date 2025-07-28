// src/extension.ts

import * as vscode from 'vscode';
import { BaykarAiActionProvider } from './providers/ActionProvider';
import { BaykarAiHoverProvider } from './providers/HoverProvider';
import { ChatViewProvider } from './providers/ChatViewProvider';
import { ApiServiceManager } from './services/ApiServiceManager';
import { createFixErrorPrompt, createModificationPrompt } from './core/promptBuilder';
import { COMMAND_IDS, UI_MESSAGES, EXTENSION_NAME, EXTENSION_ID, SETTINGS_KEYS, API_SERVICES } from './core/constants';
import { cleanLLMCodeBlock } from './core/utils';
import { ApplyFixArgs, ModifyWithInputArgs } from './types/index';

export function activate(context: vscode.ExtensionContext) {

    console.log(`"${EXTENSION_NAME}" eklentisi başarıyla aktif edildi!`);

    // --- 1. Servisleri Başlat ---
    // ApiServiceManager, vLLM ve Gemini servisleri arasındaki geçişi yönetir.
    const apiManager = new ApiServiceManager();

    // --- 2. Webview Sağlayıcısını Başlat ---
    // ChatViewProvider, sohbet paneli arayüzünü ve mantığını yönetir.
    const chatProvider = new ChatViewProvider(context, apiManager);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // --- 3. Komutları Kaydet ---
    // Artık ayar komutları burada değil, ChatViewProvider içinde yönetiliyor.

    // Sunucu durumunu kontrol etme komutu (aktif olan servisi kontrol eder).
    const checkConnectionCommand = vscode.commands.registerCommand(COMMAND_IDS.checkVllmStatus, async () => {
        const activeService = apiManager.getActiveServiceName();
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `${activeService} durumu kontrol ediliyor...`,
            cancellable: false
        }, async () => {
            const isConnected = await apiManager.checkConnection();
            if (isConnected) {
                vscode.window.showInformationMessage(`${activeService} ile bağlantı başarılı!`);
            } else {
                const errorMsg = activeService === API_SERVICES.gemini
                    ? UI_MESSAGES.geminiConnectionError
                    : UI_MESSAGES.vllmConnectionError;
                vscode.window.showErrorMessage(errorMsg);
            }
        });
    });

    // Hata düzeltme komutu.
    const applyFixCommand = vscode.commands.registerCommand(COMMAND_IDS.applyFix, async (args: ApplyFixArgs) => {
        const uri = vscode.Uri.parse(args.uri);
        const document = await vscode.workspace.openTextDocument(uri);
        const prompt = createFixErrorPrompt(args.diagnostic.message, args.diagnostic.range[0] + 1, document.getText());

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: UI_MESSAGES.thinking, cancellable: true }, async () => {
            try {
                const correctedCode = await apiManager.generateContent(prompt);
                const cleanedCode = cleanLLMCodeBlock(correctedCode);
                
                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
                edit.replace(document.uri, fullRange, cleanedCode);
                await vscode.workspace.applyEdit(edit);
                
                vscode.window.showInformationMessage(UI_MESSAGES.codeFixed);
            } catch (error: any) {
                const errorMsg = apiManager.getActiveServiceName() === API_SERVICES.gemini ? UI_MESSAGES.geminiConnectionError : UI_MESSAGES.vllmConnectionError;
                vscode.window.showErrorMessage(`${errorMsg} Lütfen sohbet panelindeki ayarları kontrol edin.`);
            }
        });
    });

    // Seçili kodu değiştirme komutu.
    const modifyWithInputCommand = vscode.commands.registerCommand(COMMAND_IDS.modifyWithInput, async (args: ModifyWithInputArgs) => {
        const uri = vscode.Uri.parse(args.uri);
        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri.toString());
        if (!editor) return;

        const selection = new vscode.Selection(new vscode.Position(args.range[0], args.range[1]), new vscode.Position(args.range[2], args.range[3]));
        const userInstruction = await vscode.window.showInputBox({ prompt: 'Seçili kod ile ne yapmak istersiniz?' });
        if (!userInstruction) return;

        const selectedText = editor.document.getText(selection);
        const prompt = createModificationPrompt(userInstruction, selectedText);

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: UI_MESSAGES.thinking, cancellable: true }, async () => {
            try {
                const modifiedCode = await apiManager.generateContent(prompt);
                const cleanedCode = cleanLLMCodeBlock(modifiedCode);
                editor.edit(editBuilder => editBuilder.replace(selection, cleanedCode));
                vscode.window.showInformationMessage(UI_MESSAGES.codeModified);
            } catch (error: any) {
                const errorMsg = apiManager.getActiveServiceName() === API_SERVICES.gemini ? UI_MESSAGES.geminiConnectionError : UI_MESSAGES.vllmConnectionError;
                vscode.window.showErrorMessage(`${errorMsg} Lütfen sohbet panelindeki ayarları kontrol edin.`);
            }
        });
    });
        
    // Seçili kodu sohbete gönderme komutu.
    const sendToChatCommand = vscode.commands.registerCommand(COMMAND_IDS.sendToChat, async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && !editor.selection.isEmpty) {
            chatProvider.setActiveContext(editor.document.uri, editor.selection, editor.document.getText(editor.selection));
            vscode.commands.executeCommand(`${EXTENSION_ID}.chatView.focus`);
        } else {
            vscode.window.showInformationMessage('Lütfen önce bir kod bloğu seçin.');
        }
    });

    // Sohbet panelini gösterme komutu.
    const showChatCommand = vscode.commands.registerCommand(COMMAND_IDS.showChat, () => {
        vscode.commands.executeCommand(`${EXTENSION_ID}.chatView.focus`);
    });

    // --- 4. Arayüz Elementlerini Oluştur ---
    // Aktif servisi gösteren ve tıklandığında sohbet panelini açan durum çubuğu butonu.
    const serviceStatusButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    serviceStatusButton.command = COMMAND_IDS.showChat;
    
    const updateStatusBar = () => {
        const activeService = apiManager.getActiveServiceName();
        serviceStatusButton.text = `$(chip) ${activeService}`;
        serviceStatusButton.tooltip = `Aktif Servis: ${activeService} (${EXTENSION_NAME} panelini aç)`;
    };
    
    updateStatusBar();
    serviceStatusButton.show();
    
    // Ayarlar değiştiğinde durum çubuğunu güncelle.
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(`${EXTENSION_ID}.${SETTINGS_KEYS.activeApiService}`)) {
            updateStatusBar();
        }
    }));

    // --- 5. Tüm Komponentleri Kaydet ---
    context.subscriptions.push(
        checkConnectionCommand,
        applyFixCommand,
        modifyWithInputCommand,
        sendToChatCommand,
        showChatCommand,
        serviceStatusButton,
        
        vscode.languages.registerCodeActionsProvider('python', new BaykarAiActionProvider(), {
            providedCodeActionKinds: BaykarAiActionProvider.providedCodeActionKinds
        }),
        vscode.languages.registerHoverProvider('python', new BaykarAiHoverProvider())
    );
}

export function deactivate() {}