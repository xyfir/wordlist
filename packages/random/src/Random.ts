export class Random {
  /**
   * Generate a random number between `0` (inclusive) and `1` (exclusive). A
   * drop in replacement for `Math.random()`
   */
  private static value(): number {
    const array = new Uint32Array(2);
    globalThis.crypto.getRandomValues(array);
    // Combine two 32-bit values into a high-precision fraction.
    // Avoid forming a 64-bit integer (which would exceed JS safe integer
    // precision). Compute as two fractional parts instead so we preserve
    // as much entropy as a JavaScript `Number` can represent (~53 bits).
    return array[0] / 2 ** 32 + array[1] / 2 ** 64;
  }

  /**
   * Generate a random number between `min` (inclusive) and `max` (exclusive).
   */
  private static range(min: number, max: number): number {
    return Math.floor(this.value() * (max - min) + min);
  }

  /**
   * Generate a seeded random number between `0` (inclusive) and `1` (exclusive).
   */
  public static async seededValue(
    seedChars: number[],
    counter: number,
  ): Promise<number> {
    const seedData = new Uint8Array(seedChars);

    // Import key for HMAC
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      seedData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    // Create counter buffer
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setBigUint64(0, BigInt(counter), true);

    // Generate HMAC
    const signature = await globalThis.crypto.subtle.sign(
      "HMAC",
      key,
      counterBuffer,
    );

    // Read first 8 bytes as little-endian uint64
    const hashView = new DataView(signature);
    const integer = hashView.getBigUint64(0, true);
    return Number(integer) / Math.pow(2, 64);
  }

  /**
   * Randomly generate numbers for indexes within the words array.
   *
   * @param length - The length of the words array.
   * @param count - How many indexes to generate.
   */
  public static indexes(length: number, count: number): number[] {
    const indexes: number[] = [];
    while (true) {
      indexes.push(this.range(0, length));
      if (indexes.length === count) break;
    }
    return indexes;
  }
}
