// Copies the pdf.js worker into public/ so GlobalWorkerOptions.workerSrc can
// point at a stable same-origin path, regardless of bundler (Turbopack/webpack).
// Wired into the `build`/`dev` package scripts; the output is gitignored.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = join(root, "public", "pdf.worker.min.mjs");

if (!existsSync(src)) {
  console.error(`pdf.js worker not found at ${src} — is pdfjs-dist installed?`);
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("pdf.worker.min.mjs copied to public/");
