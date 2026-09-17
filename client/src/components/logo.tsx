import blandLogo from "@assets/IMG_0556_1772510791966.jpeg";
import colorLogo from "@assets/IMG_3665_1772510712147.jpeg";

/*
 * Both source images have black where transparency should be (JPEG flattened
 * their original transparency to black).  mix-blend-mode: screen treats black
 * as fully transparent — screen(black, bg) = bg — so the page background shows
 * through wherever the image is black, with no other manipulation needed.
 *
 * Image dimensions: ~1137×704 / ~1164×711  →  ratio ≈ 1.618 : 1
 *
 * "DA" centroid: lower semicircular annulus of the gear ring
 *   Ring centre ≈ y 44 %,  mid-ring radius ≈ 30.5 % of image height
 *   Centroid of lower semicircular annulus  ≈  centre + 19.8 %  =  ~64 % from top
 */

const ASPECT = 1.618;

interface LogoProps {
  height?: number;
}

export function Logo({ height = 48 }: LogoProps) {
  const width = Math.round(height * ASPECT);

  return (
    <div
      className="relative flex-shrink-0 group"
      style={{ width, height }}
      data-testid="logo-image-container"
    >
      <img
        src={blandLogo}
        alt="Design Anywhere Logo"
        className="absolute inset-0 w-full h-full object-contain transition-opacity duration-400 group-hover:opacity-0"
        style={{ transitionDuration: "400ms", mixBlendMode: "screen" }}
      />
      <img
        src={colorLogo}
        alt="Design Anywhere Logo"
        className="absolute inset-0 w-full h-full object-contain opacity-0 transition-opacity duration-400 group-hover:opacity-100"
        style={{ transitionDuration: "400ms", mixBlendMode: "screen" }}
      />

      {/* "DA" — concentric centre of lower ring annulus */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "64%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <span
          className="select-none block whitespace-nowrap"
          style={{
            fontSize: Math.round(height * 0.14),
            fontWeight: 900,
            fontStyle: "italic",
            fontFamily: "'Arial Black', 'Arial Bold', sans-serif",
            letterSpacing: "0.1em",
            lineHeight: 1,
            color: "#d9f4ff",
            textShadow: "0 0 3px #38bdf8, 0 0 7px #38bdf8, 0 0 12px #0ea5e9",
          }}
        >
          DA
        </span>
      </div>
    </div>
  );
}
