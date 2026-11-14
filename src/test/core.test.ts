import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    collapseWords,
    compactWords,
    DEFAULT_COLORS,
    dedupeSpans,
    findSpans,
    foregroundFor,
    MAX_QUERY_LENGTH,
    nextSpan,
    normalizeQuery,
    previousSpan,
    readBoolean,
    removeWords,
    sanitizeColors,
    sanitizeMaxMatches,
    sanitizeRadius,
    toggleWords,
    wordsToPaint,
} from '../core';

interface Manifest {
    name: string;
    publisher: string;
    version: string;
    license: string;
    repository: { url: string };
    contributes: {
        commands: Array<{ command: string }>;
        keybindings: Array<{ command: string; key: string; when?: string }>;
        configuration: Array<{ properties: Record<string, { default?: unknown }> }>;
    };
}

function readManifest(): Manifest {
    return JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8')) as Manifest;
}

function starts(text: string, word: string, wholeWord: boolean, ignoreCase = false): number[] {
    return findSpans(text, word, wholeWord, ignoreCase, 100).map((span) => span.start);
}

describe('findSpans', () => {
    test('matches unicode whole words instead of relying on \\b', () => {
        for (const ignoreCase of [false, true]) {
            assert.deepEqual(starts('高亮', '高亮', true, ignoreCase), [0]);
            assert.deepEqual(starts('高亮测试', '高亮', true, ignoreCase), []);
            assert.deepEqual(starts('高亮 测试', '高亮', true, ignoreCase), [0]);
            assert.deepEqual(starts('（高亮）', '高亮', true, ignoreCase), [1]);
            assert.deepEqual(starts('foo_bar foo', 'foo', true, ignoreCase), [8]);
            assert.deepEqual(starts('foo-bar', 'foo', true, ignoreCase), [0]);
            assert.deepEqual(starts('foo$http $http $httpX', '$http', true, ignoreCase), [3, 9]);
        }
    });

    test('treats the query as literal text', () => {
        assert.deepEqual(starts('a.b aXb a.b', 'a.b', false), [0, 8]);
        assert.deepEqual(starts('foo bar foo barx', 'foo bar', true), [0]);
    });

    test('ignoreCase folds ascii without merging different words', () => {
        assert.deepEqual(starts('foo Foo FOO bar', 'foo', true, false), [0]);
        assert.deepEqual(starts('foo Foo FOO bar', 'foo', true, true), [0, 4, 8]);
    });

    test('does not overlap and stops at the match cap', () => {
        assert.deepEqual(findSpans('aaa', 'aa', false, false, 10), [{ start: 0, end: 2 }]);
        assert.equal(findSpans('a a a a', 'a', true, false, 2).length, 2);
        assert.deepEqual(findSpans('', 'a', true, false, 10), []);
        assert.deepEqual(findSpans('aaa', '', true, false, 10), []);
    });

    test('accepts a phrase that contains a newline', () => {
        assert.deepEqual(starts('foo\nbar', 'foo\nbar', false), [0]);
    });
});

describe('word list', () => {
    test('reuses empty slots so later words keep their color', () => {
        assert.deepEqual(toggleWords([], ['a'], false), ['a']);
        assert.deepEqual(toggleWords(['a'], ['b'], false), ['a', 'b']);
        assert.deepEqual(toggleWords(['a', 'b'], ['a'], false), ['', 'b']);
        assert.deepEqual(toggleWords(['', 'b'], ['c'], false), ['c', 'b']);
        assert.deepEqual(toggleWords(['a', 'b'], ['b'], false), ['a']);
        assert.deepEqual(toggleWords(['a'], ['a'], false), []);
    });

    test('toggles each distinct cursor once, ignoring case when asked', () => {
        assert.deepEqual(toggleWords(['Foo'], ['foo', 'foo'], true), []);
        assert.deepEqual(toggleWords(['Foo'], ['foo'], false), ['Foo', 'foo']);
        assert.deepEqual(toggleWords(['a', '', 'c'], ['b', 'd'], false), ['a', 'b', 'c', 'd']);
    });

    test('compacts only trailing holes', () => {
        assert.deepEqual(compactWords(['', 'a', '']), ['', 'a']);
        assert.deepEqual(compactWords(['', '']), []);
    });

    test('removes the picked entry without folding case', () => {
        assert.deepEqual(removeWords(['Foo', 'foo'], ['foo']), ['Foo']);
        assert.deepEqual(removeWords(['a', '', 'b'], ['a', 'b']), []);
    });

    test('collapses case-insensitive duplicates only when requested', () => {
        assert.deepEqual(collapseWords(['Foo', 'foo', 'bar'], true), ['Foo', '', 'bar']);
        assert.deepEqual(collapseWords(['Foo', 'foo'], false), ['Foo', 'foo']);
    });

    test('paints the first case-insensitive entry only', () => {
        assert.deepEqual(wordsToPaint(['Foo', '', 'foo', 'bar'], true), [
            { word: 'Foo', index: 0 },
            { word: 'bar', index: 3 },
        ]);
    });
});

