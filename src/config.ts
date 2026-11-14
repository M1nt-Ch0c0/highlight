import * as vscode from 'vscode';
import {
    DEFAULT_COLORS,
    HighlightColor,
    readBoolean,
    sanitizeColors,
    sanitizeMaxMatches,
    sanitizeRadius,
} from './core';

export interface Settings {
    wholeWord: boolean;
    ignoreCase: boolean;
    bold: boolean;
    borderRadius: string;
    colors: HighlightColor[];
    maxMatches: number;
    showStatusBar: boolean;
    persist: boolean;
}

export function readSettings(): Settings {
    const config = vscode.workspace.getConfiguration('highlight.configuration');
    const colors = sanitizeColors(config.get('colors'));
    return {
        wholeWord: readBoolean(config.get('wholeWord'), true),
        ignoreCase: readBoolean(config.get('ignoreCase'), false),
        bold: readBoolean(config.get('Bold'), true),
        borderRadius: sanitizeRadius(config.get('borderRadius')),
        colors: colors.length > 0 ? colors : DEFAULT_COLORS.slice(),
        maxMatches: sanitizeMaxMatches(config.get('maxMatches')),
        showStatusBar: readBoolean(config.get('showStatusBar'), true),
        persist: readBoolean(config.get('persist'), true),
    };
}
