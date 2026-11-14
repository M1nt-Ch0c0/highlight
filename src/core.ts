export interface MatchSpan {
    start: number;
    end: number;
}

export interface HighlightColor {
    light: string;
    dark: string;
}

export type QueryResult =
    | { ok: true; word: string }
    | { ok: false; reason: 'empty' | 'tooLong' };

export const MAX_QUERY_LENGTH = 200;

export const DEFAULT_COLORS: readonly HighlightColor[] = [
    { light: '#b3d9ff', dark: '#F5B041' },
    { light: '#e6ffb3', dark: '#FF9933' },
    { light: '#b3b3ff', dark: '#85C1E9' },
    { light: '#ffd9b3', dark: '#CD6155' },
    { light: '#ffb3ff', dark: '#AF7AC5' },
    { light: '#b3ffb3', dark: '#48C9B0' },
    { light: '#ffff80', dark: '#52BE80' },
    { light: '#d1e0e0', dark: '#F4D03F' },
];

const WORD_CHAR = /[\p{L}\p{N}_]/u;
const DARK_TEXT = '#1a1a1a';
const LIGHT_TEXT = '#ffffff';

export function findSpans(
    text: string,
    word: string,
    wholeWord: boolean,
    ignoreCase: boolean,
    maxMatches: number,
): MatchSpan[] {
    if (!word || maxMatches <= 0) {
        return [];
    }
    if (!ignoreCase) {
        return findLiteral(text, word, wholeWord, maxMatches);
    }
    return findRegex(text, word, wholeWord, maxMatches);
}

export function sameWord(a: string, b: string, ignoreCase: boolean): boolean {
    if (!ignoreCase) {
        return a === b;
    }
    return a.toLowerCase() === b.toLowerCase();
}

export function uniqueWords(words: readonly string[], ignoreCase: boolean): string[] {
    const unique: string[] = [];
    for (const word of words) {
        if (!unique.some((existing) => sameWord(existing, word, ignoreCase))) {
            unique.push(word);
        }
    }
    return unique;
}

// 用空字符串占位，而不是把后面的词前移，这样每个词保持原来的颜色。
export function toggleWords(words: readonly string[], incoming: readonly string[], ignoreCase: boolean): string[] {
    const next = words.slice();
    for (const word of uniqueWords(incoming, ignoreCase)) {
        const existing = next.findIndex((item) => item !== '' && sameWord(item, word, ignoreCase));
        if (existing >= 0) {
            next[existing] = '';
            continue;
        }
        const hole = next.findIndex((item) => item === '');
        if (hole >= 0) {
            next[hole] = word;
        } else {
            next.push(word);
        }
    }
    return compactWords(next);
}

export function removeWords(words: readonly string[], removing: readonly string[]): string[] {
    const drop = new Set(removing);
    return compactWords(words.map((word) => (word !== '' && drop.has(word) ? '' : word)));
}

export function collapseWords(words: readonly string[], ignoreCase: boolean): string[] {
    if (!ignoreCase) {
        return compactWords(words.slice());
    }
    const seen: string[] = [];
    return compactWords(words.map((word) => {
        if (word === '') {
            return '';
        }
        if (seen.some((item) => sameWord(item, word, true))) {
            return '';
        }
        seen.push(word);
        return word;
    }));
}

export function compactWords(words: readonly string[]): string[] {
    let end = words.length;
    while (end > 0 && words[end - 1] === '') {
        end--;
    }
    const sliced = words.slice(0, end);
    if (sliced.every((word) => word === '')) {
        return [];
    }
    return sliced;
}

export function activeWords(words: readonly string[]): string[] {
    return words.filter((word) => word !== '');
}

export function wordsToPaint(words: readonly string[], ignoreCase: boolean): Array<{ word: string; index: number }> {
    const seen: string[] = [];
    const paint: Array<{ word: string; index: number }> = [];
    words.forEach((word, index) => {
        if (word === '') {
            return;
        }
        if (seen.some((item) => sameWord(item, word, ignoreCase))) {
            return;
        }
        seen.push(word);
        paint.push({ word, index });
    });
    return paint;
}

