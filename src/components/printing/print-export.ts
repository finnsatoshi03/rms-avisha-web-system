/**
 * Output paths for the composed sheet canvas.
 *
 * Print: hidden iframe whose @page is the exact physical sheet size, with the
 * canvas rendered as an image at that same physical size — so the browser's
 * print pipeline does no scaling of its own.
 *
 * Export: PNG download with a pHYs chunk injected so the file carries real
 * 300-DPI metadata (canvas.toBlob alone omits it and viewers assume 72/96 DPI).
 */

import { saveAs } from "file-saver";
import { DPI } from "./print-config";

/** Physical size of the sheet in inches, matching the canvas pixel size. */
export interface PhysicalSheet {
  widthIn: number;
  heightIn: number;
}

export function printSheet(canvas: HTMLCanvasElement, sheet: PhysicalSheet) {
  const dataUrl = canvas.toDataURL("image/png");
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: ${sheet.widthIn}in ${sheet.heightIn}in; margin: 0; }
  html, body { margin: 0; padding: 0; }
  img {
    display: block;
    width: ${sheet.widthIn}in;
    height: ${sheet.heightIn}in;
  }
</style>
</head>
<body><img src="${dataUrl}" /></body>
</html>`);
  doc.close();

  const img = doc.querySelector("img");
  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };
  const doPrint = () => {
    const win = iframe.contentWindow;
    if (!win) return cleanup();
    win.focus();
    win.print();
    // Leave the iframe alive long enough for the print dialog to consume it.
    setTimeout(cleanup, 60_000);
  };
  if (img && !img.complete) {
    img.onload = doPrint;
    img.onerror = cleanup;
  } else {
    doPrint();
  }
}

/**
 * Pixel-accurate PDF: the 300-DPI canvas bitmap placed on a page of the exact
 * physical sheet size (react-pdf points = 1/72 in). The renderer is imported
 * lazily so the printing page doesn't carry the heavy PDF chunk until used.
 */
export async function exportSheetPdf(
  canvas: HTMLCanvasElement,
  sheet: PhysicalSheet,
  filename: string
) {
  const [{ pdf, Document, Page, Image }, { createElement }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("react"),
  ]);
  const doc = createElement(
    Document,
    {},
    createElement(
      Page,
      { size: [sheet.widthIn * 72, sheet.heightIn * 72], style: { padding: 0 } },
      createElement(Image, {
        src: canvas.toDataURL("image/png"),
        style: { width: "100%", height: "100%" },
      })
    )
  );
  const blob = await pdf(doc).toBlob();
  saveAs(blob, filename);
}

export async function exportSheetPng(
  canvas: HTMLCanvasElement,
  filename: string
) {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) return;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const out = withDpiMetadata(bytes);
  // Copy into a fresh ArrayBuffer-backed slice; keeps Blob typing happy
  // across TS lib versions and never shares the source buffer.
  saveAs(
    new Blob([out.slice().buffer as ArrayBuffer], { type: "image/png" }),
    filename
  );
}

// --- PNG pHYs injection -----------------------------------------------------

/** 300 DPI expressed as pixels per meter, the unit pHYs uses. */
const PPM = Math.round((DPI / 25.4) * 1000);

/**
 * Insert a pHYs chunk right after IHDR so the PNG declares its 300-DPI
 * resolution. Falls back to the original bytes if the structure is unexpected.
 */
function withDpiMetadata(png: Uint8Array): Uint8Array {
  // PNG signature (8) + IHDR chunk: length(4) + "IHDR"(4) + data(13) + CRC(4)
  const insertAt = 8 + 4 + 4 + 13 + 4;
  if (
    png.length < insertAt ||
    String.fromCharCode(png[12], png[13], png[14], png[15]) !== "IHDR"
  ) {
    return png;
  }

  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9); // data length
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, PPM); // x pixels per meter
  view.setUint32(12, PPM); // y pixels per meter
  chunk[16] = 1; // unit: meter
  view.setUint32(17, crc32(chunk.subarray(4, 17)));

  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(png.subarray(insertAt), insertAt + chunk.length);
  return out;
}

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
