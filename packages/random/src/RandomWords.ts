import { Random } from './Random.js';

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

    this.load(words.slice());
  }

  /**
   * Generate random words from the word list.
   *
   * @param count - Number of words to generate (default: 1)
   * @returns Array of randomly selected words
   */
  public generate(count: number = 1): string[] {
    if (count <= 0) return [];

    if (this.seedChars) {
      return Array.from({ length: count }, () => {
        const index = Math.floor(
          Random.seededValue(this.seedChars!, this.generations++) *
            this.words.length,
        );
        return this.words[index];
      });
    }

    return Random.indexes(this.words.length, count).map((i) => this.words[i]);
  }

  /**
   * Get the full word list.
   *
   * @returns The shuffled words array
   */
  public getWords(): string[] {
    return this.words;
  }

  /**
   * Shuffle the word list.
   * This is automatically called when loading words.
   */
  public shuffle(): void {
    Random.shuffle(this.words, this.seedChars);
  }

  /**
   * Load a new word list.
   *
   * @param words - The new word list to load
   */
  public load(words: string[]): void {
    this.words = words;
    this.shuffle();
  }
}
