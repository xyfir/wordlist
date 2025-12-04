import { Random } from "./Random.js";

export class RandomWords {
  private generations = 0;
  private seedChars: number[] | undefined;
  private words: string[] = [];

  /**
   * Creates a new RandomWords instance.
   *
   * @param words - The word list to use for generation
   * @param seed - Optional seed for reproducible random generation
   */
  constructor(words: string[], seed?: string) {
    this.seedChars = seed
      ? Array.from(seed).map((c) => c.charCodeAt(0))
      : undefined;

    this.load(words);
  }

  /**
   * Generate random words from the word list.
   *
   * @param count - Number of words to generate (default: 1)
   * @returns Array of randomly selected words
   */
  public async generate(count: number = 1): Promise<string[]> {
    if (count <= 0) return [];

    if (this.seedChars) {
      const results: string[] = [];
      for (let i = 0; i < count; i++) {
        const value = await Random.seededValue(
          this.seedChars,
          this.generations++,
        );
        const index = Math.floor(value * this.words.length);
        results.push(this.words[index]);
      }
      return results;
    }

    return Random.indexes(this.words.length, count).map((i) => this.words[i]);
  }

  /**
   * Load a new word list.
   *
   * @param words - The new word list to load
   */
  public load(words: string[]): void {
    this.words = words;
  }
}
