# `@wordlist/random`

A cryptographically secure random word generator. Pair it with one of our ready-to-use English word lists, or provide your own custom word list.

```bash
npm install @wordlist/english-eff @wordlist/random
```

## Usage

### Basic Usage

```ts
import { all } from "@wordlist/english-eff/all";
import { RandomWords } from "@wordlist/random";

const random = new RandomWords(all);
await random.generate(1); // ["author"]
await random.generate(4); // ["audition","resisting","copy","attitude"]
```

### Seeded Generation

Generate reproducible words using a seed:

```ts
import { all } from "@wordlist/english-eff/all";
import { RandomWords } from "@wordlist/random";

const seeded1 = new RandomWords(all, "your_custom_seed_123");
await seeded1.generate(3); // ['abandon', 'gunpowder', 'pole']

const seeded2 = new RandomWords(all, "your_custom_seed_123");
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
   - `rword` → `@wordlist/random`
2. **Class renamed**: `Rword` → `RandomWords`
3. **API changes**:
   - `generate()` is now async to support browser environments
   - `shuffle()` and `getWords()` were removed
   - Internally, the word list you pass in is now used directly without creating a shuffled copy
4. **Word lists replaced**: The old `recommended` and `extended` lists have been removed and have no 1:1 replacements. We now instead have:
   - **`@wordlist/english-eff/...`**
   - **`@wordlist/english-wiktionary`**
   - You can still import and use the old lists with the new API

### Code Examples

**v4:**

```ts
import { words } from "rword-english-recommended";
import { Rword } from "rword";

const rword = new Rword(words);
rword.generate(5);
```

**v5:**

```ts
import { all } from "@wordlist/english-eff/all";
import { RandomWords } from "@wordlist/random";

const random = new RandomWords(all);
await random.generate(5);
```

### Important note about seeds

Due to both the removal of internal word list shuffling and the removal of the old word lists, please note that a seeded generation from v4 will not match the equivalent generation from v5. If this matters to you, stay on v4 with both the old API and word lists.
