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
    
    public uploadedFileContexts: Array<{
        uri: vscode.Uri;
        content: string;
        fileName: string;
    }> = [];

    public setEditorContext(uri: vscode.Uri, selection: vscode.Selection, text: string, webview: vscode.Webview) {
        this.clearAll(webview, false); 
        this.activeEditorUri = uri;
        this.activeSelection = selection;
        this.activeContextText = text;
        webview.postMessage({
            type: 'contextSet',
            payload: `Talimatınız seçili koda uygulanacaktır...`
        });
    }

    public async setFileContext(webview: vscode.Webview) {
        const fileUriArray = await vscode.window.showOpenDialog({ 
            canSelectMany: true, 
            openLabel: 'Dosyaları Seç',
            title: 'Analiz için 5 taneye kadar dosya seçin'
        });

        if (fileUriArray && fileUriArray.length > 0) {
            if (this.uploadedFileContexts.length + fileUriArray.length > 5) {
                vscode.window.showErrorMessage('En fazla 5 dosya ekleyebilirsiniz.');
                return;
            }

            // Önceki sadece dosya bağlamını temizle, seçili kodu değil.
            this.uploadedFileContexts = [];
            webview.postMessage({ type: 'clearContext' });


            for (const uri of fileUriArray) {
                if (this.uploadedFileContexts.some(f => f.uri.fsPath === uri.fsPath)) continue;

                const fileBytes = await vscode.workspace.fs.readFile(uri);
                const content = Buffer.from(fileBytes).toString('utf8');
                const fileName = path.basename(uri.fsPath);
                this.uploadedFileContexts.push({ uri, content, fileName });
            }
            
            const fileNames = this.uploadedFileContexts.map(f => f.fileName);
            webview.postMessage({ type: 'fileContextSet', fileNames: fileNames });
        }
    }
    
    public removeFileContext(fileNameToRemove: string, webview: vscode.Webview) {
        this.uploadedFileContexts = this.uploadedFileContexts.filter(f => f.fileName !== fileNameToRemove);
        
        // DÜZELTİLEN SATIR
        const fileNames = this.uploadedFileContexts.map(f => f.fileName);
        
        if (fileNames.length > 0) {
            webview.postMessage({ type: 'fileContextSet', fileNames: fileNames });
        } else {
            this.clearAll(webview);
        }
    }

    public clearAll(webview: vscode.Webview, notifyWebview: boolean = true) {
        this.activeEditorUri = undefined;
        this.activeSelection = undefined;
        this.activeContextText = undefined;
        this.uploadedFileContexts = [];
        if (notifyWebview) {
            webview.postMessage({ type: 'clearContext' });
        }
    }
}