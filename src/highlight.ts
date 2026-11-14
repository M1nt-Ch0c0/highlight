import * as vscode from 'vscode';
import {
    activeWords,
    collapseWords,
    dedupeSpans,
    findSpans,
    foregroundFor,
    MAX_QUERY_LENGTH,
    MatchSpan,
    nextSpan,
    normalizeQuery,
    previousSpan,
    removeWords,
    toggleWords,
    wordsToPaint,
} from './core';
import { readSettings, Settings } from './config';

const STATE_KEY = 'highlight.words.v1';
const DEBOUNCE_MS = 200;
const SKIP_SCHEMES = new Set(['output', 'vscode-debug-console']);

interface CachedSpans {
    version: number;
    length: number;
    signature: string;
    buckets: MatchSpan[][];
}

interface WordItem extends vscode.QuickPickItem {
    word: string;
}

export class Highlight implements vscode.Disposable {
    private words: string[] = [];
    private settings: Settings;
    private decorators: vscode.TextEditorDecorationType[] = [];
    private generation = 0;
    private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
    private readonly cache = new Map<string, CachedSpans>();
    private readonly rendered = new WeakMap<vscode.TextEditor, string>();
    private readonly status: vscode.StatusBarItem;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.settings = readSettings();
        this.decorators = this.createDecorators();
        this.words = this.restoreWords();
        if (!this.settings.persist) {
            void this.context.workspaceState.update(STATE_KEY, undefined);
        }
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.status.command = 'highlight.removeWord';
        this.status.name = vscode.l10n.t('Highlight');
        this.refreshStatus();
        this.decorateVisible();
    }

    dispose(): void {
        this.clearTimers();
        this.status.dispose();
        this.disposeDecorators(this.decorators);
    }

    async toggleSelection(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || SKIP_SCHEMES.has(editor.document.uri.scheme)) {
            return;
        }
        const queries: string[] = [];
        let tooLong = false;
        for (const selection of editor.selections) {
            const result = normalizeQuery(textFromSelection(editor, selection));
            if (result.ok) {
                queries.push(result.word);
            } else if (result.reason === 'tooLong') {
                tooLong = true;
            }
        }
        if (queries.length === 0) {
            if (tooLong) {
                void vscode.window.showWarningMessage(
                    vscode.l10n.t('Selection is too long to highlight (max {0} characters).', MAX_QUERY_LENGTH),
                );
            }
            return;
        }
        this.words = toggleWords(this.words, queries, this.settings.ignoreCase);
        await this.commit();
    }

    async clear(): Promise<void> {
        if (this.words.length === 0) {
            return;
        }
        this.words = [];
        await this.commit();
    }

    async removeOne(): Promise<void> {
        const current = activeWords(this.words);
        if (current.length === 0) {
            return;
        }
        const picked = await vscode.window.showQuickPick<WordItem>(
            current.map((word) => wordItem(word)),
            {
                canPickMany: true,
                placeHolder: vscode.l10n.t('Select highlighted words to remove'),
            },
        );
        if (!picked || picked.length === 0) {
            return;
        }
        this.words = removeWords(this.words, picked.map((item) => item.word));
        await this.commit();
    }

    move(direction: 1 | -1): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor || SKIP_SCHEMES.has(editor.document.uri.scheme)) {
            return;
        }
        const spans = dedupeSpans(this.spansFor(editor.document).reduce((all, bucket) => all.concat(bucket), [] as MatchSpan[]));
        if (spans.length === 0) {
            void vscode.window.showInformationMessage(vscode.l10n.t('No highlighted words in this editor.'));
            return;
        }
        const offset = editor.document.offsetAt(direction > 0 ? editor.selection.end : editor.selection.start);
        const target = direction > 0 ? nextSpan(spans, offset) : previousSpan(spans, offset);
        const range = new vscode.Range(
            editor.document.positionAt(target.start),
            editor.document.positionAt(target.end),
        );
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    onDocumentChanged(document: vscode.TextDocument): void {
        if (activeWords(this.words).length === 0 || SKIP_SCHEMES.has(document.uri.scheme)) {
            return;
        }
        const key = document.uri.toString();
        const visible = vscode.window.visibleTextEditors.some((editor) => editor.document.uri.toString() === key);
        if (!visible) {
            return;
        }
        const pending = this.timers.get(key);
        if (pending) {
            clearTimeout(pending);
        }
        this.timers.set(key, setTimeout(() => {
            this.timers.delete(key);
            this.decorateDocument(key);
        }, DEBOUNCE_MS));
    }

    onEditorsChanged(): void {
        this.decorateVisible();
    }

    onDocumentClosed(document: vscode.TextDocument): void {
        const key = document.uri.toString();
        this.cache.delete(key);
        const pending = this.timers.get(key);
        if (pending) {
            clearTimeout(pending);
            this.timers.delete(key);
        }
    }

    updateConfig(): void {
        void this.rebuild().catch((error: unknown) => {
            console.error('highlight: failed to apply configuration', error);
        });
    }

    private async rebuild(): Promise<void> {
        const previous = this.decorators;
        this.settings = readSettings();
        this.words = collapseWords(this.words, this.settings.ignoreCase);
        this.generation++;
        this.decorators = this.createDecorators();
        this.cache.clear();
        if (!this.settings.persist) {
            await this.context.workspaceState.update(STATE_KEY, undefined);
        } else {
            await this.persist();
        }
        this.decorateVisible();
        this.refreshStatus();
        this.disposeDecorators(previous);
    }

    private async commit(): Promise<void> {
        this.clearTimers();
        this.cache.clear();
        await this.persist();
        this.decorateVisible();
        this.refreshStatus();
    }

    private async persist(): Promise<void> {
        if (!this.settings.persist) {
            return;
        }
        await this.context.workspaceState.update(STATE_KEY, this.words);
    }

    private restoreWords(): string[] {
        if (!this.settings.persist) {
            return [];
        }
        const saved = this.context.workspaceState.get<unknown>(STATE_KEY);
        if (!Array.isArray(saved) || saved.length > 128 || !saved.every((item) => typeof item === 'string')) {
            return [];
        }
        return collapseWords(saved.map((word) => {
            if (word === '') {
                return '';
            }
            const query = normalizeQuery(word);
            return query.ok ? query.word : '';
        }), this.settings.ignoreCase);
    }

    private decorateVisible(): void {
        const editors = this.visibleEditors();
        if (activeWords(this.words).length === 0) {
            const empty = this.decorators.map(() => [] as MatchSpan[]);
            for (const editor of editors) {
                this.apply(editor, empty);
            }
            return;
        }
        for (const editor of editors) {
            this.apply(editor, this.spansFor(editor.document));
        }
    }

    private decorateDocument(key: string): void {
        for (const editor of this.visibleEditors()) {
            if (editor.document.uri.toString() === key) {
                this.apply(editor, this.spansFor(editor.document));
            }
        }
    }

    private visibleEditors(): vscode.TextEditor[] {
        return vscode.window.visibleTextEditors.filter((editor) => !SKIP_SCHEMES.has(editor.document.uri.scheme));
    }

    private spansFor(document: vscode.TextDocument): MatchSpan[][] {
        const signature = this.signature();
        const key = document.uri.toString();
        const length = documentLength(document);
        const cached = this.cache.get(key);
        if (cached && cached.version === document.version && cached.length === length && cached.signature === signature) {
            return cached.buckets;
        }
        const buckets = this.decorators.map(() => [] as MatchSpan[]);
        if (buckets.length === 0) {
            return buckets;
        }
        const text = document.getText();
        for (const entry of wordsToPaint(this.words, this.settings.ignoreCase)) {
            const colorIndex = entry.index % buckets.length;
            const found = findSpans(
                text,
                entry.word,
                this.settings.wholeWord,
                this.settings.ignoreCase,
                this.settings.maxMatches,
            );
            buckets[colorIndex] = buckets[colorIndex].concat(found);
        }
        if (this.cache.size > 32) {
            this.cache.clear();
        }
        this.cache.set(key, { version: document.version, length, signature, buckets });
        return buckets;
    }

    private apply(editor: vscode.TextEditor, buckets: MatchSpan[][]): void {
        const token = `${this.generation}:${editor.document.version}:${this.signature()}`;
        if (this.rendered.get(editor) === token) {
            return;
        }
        this.decorators.forEach((decorator, index) => {
            const spans = buckets[index] ?? [];
            const ranges = spans.map((span) => new vscode.Range(
                editor.document.positionAt(span.start),
                editor.document.positionAt(span.end),
            ));
            editor.setDecorations(decorator, ranges);
        });
        this.rendered.set(editor, token);
    }

    private signature(): string {
        return JSON.stringify({
            words: this.words,
            wholeWord: this.settings.wholeWord,
            ignoreCase: this.settings.ignoreCase,
            maxMatches: this.settings.maxMatches,
            colors: this.decorators.length,
            bold: this.settings.bold,
            radius: this.settings.borderRadius,
        });
    }

    private refreshStatus(): void {
        const words = activeWords(this.words);
        if (!this.settings.showStatusBar || words.length === 0) {
            this.status.hide();
            return;
        }
        this.status.text = `$(highlight) ${words.length}`;
        this.status.tooltip = words.map(displayWord).concat(['', vscode.l10n.t('Click to remove words')]).join('\n');
        this.status.accessibilityInformation = {
            label: vscode.l10n.t('{0} highlighted words', words.length),
        };
        this.status.show();
    }

    private createDecorators(): vscode.TextEditorDecorationType[] {
        return this.settings.colors.map((color) => vscode.window.createTextEditorDecorationType({
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            light: renderOptions(color.light, this.settings),
            dark: renderOptions(color.dark, this.settings),
        }));
    }

    private clearTimers(): void {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }

    private disposeDecorators(decorators: vscode.TextEditorDecorationType[]): void {
        for (const decorator of decorators) {
            decorator.dispose();
        }
    }
}

function renderOptions(background: string, settings: Settings): vscode.DecorationRenderOptions {
    const options: vscode.DecorationRenderOptions = {
        backgroundColor: background,
        fontWeight: settings.bold ? 'bold' : 'normal',
        borderRadius: settings.borderRadius,
        overviewRulerColor: background,
    };
    const foreground = foregroundFor(background);
    if (foreground) {
        options.color = foreground;
    }
    return options;
}

function documentLength(document: vscode.TextDocument): number {
    if (document.lineCount === 0) {
        return 0;
    }
    return document.offsetAt(document.lineAt(document.lineCount - 1).range.end);
}

function textFromSelection(editor: vscode.TextEditor, selection: vscode.Selection): string {
    if (!selection.isEmpty) {
        return editor.document.getText(selection);
    }
    const range = editor.document.getWordRangeAtPosition(selection.start);
    return range ? editor.document.getText(range) : '';
}

function displayWord(word: string): string {
    const singleLine = word.replace(/\n/g, '⏎');
    return singleLine.length > 80 ? `${singleLine.slice(0, 79)}…` : singleLine;
}

function wordItem(word: string): WordItem {
    const label = displayWord(word);
    return label === word ? { label, word } : { label, word, description: word.replace(/\n/g, '⏎') };
}
