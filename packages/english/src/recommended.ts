/**
 * Recommended English word list.
 * Contains ~123k words, 3-10 characters each.
 * Only contains a-z characters (no numbers, symbols, spaces, or diacritics).
 */
import words from '../data/recommended.json' with { type: 'json' };
export const recommended: string[] = words as string[];
