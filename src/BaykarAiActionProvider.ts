import * as vscode from 'vscode';

export class BaykarAiActionProvider implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.RefactorRewrite // Yeni eklenen tür
    ];

    constructor(private context: vscode.ExtensionContext) { }

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        const actions: vscode.CodeAction[] = [];

        // Mevcut Hata Düzeltme Mantığı (QuickFix)
        // Eğer bir hata üzerinde duruluyorsa, "Baykar AI ile Düzelt" seçeneğini göster.
        const diagnostic = context.diagnostics.find(d => d.range.contains(range));
        if (diagnostic) {
            actions.push(this.createFixAction(document, diagnostic));
        }

        // YENİ EKLENEN: Seçim Üzerinde Çalışma Mantığı (RefactorRewrite)
        // Eğer kullanıcı bir metin bloğu seçtiyse (ve bu bir hata değilse),
        // "Baykar AI ile Değiştir" seçeneğini göster.
        if (range instanceof vscode.Selection && !range.isEmpty) {
            actions.push(this.createModifyAction(document, range));
        }
        
        return actions;
    }

    // Hata düzeltme için CodeAction oluşturan fonksiyon (Mevcut)
    private createFixAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const action = new vscode.CodeAction('✈️ Baykar AI ile Düzelt', vscode.CodeActionKind.QuickFix);
        const args = {
            uri: document.uri.toString(),
            diagnostic: {
                message: diagnostic.message,
                range: [
                    diagnostic.range.start.line, diagnostic.range.start.character,
                    diagnostic.range.end.line, diagnostic.range.end.character
                ]
            }
        };
        action.command = {
            command: 'baykar-ai-fixer.applyFix',
            title: 'Baykar AI Düzeltmesini Uygula',
            arguments: [args]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        return action;
    }

    // YENİ EKLENEN: Seçili kodu değiştirmek için CodeAction oluşturan fonksiyon
    private createModifyAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const action = new vscode.CodeAction('✈️ Baykar AI ile Değiştir...', vscode.CodeActionKind.RefactorRewrite);
        const args = {
            uri: document.uri.toString(),
            range: [
                range.start.line, range.start.character,
                range.end.line, range.end.character
            ]
        };
        // Bu, extension.ts içinde tanımlayacağımız yeni bir komutu çağıracak
        action.command = {
            command: 'baykar-ai-fixer.modifyWithInput',
            title: 'Baykar AI ile Değiştir',
            arguments: [args]
        };
        return action;
    }
}