export function normalizeQuery(raw: string | undefined, maxLength = MAX_QUERY_LENGTH): QueryResult {
    if (!raw) {
        return { ok: false, reason: 'empty' };
    }
    const word = raw.replace(/\r\n/g, '\n').trim();
    if (!word) {
        return { ok: false, reason: 'empty' };
    }
    if (word.length > maxLength) {
        return { ok: false, reason: 'tooLong' };
    }
    return { ok: true, word };
}

export function sanitizeRadius(value: unknown, fallback = '5px'): string {
    if (typeof value !== 'string') {
        return fallback;
    }
    const radius = value.trim();
    if (/^\d+(\.\d+)?(px|em|rem|%)$/.test(radius)) {
        return radius;
    }
    return fallback;
}

export function sanitizeMaxMatches(value: unknown, fallback = 5000): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(100_000, Math.max(1, Math.floor(value)));
}

export function sanitizeColors(input: unknown): HighlightColor[] {
    if (!Array.isArray(input)) {
        return [];
    }
    const colors: HighlightColor[] = [];
    for (const item of input) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        const record = item as Record<string, unknown>;
        if (!isCssColor(record.light) || !isCssColor(record.dark)) {
            continue;
        }
        colors.push({ light: record.light.trim(), dark: record.dark.trim() });
    }
    return colors;
}

export function readBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

export function dedupeSpans(spans: readonly MatchSpan[]): MatchSpan[] {
    const sorted = spans.slice().sort((a, b) => a.start - b.start || a.end - b.end);
    const unique: MatchSpan[] = [];
    for (const span of sorted) {
        const last = unique[unique.length - 1];
        if (!last || last.start !== span.start || last.end !== span.end) {
            unique.push(span);
        }
    }
    return unique;
}

export function nextSpan(spans: readonly MatchSpan[], offset: number): MatchSpan {
    for (const span of spans) {
        if (span.start >= offset) {
            return span;
        }
    }
    return spans[0];
}

export function previousSpan(spans: readonly MatchSpan[], offset: number): MatchSpan {
    for (let index = spans.length - 1; index >= 0; index--) {
        if (spans[index].start < offset) {
            return spans[index];
        }
    }
    return spans[spans.length - 1];
}

interface Rgb {
    r: number;
    g: number;
    b: number;
}

export function parseColor(input: string): Rgb | undefined {
    const color = input.trim();
    const hex = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(color);
    if (hex) {
        const digits = hex[1];
        const expanded = digits.length <= 4
            ? digits.slice(0, 3).split('').map((channel) => channel + channel).join('')
            : digits.slice(0, 6);
        return {
            r: Number.parseInt(expanded.slice(0, 2), 16),
            g: Number.parseInt(expanded.slice(2, 4), 16),
            b: Number.parseInt(expanded.slice(4, 6), 16),
        };
    }
    const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.exec(color);
    if (!rgb) {
        return undefined;
    }
    const channels = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    if (channels.some((channel) => channel > 255)) {
        return undefined;
    }
    return { r: channels[0], g: channels[1], b: channels[2] };
}

export function relativeLuminance(color: string): number | undefined {
    const rgb = parseColor(color);
    if (!rgb) {
        return undefined;
    }
    return 0.2126 * channelLuminance(rgb.r) + 0.7152 * channelLuminance(rgb.g) + 0.0722 * channelLuminance(rgb.b);
}

export function foregroundFor(background: string): string | undefined {
    const luminance = relativeLuminance(background);
    const darkLuminance = relativeLuminance(DARK_TEXT);
    if (luminance === undefined || darkLuminance === undefined) {
        return undefined;
    }
    const onDark = contrast(luminance, darkLuminance);
    const onLight = contrast(luminance, 1);
    return onDark >= onLight ? DARK_TEXT : LIGHT_TEXT;
}

