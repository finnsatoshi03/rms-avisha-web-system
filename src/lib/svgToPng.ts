/* eslint-disable @typescript-eslint/no-explicit-any */
import { toPng } from "html-to-image";

export async function svgToPng(svgElement: any) {
  try {
    const png = await toPng(svgElement);
    return png;
  } catch (error) {
    console.error("Error converting SVG to PNG:", error);
    return null;
  }
}
