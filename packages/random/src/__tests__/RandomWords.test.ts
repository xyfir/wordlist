import { describe, it, expect, beforeEach } from "vitest";
import { short1 } from "@wordlist/english-eff/short-1";
import { RandomWords } from "../RandomWords.js";

describe("RandomWords", () => {
  let random: RandomWords;

  beforeEach(() => {
    random = new RandomWords(short1);
  });

  describe("generate()", () => {
    it("should return an array", async () => {
      expect(Array.isArray(await random.generate())).toBe(true);
    });

    it("should return an array when count is specified", async () => {
      expect(Array.isArray(await random.generate(2))).toBe(true);
    });

    it("should return the correct number of words", async () => {
      expect(await random.generate(15)).toHaveLength(15);
      expect(await random.generate(1)).toHaveLength(1);
      expect(await random.generate(0)).toHaveLength(0);
    });

    it("should return strings", async () => {
      const words = await random.generate(5);
      words.forEach((word) => {
        expect(typeof word).toBe("string");
      });
    });
  });

  describe("seeded generation", () => {
    it("should produce identical results with the same seed", async () => {
      const seed = "abcdefghijklmnopqrstuvwxyz123";
      const seeded1 = new RandomWords(short1, seed);
      const seeded2 = new RandomWords(short1, seed);
      expect(await seeded1.generate(5)).toEqual(await seeded2.generate(5));
    });

    it("should increment and produce different results on consecutive calls", async () => {
      const seed = "test-seed";
      const seeded = new RandomWords(short1, seed);
      const first = await seeded.generate(5);
      const second = await seeded.generate(5);
      expect(first).not.toEqual(second);
    });

    it("should produce stable results (algorithm regression test)", async () => {
      const seed = "abcdefghijklmnopqrstuvwxyz123";
      const seeded = new RandomWords(short1, seed);
      expect(await seeded.generate(4)).toEqual([
        "mango",
        "skies",
        "panic",
        "jam",
      ]);
    });
  });
});
