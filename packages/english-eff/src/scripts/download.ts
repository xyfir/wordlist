import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface WordList {
  name: string;
  url: string;
}

const lists: WordList[] = [
  {
    name: "short1",
    url: "https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt",
  },
  {
    name: "short2",
    url: "https://www.eff.org/files/2016/09/08/eff_short_wordlist_2_0.txt",
  },
  {
    name: "long",
    url: "https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt",
  },
];

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

function parseEFFList(text: string): string[] {
  const lines = text.trim().split(/\r?\n/);
  const words: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const word = line.trim().split(/\s+/)[1];
    if (word && !seen.has(word)) {
      seen.add(word);
      words.push(word);
    }
  }

  return words;
}

async function saveWordList(
  name: string,
  words: string[],
  dataDir: string,
): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const filePath = join(dataDir, `${name}.json`);
  await writeFile(filePath, JSON.stringify(words, null, 2) + "\n", "utf8");
  console.log(`Saved ${name}.json (${words.length} words)`);
}

async function main(): Promise<void> {
  const dataDir = join(__dirname, "..", "data");
  const allWords = new Set<string>();

  for (const list of lists) {
    console.log(`Downloading ${list.name}...`);
    const text = await fetchText(list.url);
    const words = parseEFFList(text);

    words.forEach((word) => allWords.add(word));
    await saveWordList(list.name, words, dataDir);
  }

  console.log(`\nTotal unique words across all lists: ${allWords.size}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
