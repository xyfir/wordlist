# `@wordlist/english-eff`

EFF word lists commonly used for creating secure, memorable passphrases. Based on the [Electronic Frontier Foundation's Dice-Generated Passphrases](https://www.eff.org/dice).

They are carefully curated to:

- Avoid profanity and offensive words
- Use words that are easy to type and remember
- Minimize similar-sounding words that could cause confusion
- Provide strong cryptographic security when combined properly

## Installation

```bash
npm install @wordlist/english-eff
```

## Word Lists

### All (All EFF Words)

All EFF word lists combined and deduplicated. 8,429 words total.

```ts
import { all } from "@wordlist/english-eff/all";
console.log(all.length); // 8429
```

### EFF Short Wordlist 1 (`short-1`)

A short list of common short words. 1,296 total.

```ts
import { short1 } from "@wordlist/english-eff/short-1";
console.log(short1.length); // 1296
```

### EFF Short Wordlist 2 (`short-2`)

A short list of longer common words. 1,296 total.

```ts
import { short2 } from "@wordlist/english-eff/short-2";
console.log(short2.length); // 1296
```

### EFF Long Wordlist (`long-1`)

A comparatively long list of mixed, mostly common words. 7,776 total.

```ts
import { long1 } from "@wordlist/english-eff/long-1";
console.log(long1.length); // 7776
```

## Random Word Generator

```ts
import { all } from "@wordlist/english-eff/all";
import { RandomWords } from "@wordlist/random";

const random = new RandomWords(all);
const passphrase = await random.generate(6);
console.log(passphrase.join("-"));
```
