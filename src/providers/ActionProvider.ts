import * as vscode from 'vscode';
import { COMMAND_IDS, EXTENSION_NAME } from '../core/constants';
import { ApplyFixArgs, ModifyWithInputArgs } from '../types/index';

/**
 * Provides Code Actions (Quick Fixes and Refactors) for the extension.
 * This class is responsible for showing context-aware actions to the user,
 * such as fixing a diagnostic error or refactoring a selection of code.
 */
export class BaykarAiActionProvider implements vscode.CodeActionProvider {

    /**
     * Specifies the kinds of CodeActions this provider can create.
     * - QuickFix: Actions that address errors or warnings (diagnostics).
     * - RefactorRewrite: Actions that modify code without changing its behavior.
     */
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.RefactorRewrite
    ];

    constructor() { }

    /**
     * This method is called by VS Code to provide code actions for a given document and range.
     * @param document The document in which the command was invoked.
     * @param range The range for which the command was invoked.
     * @param context Contextual information, including diagnostics.
     * @returns An array of CodeAction or Command objects.
     */
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        const actions: vscode.CodeAction[] = [];

        // Find a diagnostic (e.g., an error) that intersects with the current range.
        // If found, create a "Quick Fix" action for it.
        const diagnostic = context.diagnostics.find(d => d.range.contains(range));
        if (diagnostic) {
            actions.push(this.createFixAction(document, diagnostic));
        }

        // If the user has selected a non-empty block of code,
        // create a "Refactor" action for the selection.
        if (range instanceof vscode.Selection && !range.isEmpty) {
            actions.push(this.createModifyAction(document, range));
        }

        return actions;
    }

    /**
     * Creates a "Quick Fix" CodeAction for a given diagnostic.
     * This action will trigger the 'applyFix' command.
     * @param document The text document containing the diagnostic.
     * @param diagnostic The diagnostic to be fixed.
     * @returns A configured CodeAction for fixing the error.
     */
    private createFixAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const action = new vscode.CodeAction(`✈️ ${EXTENSION_NAME} ile Düzelt`, vscode.CodeActionKind.QuickFix);

        const args: ApplyFixArgs = {
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
            command: COMMAND_IDS.applyFix,
            title: `${EXTENSION_NAME} Düzeltmesini Uygula`,
            arguments: [args]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true; // Makes this the default action (e.g., on Ctrl + .)
        return action;
    }

    /**
     * Creates a "Refactor" CodeAction to modify the selected code.
     * This action will trigger the 'modifyWithInput' command.
     * @param document The text document containing the selection.
     * @param range The selected range of code to modify.
     * @returns A configured CodeAction for modifying the selection.
     */
    private createModifyAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const action = new vscode.CodeAction(`✈️ ${EXTENSION_NAME} ile Değiştir...`, vscode.CodeActionKind.RefactorRewrite);

        const args: ModifyWithInputArgs = {
            uri: document.uri.toString(),
            range: [
                range.start.line, range.start.character,
                range.end.line, range.end.character
            ]
        };

        action.command = {
            command: COMMAND_IDS.modifyWithInput,
            title: `${EXTENSION_NAME} ile Değiştir`,
            arguments: [args]
        };
        return action;
    }
}
