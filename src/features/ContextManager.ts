/* ==========================================================================
   DOSYA 3: src/features/ContextManager.ts (YENİ DOSYA)
   
   SORUMLULUK: Editörden seçilen kod veya yüklenen dosya gibi geçici
   bağlamları yönetir.
   ========================================================================== */

import * as vscode from 'vscode';
import * as path from 'path';

export class ContextManager {
    public activeEditorUri?: vscode.Uri;
    public activeSelection?: vscode.Selection;
    public activeContextText?: string;
    public uploadedFileContext?: {
        uri: vscode.Uri;
        content: string;
        fileName: string;
    };

    public setEditorContext(uri: vscode.Uri, selection: vscode.Selection, text: string, webview: vscode.Webview) {
        this.clearAll(webview, false); // Webview'e mesaj göndermeden temizle
        this.activeEditorUri = uri;
        this.activeSelection = selection;
        this.activeContextText = text;
        webview.postMessage({
            type: 'contextSet',
            payload: `Talimatınız seçili koda uygulanacaktır...`
        });
    }

    public async setFileContext(webview: vscode.Webview) {
        const fileUriArray = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Dosyayı Seç' });
        if (fileUriArray && fileUriArray[0]) {
            const uri = fileUriArray[0];
            const fileBytes = await vscode.workspace.fs.readFile(uri);
            const content = Buffer.from(fileBytes).toString('utf8');
            const fileName = path.basename(uri.fsPath);
            this.clearAll(webview, false); // Webview'e mesaj göndermeden temizle
            this.uploadedFileContext = { uri, content, fileName };
            webview.postMessage({ type: 'fileContextSet', fileName: fileName });
        }
    }

    public clearAll(webview: vscode.Webview, notifyWebview: boolean = true) {
        this.activeEditorUri = undefined;
        this.activeSelection = undefined;
        this.activeContextText = undefined;
        this.uploadedFileContext = undefined;
        if (notifyWebview) {
            webview.postMessage({ type: 'clearContext' });
        }
    }
}
