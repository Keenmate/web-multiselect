/**
 * Component-local converters.
 *
 * A core invariant (SPEC §4/§5): "a new input type is a new converter created
 * anywhere — never a core edit." `toDefaultValue` is exactly that — its
 * value-format-dependent attribute grammar is multiselect-specific, so it lives
 * next to the component (the `Converter<V>` interface is the intended extension point).
 */
import type { Converter } from '@keenmate/web-components-core';

/** The `defaultValue` input: an array (property path) or the raw `value` attribute string. */
export type DefaultValueInput = Array<string | number> | string;

/**
 * `value` attribute / `defaultValue` property — the initial selection (native
 * `defaultValue` semantics: also the form-reset target). The attribute string is
 * kept raw and parsed at build time per `value-format` (see {@link parseDefaultValue}),
 * since a converter can't see other inputs. Absent/blank → empty array. The property
 * path accepts an array of strings/numbers (or a string, parsed the same way).
 */
export function toDefaultValue(): Converter<DefaultValueInput> {
  return {
    fromAttribute(raw) {
      if (raw === null || raw.trim() === '') return [];
      return raw.trim();
    },
    validate(value): value is DefaultValueInput {
      return typeof value === 'string'
        || (Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number'));
    },
    toAttribute(value) {
      return Array.isArray(value) ? JSON.stringify(value) : value;
    },
  };
}

/**
 * Parse a `defaultValue` / `value` per `value-format` — the same grammar the control submits:
 * `text` → the values joined by `value-separator` (default `,`): `a,b,c`; `json` (default) /
 * `array` → a JSON array (`["a","b"]` / `[1,2]`) or a JSON scalar, with a bare-text fallback
 * (split on the separator) for hand-written markup (`value="a,b"`, `value="a"`). An array
 * (property path, or `array`-format `el.value`) is taken as-is.
 */
export function parseDefaultValue(
  value: DefaultValueInput | readonly (string | number)[] | null | undefined,
  format: string | null | undefined,
  separator?: string | null,
): Array<string | number> {
  if (value == null) return [];
  if (Array.isArray(value)) return [...value];
  const raw = (value as string).trim();
  if (raw === '') return [];
  if (format !== 'text') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string | number => typeof v === 'string' || typeof v === 'number');
      if (typeof parsed === 'string' || typeof parsed === 'number') return [parsed];
    } catch {
      /* fall through to text */
    }
  }
  const sep = separator || ',';
  return raw.split(sep).map((s) => s.trim()).filter((s) => s !== '');
}
