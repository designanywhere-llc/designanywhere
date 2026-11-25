import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { imageMeta } from "../client/src/lib/imageMeta";

/**
 * Write AVIF and WebP siblings next to each public image in the built site.
 * The original file stays in place as the fallback `img` src.
 */
export async function optimizePublicImages(distPublic: string): Promise<void> {
  for (const [relative, meta] of Object.entries(imageMeta)) {
    const input = path.join(distPublic, relative);
    if (!fs.existsSync(input)) {
      throw new Error(`Missing image for responsive variants: ${relative}`);
    }
    const bare = relative.replace(/\.(jpe?g|webp|png)$/i, "");
    for (const width of meta.widths) {
      const resize = { width, withoutEnlargement: true } as const;
      const avifPath = path.join(distPublic, `${bare}-${width}w.avif`);
      const webpPath = path.join(distPublic, `${bare}-${width}w.webp`);
      await sharp(input).rotate().resize(resize).avif({ quality: 45, effort: 2 }).toFile(avifPath);
      await sharp(input).rotate().resize(resize).webp({ quality: 78 }).toFile(webpPath);
    }
  }
}
