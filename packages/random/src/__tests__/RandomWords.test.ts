import { describe, it, expect, beforeEach } from "vitest";
import { recommended } from "@wordlist/english/recommended";
import { RandomWords } from "../RandomWords.js";
import { extended } from "@wordlist/english/extended";

describe("RandomWords", () => {
  let random: RandomWords;

  beforeEach(() => {
    random = new RandomWords(recommended);
  });

  describe("generate()", () => {
    it("should return an array", () => {
      expect(Array.isArray(random.generate())).toBe(true);
    });

    it("should return an array when count is specified", () => {
      expect(Array.isArray(random.generate(2))).toBe(true);
    });

    it("should return the correct number of words", () => {
      expect(random.generate(15)).toHaveLength(15);
      expect(random.generate(1)).toHaveLength(1);
      expect(random.generate(0)).toHaveLength(0);
    });

    it("should return strings", () => {
      const words = random.generate(5);
      words.forEach((word) => {
        expect(typeof word).toBe("string");
      });
    });
  });

  describe("getWords()", () => {
    it("should return the recommended word list with correct size", () => {
      expect(random.getWords()).toHaveLength(123565);
    });

    it("should return the extended word list with correct size", () => {
      const extendedRandomWords = new RandomWords(extended);
      expect(extendedRandomWords.getWords()).toHaveLength(359742);
    });
  });

  describe("shuffle()", () => {
    it("should change the order of words", () => {
      const firstWord = random.getWords()[0];
      random.shuffle();
      // Note: There's a tiny chance this could fail if shuffle happens to put the same word first
      expect(random.getWords()[0]).not.toBe(firstWord);
    });

    it("should change the order after multiple shuffles", () => {
      const wordsBeforeShuffle = [...random.getWords()];
      random.shuffle();
      random.shuffle();
      expect(random.getWords()).not.toEqual(wordsBeforeShuffle);
    });
  });

  describe("seeded generation", () => {
    it("should produce identical results with the same seed", () => {
      const seed = "abcdefghijklmnopqrstuvwxyz123";
      const seeded1 = new RandomWords(recommended, seed);
      const seeded2 = new RandomWords(recommended, seed);
      expect(seeded1.generate(5)).toEqual(seeded2.generate(5));
    });

    it("should increment and produce different results on consecutive calls", () => {
      const seed = "test-seed";
      const seeded = new RandomWords(recommended, seed);
      const first = seeded.generate(5);
      const second = seeded.generate(5);
      expect(first).not.toEqual(second);
    });

    it("should produce stable results (algorithm regression test)", () => {
      const seed = "abcdefghijklmnopqrstuvwxyz123";
      const seeded = new RandomWords(recommended, seed);
      expect(seeded.generate(4)).toEqual([
        "unrivets",
        "bracteal",
        "baseballer",
        "incloser",
      ]);
    });
  });
});
