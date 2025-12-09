#!/usr/bin/env node
import { createReadStream, createWriteStream, existsSync } from "fs";
import { mkdir, stat, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import unbzip2 from "unbzip2-stream";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface CliArgs {
  lang: string;
  maxTitles: number;
}

interface ProgressStats {
  compressedBytes: number;
  contentLength: number;
  titlesSeen: number;
  words: number;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  la: "Latin",
  pt: "Portuguese",
  ru: "Russian",
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { lang: "en", maxTitles: 0 };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--lang" && argv[i + 1]) {
      args.lang = argv[++i];
    } else if (argv[i] === "--max-titles" && argv[i + 1]) {
      args.maxTitles = parseInt(argv[++i], 10) || 0;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("Usage: download.ts [--lang <code>] [--max-titles <n>]");
      console.log("Example: download.ts --lang en --max-titles 1000");
      process.exit(0);
    }
  }

  return args;
}

function getDumpUrl(lang: string): string {
  return `https://dumps.wikimedia.org/${lang}wiktionary/latest/${lang}wiktionary-latest-pages-articles.xml.bz2`;
}

function sanitizeToken(token: string): string {
  return token.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function extractWordsFromTitle(title: string): string[] {
  if (!title || title.includes(":")) {
    return [];
  }

  const tokens = title.trim().split(/\s+/);
  const words: string[] = [];

  for (const token of tokens) {
    const sanitized = sanitizeToken(token);
    if (/^[a-z]{3,}$/.test(sanitized)) {
      words.push(sanitized);
    }
  }

  return words;
}

function hasLanguageSection(pageText: string, lang: string): boolean {
  const languageName = LANGUAGE_NAMES[lang] || lang;
  const headerPattern = new RegExp(
    `(^|\\n)\\s*={2,}\\s*${languageName}\\s*={2,}\\s*(\\n|$)`,
    "im",
  );
  return headerPattern.test(pageText);
}

function extractLanguageSection(pageText: string, lang: string): string | null {
  const languageName = LANGUAGE_NAMES[lang] || lang;
  const headerPattern = new RegExp(
    `(^|\\n)\\s*(={2,})\\s*${languageName}\\s*={2,}\\s*(\\n|$)`,
    "im",
  );

  const match = pageText.match(headerPattern);
  if (!match || match.index === undefined) {
    return null;
  }

  const start = match.index + match[0].length;
  const nextHeaderPattern = /\n\s*={2,}[^\n]*/g;
  nextHeaderPattern.lastIndex = start;

  const nextMatch = nextHeaderPattern.exec(pageText);
  const end = nextMatch ? nextMatch.index : pageText.length;

  return pageText.substring(start, end);
}

function isValidLanguageSection(section: string): boolean {
  const hasDefinitions = /^\s*#/m.test(section);
  const hasPartOfSpeech =
    /^\s*={3,}\s*(Noun|Verb|Adjective|Adverb|Proper noun|Pronunciation|Pronoun|Conjunction|Preposition|Interjection|Phrase)\b/im.test(
      section,
    );
  return hasDefinitions || hasPartOfSpeech;
}

async function downloadDump(url: string, dumpsDir: string): Promise<string> {
  await mkdir(dumpsDir, { recursive: true });

  const filename = url.split("/").pop()!;
  const localPath = join(dumpsDir, filename);

  if (existsSync(localPath)) {
    console.log(`Using cached dump: ${localPath}`);
    return localPath;
  }

  console.log("Downloading dump from remote...");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`,
    );
  }

  const nodeStream = Readable.fromWeb(response.body as any);
  const fileStream = createWriteStream(localPath);

  await new Promise<void>((resolve, reject) => {
    nodeStream.on("error", reject);
    fileStream.on("error", reject);
    fileStream.on("finish", resolve);
    nodeStream.pipe(fileStream);
  });

  console.log(`Downloaded to ${localPath}`);
  return localPath;
}

async function extractWords(
  dumpPath: string,
  lang: string,
  maxTitles: number,
  progress: ProgressStats,
): Promise<Set<string>> {
  const words = new Set<string>();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let titlesSeen = 0;
  let compressedBytes = 0;

  const fileStream = createReadStream(dumpPath);
  fileStream.on("data", (chunk) => {
    compressedBytes += chunk.length;
    progress.compressedBytes = compressedBytes;
  });

  const decompressed = fileStream.pipe(unbzip2());

  return new Promise((resolve, reject) => {
    function processPage(pageText: string): boolean {
      const titleMatch = pageText.match(/<title>([\s\S]*?)<\/title>/i);
      const textMatch = pageText.match(/<text[^>]*>([\s\S]*?)<\/text>/i);

      if (!titleMatch) {
        return false;
      }

      const title = titleMatch[1];
      const text = textMatch ? textMatch[1] : "";

      titlesSeen++;
      progress.titlesSeen = titlesSeen;

      if (maxTitles > 0 && titlesSeen > maxTitles) {
        return true; // Stop processing
      }

      if (hasLanguageSection(text, lang)) {
        const section = extractLanguageSection(text, lang);
        if (section && isValidLanguageSection(section)) {
          const extractedWords = extractWordsFromTitle(title);
          extractedWords.forEach((word) => {
            if (word.length >= 3 && word.length < 20) {
              words.add(word);
            }
          });
          progress.words = words.size;
        }
      }

      return false;
    }

    function onData(chunk: Buffer): void {
      const str = decoder.decode(chunk, { stream: true });
      buffer += str;

      let start = buffer.indexOf("<page>");
      while (start !== -1) {
        const end = buffer.indexOf("</page>", start);
        if (end === -1) break;

        const pageBlock = buffer.substring(start, end + 7);
        buffer = buffer.substring(end + 7);

        if (processPage(pageBlock)) {
          decompressed.destroy();
          resolve(words);
          return;
        }

        start = buffer.indexOf("<page>");
      }

      // Prevent buffer from growing too large
      if (buffer.length > 1_000_000) {
        buffer = buffer.slice(-200_000);
      }
    }

    function onEnd(): void {
      // Process remaining buffer
      buffer += decoder.decode();
      let start = buffer.indexOf("<page>");
      while (start !== -1) {
        const end = buffer.indexOf("</page>", start);
        if (end === -1) break;

        const pageBlock = buffer.substring(start, end + 7);
        buffer = buffer.substring(end + 7);

        if (processPage(pageBlock)) break;
        start = buffer.indexOf("<page>");
      }

      resolve(words);
    }

    decompressed.on("data", onData);
    decompressed.on("end", onEnd);
    decompressed.on("close", onEnd);
    decompressed.on("error", reject);
  });
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const url = getDumpUrl(args.lang);
  const dataDir = join(__dirname, "..", "data");
  const dumpsDir = join(__dirname, "..", "..", "..", "scripts", "dumps");
  const outputPath = join(dataDir, "wiktionary.json");

  console.log(`Downloading Wiktionary dump for '${args.lang}'`);
  console.log(url);

  const dumpPath = await downloadDump(url, dumpsDir);
  const dumpStats = await stat(dumpPath);

  const progress: ProgressStats = {
    compressedBytes: 0,
    contentLength: dumpStats.size,
    titlesSeen: 0,
    words: 0,
  };

  let lastBytes = 0;
  let lastTime = Date.now();

  const progressInterval = setInterval(() => {
    const now = Date.now();
    const dt = Math.max(1, (now - lastTime) / 1000);
    const db = Math.max(0, progress.compressedBytes - lastBytes);
    const mbps = db / dt / (1024 * 1024);

    lastBytes = progress.compressedBytes;
    lastTime = now;

    console.log(
      `Progress: ${formatBytes(progress.compressedBytes)} / ${formatBytes(
        progress.contentLength,
      )} (${mbps.toFixed(2)} MB/s), titles ${
        progress.titlesSeen
      }, unique words ${progress.words}`,
    );
  }, 5000);

  const words = await extractWords(
    dumpPath,
    args.lang,
    args.maxTitles,
    progress,
  );
  clearInterval(progressInterval);

  await mkdir(dataDir, { recursive: true });
  const sortedWords = Array.from(words).sort();
  await writeFile(outputPath, JSON.stringify(sortedWords, null, 2), "utf8");

  console.log(`\nCollected ${sortedWords.length} unique words`);
  console.log(`Saved to ${outputPath}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
