import * as vscode from 'vscode';
import { Highlight } from './highlight';

export function activate(context: vscode.ExtensionContext): void {
    const highlight = new Highlight(context);
    context.subscriptions.push(
        highlight,
        vscode.commands.registerCommand('highlight.selectedWords', () => highlight.toggleSelection()),
        vscode.commands.registerCommand('highlight.clearWords', () => highlight.clear()),
        vscode.commands.registerCommand('highlight.nextOccurrence', () => highlight.move(1)),
        vscode.commands.registerCommand('highlight.previousOccurrence', () => highlight.move(-1)),
        vscode.commands.registerCommand('highlight.removeWord', () => highlight.removeOne()),
        vscode.workspace.onDidChangeTextDocument((event) => highlight.onDocumentChanged(event.document)),
        vscode.workspace.onDidCloseTextDocument((document) => highlight.onDocumentClosed(document)),
        vscode.window.onDidChangeVisibleTextEditors(() => highlight.onEditorsChanged()),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('highlight.configuration')) {
                highlight.updateConfig();
            }
        }),
    );
}

export function deactivate(): void { }
