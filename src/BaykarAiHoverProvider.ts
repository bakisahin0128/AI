import * as vscode from 'vscode';

export class BaykarAiHoverProvider implements vscode.HoverProvider {
    
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        
        const diagnosticAtPosition = vscode.languages.getDiagnostics(document.uri).find(d => d.range.contains(position));

        if (!diagnosticAtPosition) {
            return null;
        }

        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;

        markdown.appendMarkdown(`**Baykar AI Düzeltme**\n\n`);
        markdown.appendMarkdown(`*Hata: ${diagnosticAtPosition.message}*\n\n`);
        
        const args = {
            uri: document.uri.toString(),
            diagnostic: {
                message: diagnosticAtPosition.message,
                range: [
                    diagnosticAtPosition.range.start.line,
                    diagnosticAtPosition.range.start.character,
                    diagnosticAtPosition.range.end.line,
                    diagnosticAtPosition.range.end.character
                ]
            }
        };
        
        const commandUri = vscode.Uri.parse(
            `command:baykar-ai-fixer.applyFix?${encodeURIComponent(JSON.stringify(args))}`
        );
        
        markdown.appendMarkdown(`[✈️ Baykar AI ile Düzelt](${commandUri})`);

        return new vscode.Hover(markdown);
    }
}