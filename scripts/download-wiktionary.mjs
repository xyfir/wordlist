import fs from "fs";
import path from "path";
import unbzip2 from "unbzip2-stream";
import { Readable } from "stream";

function usage() {
  console.log(
    "Usage: node scripts/wiktionary-download.mjs [--lang <code>] [--max-titles <n>]",
  );
  console.log(
    "Example: node scripts/wiktionary-download.mjs --lang en --max-titles 1000",
  );
}

function parseArgs(argv) {
  const args = { lang: "en", maxTitles: 0, debug: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--lang" && argv[i + 1]) {
      args.lang = argv[++i];
    } else if (a === "--max-titles" && argv[i + 1]) {
      args.maxTitles = parseInt(argv[++i], 10) || 0;
    } else if (a === "--debug") {
      args.debug = true;
    } else if (a === "--help" || a === "-h") {
      usage();
      process.exit(0);
    }
  }
  return args;
}

function getDumpUrl(lang) {
  return `https://dumps.wikimedia.org/${lang}wiktionary/latest/${lang}wiktionary-latest-pages-articles.xml.bz2`;
}

function getOutFile(lang) {
  // Prefer package dir like `packages/english-wiktionary` for `en`.
  let packageDir = `packages/${lang}`;
  const altDir =
    lang === "en" ? "packages/english-wiktionary" : `packages/${lang}`;
  if (fs.existsSync(path.resolve(process.cwd(), altDir))) packageDir = altDir;
  return path.resolve(process.cwd(), `${packageDir}/data/wiktionary.json`);
}

function sanitizeToken(token) {
  // remove diacritics and lowercase
  const t = token.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return t;
}

function handleTitle(title, addToken) {
  if (!title || title.includes(":")) return;
  const cleaned = title.trim();
  if (!cleaned) return;
  const tokens = cleaned.split(/\s+/);
  for (let t of tokens) {
    const tok = sanitizeToken(t);
    if (/^[a-z]{3,}$/.test(tok)) addToken(tok);
  }
}

function hasHostLanguageSection(pageText, lang) {
  if (!pageText) return false;
  // Basic mapping for some common language codes to their section names.
  const langNames = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    la: "Latin",
    pt: "Portuguese",
    ru: "Russian",
  };
  const name = langNames[lang] || lang;
  // Look for a section header like '==English==' (case-insensitive).
  // Use a line-aware regex to avoid matching 'English' in ordinary text.
  const headerRe = new RegExp(
    "(^|\\n)\\s*={2,}\\s*" + name + "\\s*={2,}\\s*(\\n|$)",
    "im",
  );
  return headerRe.test(pageText);
}

function extractLanguageSection(pageText, lang) {
  if (!pageText) return null;
  const langNames = {
    en: "English",
  };
  const name = langNames[lang] || lang;
  // fallback robust search: find header line case-insensitively
  const headerLineRe = new RegExp(
    "(^|\\n)\\s*(={2,})\\s*" + name + "\\s*={2,}\\s*(\\n|$)",
    "im",
  );
  const m = pageText.match(headerLineRe);
  if (!m) return null;
  const start = m.index + m[0].length;
  // find next same-or-higher level header (==...==)
  const nextHeaderRe = /\n\s*={2,}[^\n]*/g;
  nextHeaderRe.lastIndex = start;
  const next = nextHeaderRe.exec(pageText);
  const end = next ? next.index : pageText.length;
  return pageText.substring(start, end);
}

