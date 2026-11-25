/** Intrinsic size and the responsive widths the static build emits beside each file. */
export type RasterMeta = {
  width: number;
  height: number;
  widths: readonly number[];
};

export const HERO_POSTER_REL = "videos/hero-logo-sting-poster.webp";
export const HERO_IMAGE_SIZES = "100vw";
export const INTRO_IMAGE_SIZES = "(min-width: 1280px) 960px, 100vw";
export const CARD_IMAGE_SIZES =
  "(min-width: 1280px) 380px, (min-width: 768px) 46vw, calc(100vw - 3rem)";

function photo(width: number, height: number): RasterMeta {
  return {
    width,
    height,
    widths: [480, 700, 1100].filter((candidate) => candidate <= width),
  };
}

const poster: RasterMeta = { width: 1280, height: 720, widths: [768, 1280] };

const servicePhotos: Array<[string, number, number]> = [
  ["cad-3d-modeling/02.jpg", 1200, 1600],
  ["cad-3d-modeling/03.jpg", 1200, 1600],
  ["cad-3d-modeling/04.jpg", 1200, 1600],
  ["machine-tooling/02.jpg", 1600, 1200],
  ["machine-tooling/03.jpg", 1600, 1200],
  ["machine-tooling/04.jpg", 1600, 1200],
  ["manufacturing-consultation/02.jpg", 1200, 1600],
  ["manufacturing-consultation/03.jpg", 1200, 1600],
  ["manufacturing-consultation/04.jpg", 1200, 1600],
  ["pdm-plm/02.jpg", 1600, 1200],
  ["pdm-plm/03.jpg", 1600, 1200],
  ["pdm-plm/04.jpg", 1200, 1600],
  ["product-design/02.jpg", 1200, 1600],
  ["product-design/03.jpg", 1600, 1200],
  ["product-design/04.jpg", 1200, 1600],
  ["prototype-dfm/02.jpg", 900, 1600],
  ["prototype-dfm/03.jpg", 1200, 1600],
  ["prototype-dfm/04.jpg", 1600, 1200],
];

export const imageMeta: Record<string, RasterMeta> = {
  [HERO_POSTER_REL]: poster,
  "videos/services-intro-poster.webp": poster,
  "videos/product-design-poster.webp": poster,
  "videos/cad-3d-modeling-poster.webp": poster,
  "videos/machine-tooling-poster.webp": poster,
};

for (const [file, width, height] of servicePhotos) {
  imageMeta[`images/services/${file}`] = photo(width, height);
}

export function stripAssetBase(src: string, assetBase = "/"): string {
  let path = src;
  if (assetBase && assetBase !== "/" && path.startsWith(assetBase)) {
    path = path.slice(assetBase.length);
  }
  return path.replace(/^\//, "");
}

export function variantSrcSet(src: string, ext: "avif" | "webp", widths: readonly number[]): string {
  const bare = src.replace(/\.(jpe?g|webp|png|avif)$/i, "");
  return widths.map((width) => `${bare}-${width}w.${ext} ${width}w`).join(", ");
}

export function lookupImage(src: string, assetBase = "/"): RasterMeta | undefined {
  return imageMeta[stripAssetBase(src, assetBase)];
}
