import { short1 } from "./short1.js";
import { short2 } from "./short2.js";
import { long } from "./long.js";

export const all: string[] = Array.from(
  new Set([...short1, ...short2, ...long]),
).sort();