async function fetchDumpStream(url) {
  // Prefer saving a local copy under `scripts/dumps/` and reusing it.
  const localDir = path.resolve(process.cwd(), "scripts", "dumps");
  await fs.promises.mkdir(localDir, { recursive: true });
  // file name matches remote dump name
  const filename = url.split("/").pop();
  const localPath = path.join(localDir, filename);

  if (!fs.existsSync(localPath)) {
    console.log(
      `Local dump not found at ${localPath}, downloading from remote...`,
    );
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);

    // convert WHATWG stream to Node stream and write to file
    const nodeStream = Readable.fromWeb(res.body);
    const out = fs.createWriteStream(localPath);

    await new Promise((resolve, reject) => {
      nodeStream.on("error", reject);
      out.on("error", reject);
      out.on("finish", resolve);
      nodeStream.pipe(out);
    });
    console.log(`Downloaded dump to ${localPath}`);
  } else {
    console.log(`Using existing local dump at ${localPath}`);
  }

  const stat = await fs.promises.stat(localPath);
  const contentLength = stat.size;
  const compressedBytesRef = { bytes: 0 };

  const fileStream = fs.createReadStream(localPath);
  fileStream.on("data", (chunk) => {
    try {
      compressedBytesRef.bytes += chunk.length;
    } catch (e) {}
  });

  const decompressed = fileStream.pipe(unbzip2());
  return { stream: decompressed, compressedBytesRef, contentLength, localPath };
}

async function extractTitlesToSet(
  stream,
  { maxTitles = 0, progressRef = null, lang = "en", debug = false } = {},
) {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  const words = new Set();
  let titlesSeen = 0;
  const acceptedSamples = [];
  const rejectedSamples = [];

  function addToken(tok) {
    if (tok.length >= 3 && tok.length < 20) words.add(tok);
  }
  await new Promise((resolve, reject) => {
    let finished = false;

    function cleanup() {
      finished = true;
      stream.off("data", onData);
      stream.off("end", onEnd);
      stream.off("close", onEnd);
      stream.off("error", onError);
    }

    function onError(err) {
      if (finished) return;
      cleanup();
      reject(err);
    }

    function processPageBlock(pageText) {
      // extract title
      const titleMatch = pageText.match(/<title>([\s\S]*?)<\/title>/i);
      const textMatch = pageText.match(/<text[^>]*>([\s\S]*?)<\/text>/i);
      const title = titleMatch ? titleMatch[1] : null;
      const text = textMatch ? textMatch[1] : null;

      if (!title) return;
      titlesSeen++;
      if (progressRef) progressRef.titlesSeen = titlesSeen;
      if (maxTitles > 0 && titlesSeen > maxTitles) {
        // signal early termination by destroying the stream
        try {
          stream.destroy();
        } catch (e) {}
        return true; // indicates we should stop
      }

      // Only add tokens when the host-language section is present
      const hasHeader = hasHostLanguageSection(text, lang);
      let ok = false;
      if (hasHeader) {
        // further require the language section to contain definitions or POS subsections
        const section = extractLanguageSection(text, lang);
        const defRe = /^\s*#/m;
        const posRe =
          /^\s*={3,}\s*(Noun|Verb|Adjective|Adverb|Proper noun|Pronunciation|Noun|Pronoun|Conjunction|Preposition|Interjection|Phrase)\b/im;
        if (
          (section && defRe.test(section)) ||
          (section && posRe.test(section))
        ) {
          ok = true;
        } else {
          ok = false;
        }
      }

      if (ok) {
        handleTitle(title, addToken);
        if (progressRef) progressRef.words = words.size;
      }

      if (debug) {
        const sample = {
          title: title,
          accepted: !!ok,
          reason: hasHeader
            ? ok
              ? "has_header_with_defs"
              : "has_header_no_defs"
            : "no_header",
          // include a short snippet so we can inspect why it matched/failed
          textSnippet: (text || "").slice(0, 1000),
        };
        if (ok) {
          if (acceptedSamples.length < 200) acceptedSamples.push(sample);
        } else {
          if (rejectedSamples.length < 200) rejectedSamples.push(sample);
        }
      }
      return false;
    }

    function onEnd() {
      if (finished) return;
      buffer += decoder.decode();
      // process any remaining page blocks
      let s = buffer.indexOf("<page>");
      while (s !== -1) {
        const e = buffer.indexOf("</page>", s);
        if (e === -1) break;
        const pageBlock = buffer.substring(s, e + 7);
        buffer = buffer.substring(e + 7);
        const stop = processPageBlock(pageBlock);
        if (stop) break;
        s = buffer.indexOf("<page>");
      }
      cleanup();
      resolve();
    }

    function onData(chunk) {
      if (finished) return;
      const str =
        typeof chunk === "string"
          ? chunk
          : decoder.decode(chunk, { stream: true });
      buffer += str;

      let s = buffer.indexOf("<page>");
      while (s !== -1) {
        const e = buffer.indexOf("</page>", s);
        if (e === -1) break;
        const pageBlock = buffer.substring(s, e + 7);
        buffer = buffer.substring(e + 7);

        const stop = processPageBlock(pageBlock);
        if (stop) {
          cleanup();
          resolve();
          return;
        }

        s = buffer.indexOf("<page>");
      }

      // keep buffer size bounded
      if (buffer.length > 1_000_000) buffer = buffer.slice(-200000);
    }

    stream.on("data", onData);
    stream.on("end", onEnd);
    stream.on("close", onEnd);
    stream.on("error", onError);
  });

  if (debug) {
    try {
      const debugDir = path.resolve(process.cwd(), "scripts", "debug");
      await fs.promises.mkdir(debugDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(debugDir, "accepted.json"),
        JSON.stringify(acceptedSamples, null, 2),
        "utf8",
      );
      await fs.promises.writeFile(
        path.join(debugDir, "rejected.json"),
        JSON.stringify(rejectedSamples, null, 2),
        "utf8",
      );
      console.log(
        `Wrote debug samples: ${path.join(
          debugDir,
          "accepted.json",
        )} , ${path.join(debugDir, "rejected.json")}`,
      );
    } catch (e) {
      console.error("Failed to write debug samples:", e);
    }
  }

  return words;
}

