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
  const args = { lang: "en", maxTitles: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--lang" && argv[i + 1]) {
      args.lang = argv[++i];
    } else if (a === "--max-titles" && argv[i + 1]) {
      args.maxTitles = parseInt(argv[++i], 10) || 0;
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
  // Prefer package dir like `packages/english` for `en`.
  let packageDir = `packages/${lang}`;
  const altDir = lang === "en" ? "packages/english" : `packages/${lang}`;
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
  { maxTitles = 0, progressRef = null } = {},
) {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  const words = new Set();
  let titlesSeen = 0;

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

    function onEnd() {
      if (finished) return;
      // flush decoder
      buffer += decoder.decode();
      // process remaining buffer
      let s = buffer.indexOf("<title>");
      while (s !== -1) {
        const e = buffer.indexOf("</title>", s);
        if (e === -1) break;
        const title = buffer.substring(s + 7, e);
        buffer = buffer.substring(e + 8);
        handleTitle(title, addToken);
        if (progressRef) progressRef.words = words.size;
        s = buffer.indexOf("<title>");
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

      let s = buffer.indexOf("<title>");
      while (s !== -1) {
        const e = buffer.indexOf("</title>", s);
        if (e === -1) break;
        const title = buffer.substring(s + 7, e);
        buffer = buffer.substring(e + 8);

        titlesSeen++;
        if (progressRef) progressRef.titlesSeen = titlesSeen;
        if (maxTitles > 0 && titlesSeen > maxTitles) {
          cleanup();
          try {
            stream.destroy();
          } catch (e) {}
          resolve();
          return;
        }

        handleTitle(title, addToken);
        if (progressRef) progressRef.words = words.size;
        s = buffer.indexOf("<title>");
      }

      if (buffer.length > 1_000_000) buffer = buffer.slice(-200000);
    }

    stream.on("data", onData);
    stream.on("end", onEnd);
    stream.on("close", onEnd);
    stream.on("error", onError);
  });

  return words;
}

async function main() {
  const { lang, maxTitles } = parseArgs(process.argv.slice(2));
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
