import type { CSSProperties } from "react";
import { lookupImage, variantSrcSet } from "@/lib/imageMeta";

type ResponsiveImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  pictureClassName?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  "aria-hidden"?: boolean;
};

/**
 * Serves the build-generated AVIF and WebP variants, then the original file.
 * Width and height come from the source so the slot does not jump.
 */
export function ResponsiveImage({
  src,
  alt,
  sizes,
  className,
  pictureClassName,
  style,
  loading = "lazy",
  fetchPriority,
  "aria-hidden": ariaHidden,
}: ResponsiveImageProps) {
  const meta = lookupImage(src, import.meta.env.BASE_URL);
  const widths = meta?.widths ?? [];
  const avif = widths.length > 0 ? variantSrcSet(src, "avif", widths) : "";
  const webp = widths.length > 0 ? variantSrcSet(src, "webp", widths) : "";

  return (
    <picture className={pictureClassName} style={style}>
      {avif ? <source type="image/avif" srcSet={avif} sizes={sizes} /> : null}
      {webp ? <source type="image/webp" srcSet={webp} sizes={sizes} /> : null}
      <img
        src={src}
        alt={alt}
        width={meta?.width}
        height={meta?.height}
        sizes={widths.length > 0 ? sizes : undefined}
        className={className}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        aria-hidden={ariaHidden}
      />
    </picture>
  );
}
