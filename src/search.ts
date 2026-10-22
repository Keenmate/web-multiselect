/**
 * Internal-search primitives: text normalization (`search-behavior`) and term matching
 * (`search-match`). Pure functions — the picker prepares each option's search value once
 * with `normalizeSearchText` and tests it per keystroke with `matchesText`.
 */
import type { SearchBehavior, SearchMatch } from './types';

/** Letters `normalized` folds by hand — they have no Unicode decomposition (or, for `ς`,
 *  lowercase differently by position) so stripping combining marks alone misses them. */
const FOLD_EXTRA: Record<string, string> = {
    'ł': 'l', 'ø': 'o', 'đ': 'd', 'ð': 'd', 'ħ': 'h', 'ı': 'i', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ς': 'σ'
};

/**
 * The standard search normalization, exported so a custom search (`searchCallback`,
 * `getSearchValueCallback`, `getSearchTermCallback`, a FlexSearch encoder) can prepare text
 * exactly the way internal search does.
 *
 * - `normalized` (default) — lowercase, diacritics stripped: `Český` → `cesky`, `Łódź` → `lodz`
 * - `case-insensitive` — lowercase only: `Český` → `český`
 * - `exact` — unchanged
 *
 * Every mode applies Unicode NFC first, so a composed `č` and a decomposed `c` + combining
 * caron compare equal.
 */
export function normalizeSearchText(text: string, behavior: SearchBehavior = 'normalized'): string {
    if (behavior === 'exact') return text.normalize('NFC');
    if (behavior === 'case-insensitive') return text.normalize('NFC').toLowerCase().replace(/ς/g, 'σ');
    return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
        .replace(/[łøđðħıßæœς]/g, ch => FOLD_EXTRA[ch]);
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

/** A word starts at `index` (start of text, or preceded by a non-letter/digit). */
function isWordStart(text: string, index: number): boolean {
    return index === 0 || !WORD_CHAR.test(text[index - 1]);
}

/** A word ends at `index` (exclusive; end of text, or followed by a non-letter/digit). */
function isWordEnd(text: string, index: number): boolean {
    return index === text.length || !WORD_CHAR.test(text[index]);
}

/**
 * Ranges `[start, end)` in `text` where `term` matches under `match`. Both strings must
 * already be prepared the same way. `regex` is not a text mode — callers handle it.
 */
export function findTextMatches(text: string, term: string, match: SearchMatch): Array<[number, number]> {
    if (!term) return [];
    switch (match) {
        case 'equals':
            return text === term ? [[0, text.length]] : [];
        case 'starts-with':
            return text.startsWith(term) ? [[0, term.length]] : [];
        case 'ends-with':
            return text.endsWith(term) ? [[text.length - term.length, text.length]] : [];
        default: {
            const ranges: Array<[number, number]> = [];
            for (let at = text.indexOf(term); at !== -1; at = text.indexOf(term, at + 1)) {
                const end = at + term.length;
                if (match === 'word-starts-with' && !isWordStart(text, at)) continue;
                if (match === 'word-ends-with' && !isWordEnd(text, end)) continue;
                // Non-overlapping, so highlights never nest.
                if (ranges.length && at < ranges[ranges.length - 1][1]) continue;
                ranges.push([at, end]);
            }
            return ranges;
        }
    }
}

/** Whether `term` matches `text` under `match` (both already prepared). */
export function matchesText(text: string, term: string, match: SearchMatch): boolean {
    switch (match) {
        case 'equals': return text === term;
        case 'starts-with': return text.startsWith(term);
        case 'ends-with': return text.endsWith(term);
        case 'word-starts-with':
        case 'word-ends-with': return findTextMatches(text, term, match).length > 0;
        default: return text.includes(term);
    }
}

/** Ranges `[start, end)` of every non-empty `re` match in `text`. */
export function findRegexMatches(text: string, re: RegExp): Array<[number, number]> {
    const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    const ranges: Array<[number, number]> = [];
    for (const m of text.matchAll(global)) {
        if (m[0].length > 0 && m.index !== undefined) ranges.push([m.index, m.index + m[0].length]);
    }
    return ranges;
}

/** A RegExp safe to `.test()` repeatedly — `g` / `y` make test() stateful via lastIndex. */
export function statelessRegex(re: RegExp): RegExp {
    return /[gy]/.test(re.flags) ? new RegExp(re.source, re.flags.replace(/[gy]/g, '')) : re;
}
