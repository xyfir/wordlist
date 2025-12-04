# `@wordlist/*`

A collection of packages for working with words. Use word lists directly for any purpose, or generate cryptographically secure random words from any provided list.

| Package                                 | Description                                    |
| --------------------------------------- | ---------------------------------------------- |
| [@wordlist/random](./packages/random)   | Cryptographically secure random word generator |
| [@wordlist/english](./packages/english) | Real English word lists                        |

```bash
npm install @wordlist/english @wordlist/random
```

## Using Word Lists Directly

```ts
import { recommended } from "@wordlist/english/recommended";
const isWord = recommended.includes("hello"); // true
```

## Generating Random Words

```ts
import { recommended } from "@wordlist/english/recommended";
import { RandomWords } from "@wordlist/random";

const random = new RandomWords(recommended);
random.generate(); // ['pocketful']
random.generate(4); // ['disrupter', 'recognizes', 'unbuckle', 'responding']
```

## v4 Migration Guide From `rword`

1. **Package scope**: All packages renamed under `@wordlist/` scope
2. **Class renamed**: `Rword` → `RandomWords`
3. **Word list imports**: `{ words }` → `{ recommended }` or `{ extended }` from subpath

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
random.generate(5);
```