function findLiteral(text: string, word: string, wholeWord: boolean, maxMatches: number): MatchSpan[] {
    const checkLeft = wholeWord && startsWithWordChar(word);
    const checkRight = wholeWord && endsWithWordChar(word);
    const spans: MatchSpan[] = [];
    let from = 0;
    while (spans.length < maxMatches) {
        const start = text.indexOf(word, from);
        if (start < 0) {
            break;
        }
        const end = start + word.length;
        if (boundaryOk(text, start, end, checkLeft, checkRight)) {
            spans.push({ start, end });
        }
        from = end;
    }
    return spans;
}

function findRegex(text: string, word: string, wholeWord: boolean, maxMatches: number): MatchSpan[] {
    let pattern = escapeRegExp(word);
    // 只在首尾本身是词字符时加边界。$http、中文不会被 \b 漏掉。
    if (wholeWord && startsWithWordChar(word)) {
        pattern = `(?<![\\p{L}\\p{N}_])${pattern}`;
    }
    if (wholeWord && endsWithWordChar(word)) {
        pattern = `${pattern}(?![\\p{L}\\p{N}_])`;
    }
    let regex: RegExp;
    try {
        regex = new RegExp(pattern, 'giu');
    } catch {
        return [];
    }
    const spans: MatchSpan[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null && spans.length < maxMatches) {
        if (match[0].length === 0) {
            regex.lastIndex++;
            continue;
        }
        spans.push({ start: match.index, end: match.index + match[0].length });
    }
    return spans;
}

function boundaryOk(text: string, start: number, end: number, checkLeft: boolean, checkRight: boolean): boolean {
    if (checkLeft && !leftBoundaryOk(text, start)) {
        return false;
    }
    if (checkRight && !rightBoundaryOk(text, end)) {
        return false;
    }
    return true;
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function startsWithWordChar(word: string): boolean {
    const codePoint = word.codePointAt(0);
    return codePoint !== undefined && isWordCodePoint(codePoint);
}

function endsWithWordChar(word: string): boolean {
    const index = codePointIndexBefore(word, word.length);
    const codePoint = index >= 0 ? word.codePointAt(index) : undefined;
    return codePoint !== undefined && isWordCodePoint(codePoint);
}

function leftBoundaryOk(text: string, start: number): boolean {
    const before = codePointIndexBefore(text, start);
    if (before < 0) {
        return true;
    }
    const codePoint = text.codePointAt(before);
    return codePoint === undefined || !isWordCodePoint(codePoint);
}

function rightBoundaryOk(text: string, end: number): boolean {
    if (end >= text.length) {
        return true;
    }
    const codePoint = text.codePointAt(end);
    return codePoint === undefined || !isWordCodePoint(codePoint);
}

function codePointIndexBefore(text: string, index: number): number {
    if (index <= 0) {
        return -1;
    }
    const previous = index - 1;
    const code = text.charCodeAt(previous);
    if (code >= 0xdc00 && code <= 0xdfff && previous > 0) {
        const lead = text.charCodeAt(previous - 1);
        if (lead >= 0xd800 && lead <= 0xdbff) {
            return previous - 1;
        }
    }
    return previous;
}

function isWordCodePoint(codePoint: number): boolean {
    return WORD_CHAR.test(String.fromCodePoint(codePoint));
}

function isCssColor(value: unknown): value is string {
    if (typeof value !== 'string') {
        return false;
    }
    const color = value.trim();
    if (color.length === 0 || color.length > 80) {
        return false;
    }
    return !/[\n\r;{}<>]/.test(color);
}

function channelLuminance(channel: number): number {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrast(lighterOrDarker: number, other: number): number {
    const lighter = Math.max(lighterOrDarker, other);
    const darker = Math.min(lighterOrDarker, other);
    return (lighter + 0.05) / (darker + 0.05);
}
