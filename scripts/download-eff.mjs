#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

// https://www.eff.org/dice

const lists = [
  {
    name: "eff-short-1",
    url: "https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt",
  },
  {
    name: "eff-short-2",
    url: "https://www.eff.org/files/2016/09/08/eff_short_wordlist_2_0.txt",
  },
  {
    name: "eff-long-1",
    url: "https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt",
  },
];

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

function parseEFF(text) {
  const lines = text.split(/\r?\n/);
  const rawWords = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Lines are typically like `11111\tabacus` — take last token
    const parts = trimmed.split(/\s+/);
    const candidate = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    // Only allow alphabetic / hyphen/apostrophe characters in word portion
    const word = candidate.replace(/[^A-Za-z\-']/g, "").toLowerCase();
    if (word) rawWords.push(word);
  }
  // preserve order but remove duplicates
  const seen = new Set();
  const unique = [];
  for (const w of rawWords) {
    if (!seen.has(w)) {
      seen.add(w);
      unique.push(w);
    }
  }
  return { rawWords, unique };
}

async function writeJsonFile(destDir, name, arr) {
  await fs.mkdir(destDir, { recursive: true });
  const dest = path.join(destDir, `${name}.json`);
  await fs.writeFile(dest, JSON.stringify(arr, null, 2) + "\n", "utf8");
  return dest;
}

async function main() {
  const outDir = path.resolve(process.cwd(), "packages", "english", "data");
  const combinedSet = new Set();
  let totalRaw = 0;
  for (const list of lists) {
    try {
      console.log(`Fetching ${list.url}...`);
      const text = await fetchText(list.url);
      console.log(`Parsing ${list.name}...`);
      const { rawWords, unique } = parseEFF(text);
      totalRaw += rawWords.length;
      for (const w of unique) combinedSet.add(w);
      console.log(
        `List: ${list.name} — raw lines: ${rawWords.length}, unique words: ${unique.length}`,
      );
      console.log(
        `Writing ${list.name}.json (${unique.length} words) to ${outDir}...`,
      );
      const dest = await writeJsonFile(outDir, list.name, unique);
      console.log(`Saved: ${dest}`);
    } catch (err) {
      console.error(`Error handling ${list.name}:`, err);
    }
  }
  console.log("--- Summary ---");
  console.log(`Total raw words across all lists: ${totalRaw}`);
  console.log(`Total unique words across all lists: ${combinedSet.size}`);
  console.log("Done.");
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("download-eff-wordlists.mjs")
) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