async function main() {
  const { lang, maxTitles, debug } = parseArgs(process.argv.slice(2));
  const url = getDumpUrl(lang);
  const outFile = getOutFile(lang);

  console.log(`Downloading Wiktionary dump for '${lang}'`);
  console.log(url);

  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });

  const fetched = await fetchDumpStream(url);
  const decompressedStream = fetched.stream;

  const progressRef = {
    compressedBytesRef: fetched.compressedBytesRef,
    contentLength: fetched.contentLength,
    titlesSeen: 0,
    words: 0,
  };

  // Periodic progress logging
  let lastBytes = progressRef.compressedBytesRef.bytes || 0;
  let lastTime = Date.now();
  const interval = setInterval(() => {
    const now = Date.now();
    const bytes = progressRef.compressedBytesRef.bytes || 0;
    const dt = Math.max(1, (now - lastTime) / 1000);
    const db = Math.max(0, bytes - lastBytes);
    const mbps = db / dt / (1024 * 1024);
    lastBytes = bytes;
    lastTime = now;

    const human = (n) => {
      if (!n) return "0 B";
      const units = ["B", "KB", "MB", "GB", "TB"];
      let i = 0;
      while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i++;
      }
      return `${n.toFixed(2)} ${units[i]}`;
    };

    const total = progressRef.contentLength
      ? ` / ${human(progressRef.contentLength)}`
      : "";
    console.log(
      `Progress: ${human(bytes)}${total} (${mbps.toFixed(2)} MB/s), titles ${
        progressRef.titlesSeen
      }, unique words ${progressRef.words}`,
    );
  }, 5000);

  const words = await extractTitlesToSet(decompressedStream, {
    maxTitles,
    progressRef,
    lang,
    debug: !!debug || !!process.env.WIKT_DEBUG,
  });
  clearInterval(interval);

  const list = Array.from(words).sort();
  await fs.promises.writeFile(outFile, JSON.stringify(list, null, 2), "utf8");
  console.log("Collected words (unique):", list.length);
  console.log("Wrote", outFile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
