# `@wordlist/english-wiktionary`

Large English word list extracted from the English [Wiktionary](https://en.wiktionary.org/wiki/Wiktionary:Main_Page).

- **532,324 words** - The largest list in this collection
- **Only a-z characters** - No numbers, symbols, spaces, diacritics, uppercase
- **3-19 characters** - Excludes very long and short words
- **Best-effort English-only** - Articles/words without "English" sections have been removed

Please note that there is **NO CENSORING** of sensitive content and that there may be some oddities in here since this is from a public wiki.

This word list is likely to be most useful as the foundation for a custom word list that has further filtering.

## Installation

```bash
npm install @wordlist/english-wiktionary
```

## Usage

```ts
import { wiktionary } from "@wordlist/english-wiktionary/wiktionary";

console.log(wiktionary.length); // 532324
console.log(wiktionary.includes("hello")); // true
```

## Random Word Generator

```ts
import { wiktionary } from "@wordlist/english-wiktionary/wiktionary";
import { RandomWords } from "@wordlist/random";

const random = new RandomWords(wiktionary);
const words = await random.generate(5);
console.log(words);
```
