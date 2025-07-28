import * as vscode from 'vscode';
import { COMMAND_IDS, EXTENSION_NAME } from '../core/constants';
import { ApplyFixArgs } from '../types';

/**
 * Provides hover information for diagnostics (errors, warnings) in the editor.
 * When the user hovers over a line with a diagnostic, this provider
 * creates a hover popup with details and a command link to fix the issue.
 */
export class BaykarAiHoverProvider implements vscode.HoverProvider {
    
    /**
     * This method is called by VS Code when the user hovers over text in a document.
     * @param document The document in which the hover was triggered.
     * @param position The position in the document where the hover occurred.
     * @returns A vscode.Hover object containing the content to be displayed, or null if no hover should be shown.
     */
    public provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
        
        // Find a diagnostic that intersects with the current hover position.
        const diagnosticAtPosition = vscode.languages.getDiagnostics(document.uri).find(d => d.range.contains(position));

        // If no diagnostic is found at the position, do not show a hover.
        if (!diagnosticAtPosition) {
            return null;
        }

        const markdown = new vscode.MarkdownString();
        // Trust the content to allow command links to be executed.
        markdown.isTrusted = true; 

        // Construct the content of the hover popup using Markdown.
        markdown.appendMarkdown(`**${EXTENSION_NAME} Fix**\n\n`);
        markdown.appendMarkdown(`*Problem: ${diagnosticAtPosition.message}*\n\n`);
        
        // Prepare the arguments that will be sent to the 'applyFix' command.
        const args: ApplyFixArgs = {
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
        
        // Create a command URI that VS Code can execute when the link is clicked.
        // The command ID is retrieved from constants for consistency.
        const commandUri = vscode.Uri.parse(
            `command:${COMMAND_IDS.applyFix}?${encodeURIComponent(JSON.stringify(args))}`
        );
        
        markdown.appendMarkdown(`[✈️ ${EXTENSION_NAME} ile Düzelt](${commandUri})`);

        return new vscode.Hover(markdown);
    }
}
