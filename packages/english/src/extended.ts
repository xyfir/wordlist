/**
 * Extended English word list.
 * Contains ~350k words of all lengths.
 * Only contains a-z characters (no numbers, symbols, spaces, or diacritics).
 */
import words from '../data/extended.json' with { type: 'json' };
export const extended: string[] = words as string[];
