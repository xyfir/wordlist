import { short1 } from "./short-1.js";
import { short2 } from "./short-2.js";
import { long1 } from "./long-1.js";

export const all: string[] = Array.from(
  new Set([...short1, ...short2, ...long1]),
).sort();
