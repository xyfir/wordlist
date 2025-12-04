# `@wordlist/random`

A cryptographically secure random word generator. Pair it with [`@wordlist/english`](https://www.npmjs.com/package/@wordlist/english) for ready-to-use English word lists, or provide your own custom word list sourced from `@wordlist/english` or elsewhere.

```bash
npm install @wordlist/random @wordlist/english
```

## Usage

### Basic Usage

```ts
import { recommended } from "@wordlist/english/recommended";
import { RandomWords } from "@wordlist/random";

const random = new RandomWords(recommended);
await random.generate(); // ['pocketful']
await random.generate(4); // ['disrupter', 'recognizes', 'unbuckle', 'responding']
```

### Seeded Generation

Generate reproducible words using a seed:

```ts
import { recommended } from "@wordlist/english/recommended";
import { RandomWords } from "@wordlist/random";

const seeded1 = new RandomWords(recommended, "your_custom_seed_123");
await seeded1.generate(3); // ['abandon', 'gunpowder', 'pole']

const seeded2 = new RandomWords(recommended, "your_custom_seed_123");
await seeded2.generate(3); // ['abandon', 'gunpowder', 'pole'] - same result!
```

### Custom Word Lists

Use any string array as a word list:

```ts
import { RandomWords } from "@wordlist/random";

const customWords = ["apple", "banana", "cherry", "date"];
const random = new RandomWords(customWords);
await random.generate(2); // ['cherry', 'apple']
```

## API

### `new RandomWords(words, seed?)`

Creates a new `RandomWords` instance.

- `words: string[]` - The word list to use
- `seed?: string` - Optional seed for reproducible generation

### `random.generate(count = 1): Promise<string[]>`

Generate an array of random words.

### `random.load(words: string[]): void`

Load a new word list into the instance.

## v4 Migration Guide From `rword`

1. **Package scope**: All packages renamed under `@wordlist/` scope
2. **Class renamed**: `Rword` → `RandomWords`
3. **Async**: `generate()` is now async to support browser environments
4. **Word list imports**: `{ words }` → `{ recommended }` or `{ extended }` from subpath
5. **Removed shuffle**: `shuffle()` and `getWords()` had no meaningful benefit

| Old Package                 | New Package                     |
| --------------------------- | ------------------------------- |
| `rword`                     | `@wordlist/random`              |
| `rword-english-recommended` | `@wordlist/english/recommended` |
| `rword-english-extended`    | `@wordlist/english/extended`    |

**v4:**

```ts
import { words } from "rword-english-recommended";
import { Rword } from "rword";

const rword = new Rword(words);
rword.generate(5);
```

**v5:**

```ts
import { recommended } from "@wordlist/english/recommended";
import { RandomWords } from "@wordlist/random";

const random = new RandomWords(recommended);
await random.generate(5);
```

### Important note about seeds

Due to the removal of the shuffling API, seeded ouputs will differ between v4 and v5 because the internal word list is no longer shuffled automatically at load.
