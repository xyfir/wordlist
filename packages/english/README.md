# `@wordlist/english`

Lists of real English words. Use them directly or pair with [`@wordlist/random`](https://www.npmjs.com/package/@wordlist/random) for random word generation.

```bash
npm install @wordlist/english
```

## Word Lists

This package provides two English word lists:

### Recommended (~123k words)

- Contains only words 3-10 characters long
- Best for most use cases
- Smaller memory footprint

### Extended (~350k words)

- Contains words of all lengths
- Comprehensive dictionary
- Larger memory footprint

Both lists contain only `a-z` characters. No numbers, symbols, spaces, or diacritics.

## Usage

### Import Word Lists

```ts
import { recommended } from "@wordlist/english/recommended";
import { extended } from "@wordlist/english/extended";
```

### Direct Usage

Use the word lists for any purpose:

```ts
import { recommended } from "@wordlist/english/recommended";
recommended.includes("hello"); // true
```

### With `@wordlist/random`

```ts
import { recommended } from "@wordlist/english/recommended";
import { RandomWords } from "@wordlist/random";

const random = new RandomWords(recommended);
random.generate(5); // ['apple', 'banana', 'cherry', 'date', 'elderberry']
```
