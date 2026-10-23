// Small, multi-field search helper for the examples — combines FlexSearch (for
// fuzzy/partial/accent-insensitive text) with a plain-JS exact/prefix matcher
// (for codes/ids, which FlexSearch's text tokenizers rank poorly). FlexSearch
// lives ENTIRELY in demo/consumer code; the multiselect library has no dependency
// on it. The text index is built in idle batches (requestIdleCallback) so a large
// dataset doesn't jank the UI.
//
// Fields (highest `boost` ranks first in the merged results):
//   { getText, exact: true, boost }      → plain-JS exact match then prefix match (codes/ids)
//   { getText, tokenize = 'full', boost } → FlexSearch index (fuzzy/partial/accent text)
//
// Usage:
//   const ix = new FlexIndexer([
//     { getText: (o) => o.code, exact: true, boost: 2 },   // exact code first (e.g. "72" → 72, 721, 7211…)
//     { getText: (o) => o.label, boost: 1 },               // partial/fuzzy title
//   ]);
//   ix.build(options);
//   el.searchCallback = ({ term }) => ix.search(term, 50);
//
// A single function is shorthand for one full-tokenize text field:
//   new FlexIndexer((o) => o.label)
import FlexSearch, { Charset } from 'flexsearch';

const ric =
    (typeof window !== 'undefined' && window.requestIdleCallback) ||
    ((cb) => setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 1));

export class FlexIndexer {
    constructor(fields, { batchSize = 200, timeout = 50 } = {}) {
        if (typeof fields === 'function') fields = [{ getText: fields }];
        this._fields = fields.map((f) => {
            const exact = !!f.exact;
            // tokenize:'full' → partial matches anywhere in a word; Charset.Normalize
            // folds case + accents (so "zurich" matches "Zürich").
            const opts = exact ? null : { tokenize: f.tokenize ?? 'full', resolution: 9, encoder: Charset.Normalize };
            return {
                getText: f.getText,
                boost: f.boost ?? 1,
                exact,
                // A `numeric` exact field is treated as a code lookup: when the whole
                // query is digits, ONLY this field is searched (see search()).
                numeric: !!f.numeric,
                opts,
                index: exact ? null : new FlexSearch.Index(opts),
                values: [] // exact fields only: lowercased text per item index
            };
        });
        this._batchSize = batchSize;
        this._timeout = timeout;
        this._items = [];
        this._queue = [];
        this._processing = false;
        this._onComplete = null;
    }

    /** Build (or rebuild) every field over `items`. Text fields index in idle batches. */
    build(items, { onComplete } = {}) {
        this._items = items || [];
        this._onComplete = onComplete || null;
        for (const f of this._fields) {
            if (f.exact) f.values = this._items.map((it) => String(f.getText(it) ?? '').toLowerCase());
            else f.index = new FlexSearch.Index(f.opts); // fresh index (FlexSearch has no clear)
        }
        this._queue = this._fields.some((f) => !f.exact) ? this._items.map((_, i) => i) : [];
        if (this._queue.length && !this._processing) this._drain();
        else if (!this._queue.length && this._onComplete) this._onComplete();
    }

    _drain() {
        this._processing = true;
        const step = (deadline) => {
            const start = performance.now();
            const max = deadline.didTimeout ? Math.max(5, Math.ceil(this._batchSize / 5)) : this._batchSize;
            let n = 0;
            while (
                this._queue.length &&
                n < max &&
                (deadline.didTimeout || deadline.timeRemaining() > 1) &&
                performance.now() - start < 16
            ) {
                const i = this._queue.shift();
                for (const f of this._fields) {
                    if (f.exact) continue;
                    const txt = f.getText(this._items[i]);
                    if (txt) f.index.add(i, String(txt));
                }
                n++;
            }
            if (this._queue.length) ric(step, { timeout: this._timeout });
            else {
                this._processing = false;
                if (this._onComplete) this._onComplete();
            }
        };
        ric(step, { timeout: this._timeout });
    }

    /**
     * Search across all fields, merged by descending `boost`. Exact fields yield
     * exact matches first, then prefix matches; text fields yield FlexSearch hits.
     * Empty term → all items.
     */
    async search(term, limit = 50) {
        const t = String(term ?? '').trim().toLowerCase();
        if (!t) return this._items;

        const seen = new Set();
        const out = [];
        const push = (i) => {
            if (!seen.has(i)) {
                seen.add(i);
                out.push(this._items[i]);
            }
        };

        // A purely-numeric query with a `numeric` exact field = a code lookup:
        // return only exact/prefix code matches, so digit-substring noise from the
        // text index doesn't flood results. This matters most in tree mode, where
        // every stray match also drags in all of its ancestors.
        const numericField = this._fields.find((f) => f.exact && f.numeric);
        if (numericField && /^\d+$/.test(t)) {
            numericField.values.forEach((v, i) => { if (v === t) push(i); });
            numericField.values.forEach((v, i) => { if (v !== t && v.startsWith(t)) push(i); });
            return out.slice(0, limit);
        }

        for (const f of [...this._fields].sort((a, b) => b.boost - a.boost)) {
            if (out.length >= limit) break;
            if (f.exact) {
                f.values.forEach((v, i) => { if (v === t) push(i); });                  // exact first
                f.values.forEach((v, i) => { if (v !== t && v.startsWith(t)) push(i); }); // then prefix
            } else {
                for (const i of this._index_search(f, t, limit)) push(i);
            }
        }
        return out.slice(0, limit);
    }

    _index_search(f, term, limit) {
        return f.index.search(term, { limit }) || [];
    }

    /** True once the current build has finished indexing the text fields. */
    get ready() {
        return !this._processing;
    }
}