describe('queries and settings', () => {
    test('normalizes selections', () => {
        assert.deepEqual(normalizeQuery('  foo \r\n'), { ok: true, word: 'foo' });
        assert.deepEqual(normalizeQuery('   '), { ok: false, reason: 'empty' });
        assert.deepEqual(normalizeQuery(undefined), { ok: false, reason: 'empty' });
        assert.deepEqual(normalizeQuery('x'.repeat(MAX_QUERY_LENGTH + 1)), { ok: false, reason: 'tooLong' });
    });

    test('rejects radii and match caps that would not render', () => {
        assert.equal(sanitizeRadius(' 3px '), '3px');
        assert.equal(sanitizeRadius('0.5rem'), '0.5rem');
        assert.equal(sanitizeRadius('5'), '5px');
        assert.equal(sanitizeRadius('5px; color: red'), '5px');
        assert.equal(sanitizeMaxMatches(1.9), 1);
        assert.equal(sanitizeMaxMatches(0), 1);
        assert.equal(sanitizeMaxMatches(Number.NaN), 5000);
        assert.equal(sanitizeMaxMatches(1_000_000), 100_000);
    });

    test('keeps only well-formed colors', () => {
        assert.deepEqual(sanitizeColors([
            { light: ' #fff ', dark: '#000' },
            { light: 'red', dark: 'blue', extra: true },
            { light: 'red; color: url(x)', dark: '#000' },
            { light: '#fff' },
            null,
            'nope',
        ]), [
            { light: '#fff', dark: '#000' },
            { light: 'red', dark: 'blue' },
        ]);
        assert.deepEqual(sanitizeColors('nope'), []);
    });

    test('reads booleans without coercing other types', () => {
        assert.equal(readBoolean(false, true), false);
        assert.equal(readBoolean('false', true), true);
    });
});

describe('contrast', () => {
    test('does not put white text on the default highlighter colors', () => {
        const darkText = [
            '#F5B041', '#FF9933', '#85C1E9', '#CD6155', '#AF7AC5',
            '#48C9B0', '#52BE80', '#F4D03F', '#ffff80', '#b3d9ff',
        ];
        for (const color of darkText) {
            assert.equal(foregroundFor(color), '#1a1a1a', color);
        }
        for (const color of DEFAULT_COLORS) {
            assert.equal(foregroundFor(color.light), '#1a1a1a', color.light);
            assert.ok(foregroundFor(color.dark));
        }
        assert.equal(foregroundFor('#000000'), '#ffffff');
        assert.equal(foregroundFor('#ffffff'), '#1a1a1a');
        assert.equal(foregroundFor('canvas'), undefined);
    });
});

describe('navigation', () => {
    const spans = [{ start: 0, end: 3 }, { start: 10, end: 13 }, { start: 10, end: 13 }];

    test('walks to the next or previous match and wraps', () => {
        const unique = dedupeSpans(spans);
        assert.deepEqual(unique, [{ start: 0, end: 3 }, { start: 10, end: 13 }]);
        assert.deepEqual(nextSpan(unique, 3), unique[1]);
        assert.deepEqual(nextSpan(unique, 13), unique[0]);
        assert.deepEqual(previousSpan(unique, 0), unique[1]);
        assert.deepEqual(previousSpan(unique, 10), unique[0]);
    });
});

describe('manifest', () => {
    test('keeps the published identity, commands, and setting keys', () => {
        const manifest = readManifest();
        assert.equal(manifest.name, 'highlight');
        assert.equal(manifest.publisher, 'M1nt-Ch0c0');
        assert.equal(manifest.version, '2.0.0');
        assert.equal(manifest.license, 'MIT');
        assert.equal(manifest.repository.url, 'https://github.com/M1nt-Ch0c0/highlight.git');

        const commands = manifest.contributes.commands.map((command) => command.command);
        assert.ok(commands.includes('highlight.selectedWords'));
        assert.ok(commands.includes('highlight.clearWords'));

        const toggle = manifest.contributes.keybindings.find((item) => item.command === 'highlight.selectedWords');
        const clear = manifest.contributes.keybindings.find((item) => item.command === 'highlight.clearWords');
        assert.equal(toggle?.key, 'shift+f8');
        assert.equal(clear?.key, 'ctrl+shift+f8');
        assert.equal(toggle?.when, 'editorTextFocus');
        assert.equal(clear?.when, 'editorTextFocus');

        const properties = manifest.contributes.configuration[0].properties;
        assert.equal(properties['highlight.configuration.ignoreCase'].default, false);
        assert.equal(properties['highlight.configuration.wholeWord'].default, true);
        assert.equal(properties['highlight.configuration.Bold'].default, true);
        assert.equal(properties['highlight.configuration.borderRadius'].default, '5px');
        assert.deepEqual(properties['highlight.configuration.colors'].default, DEFAULT_COLORS);
    });

    test('localizes every package.json token in both catalogs', () => {
        const root = join(__dirname, '../..');
        const manifestText = readFileSync(join(root, 'package.json'), 'utf8');
        const english = JSON.parse(readFileSync(join(root, 'package.nls.json'), 'utf8')) as Record<string, string>;
        const chinese = JSON.parse(readFileSync(join(root, 'package.nls.zh-cn.json'), 'utf8')) as Record<string, string>;
        assert.deepEqual(Object.keys(english).sort(), Object.keys(chinese).sort());
        for (const match of manifestText.matchAll(/%([^%\s]+)%/g)) {
            assert.equal(typeof english[match[1]], 'string', match[1]);
        }
    });
});
