// Reads text out of an uploaded résumé. The parsers are loaded on demand so they stay out of the main bundle.
// A real backend would do this server-side; the contract (bytes in, plain text out) stays the same.

export const RESUME_TYPES = {
  pdf: { label: "PDF", magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  docx: { label: "DOCX", magic: [0x50, 0x4b, 0x03, 0x04] }, // ZIP container
};

export class ExtractionError extends Error {
  constructor(message) {
    super(message);
    this.name = "ExtractionError";
  }
}

export function resumeKind(fileName = "") {
  const match = fileName.toLowerCase().match(/\.(pdf|docx)$/);
  return match ? match[1] : null;
}

// Checks the file's leading bytes, so a renamed file isn't parsed as something it isn't.
export function hasExpectedSignature(kind, bytes) {
  const view = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  return RESUME_TYPES[kind].magic.every((b, i) => view[i] === b);
}

export async function sha256(input) {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pdfText(bytes) {
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  // pdf.js takes ownership of the buffer it's given, so pass a copy.
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const content = await (await doc.getPage(n)).getTextContent();
    pages.push(content.items.map((item) => item.str + (item.hasEOL ? "\n" : " ")).join(""));
  }
  await doc.destroy();
  return pages.join("\n");
}

async function docxText(bytes) {
  const mammoth = await import("mammoth/mammoth.browser.min.js");
  const { value } = await (mammoth.default ?? mammoth).extractRawText({ arrayBuffer: bytes });
  return value;
}

export async function extractResumeText(kind, bytes) {
  let text;
  try {
    text = kind === "pdf" ? await pdfText(bytes) : await docxText(bytes);
  } catch {
    throw new ExtractionError("We couldn't read this file. It may be damaged or password-protected.");
  }
  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 30) {
    throw new ExtractionError("We couldn't find readable text in this file. Scanned PDFs (images) aren't supported yet.");
  }
  return text;
}
