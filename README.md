# `@wordlist/*`

A collection of packages for working with words. Use word lists directly for any purpose, or generate cryptographically secure random words from any provided list.

| Package                                                       | Description                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| [@wordlist/random](./packages/random)                         | Cryptographically secure random word generator              |
| [@wordlist/english-eff](./packages/english-eff)               | Popular short lists from the Electronic Frontier Foundation |
| [@wordlist/english-wiktionary](./packages/english-wiktionary) | Very large word list from Wiktionary's public dictionary    |

```bash
npm install @wordlist/english-eff @wordlist/random
```

## Using Word Lists Directly

```ts
import { all } from "@wordlist/english-eff/all";
all.includes("apple"); // true
```

## Generating Random Words

```ts
import { all } from "@wordlist/english-eff/all";
import { RandomWords } from "@wordlist/random";

const random = new RandomWords(all);
await random.generate(1); // ["author"]
await random.generate(4); // ["audition","resisting","copy","attitude"]
```

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
