/**
 * Homepage motion slots and which photos are allowed to follow a clip.
 *
 * Stock vs real work was decided from git history and perceptual hashes
 * against `attached_assets/stock_images` and Jordan's `attached_assets` job
 * photos (see the PR for the full table). Every `01.jpg` matched a stock
 * file. Every `02.jpg`–`04.jpg` matched a job photo. The hero file
 * `images/hero-engineering.jpg` was the stock hero. Those stock files are
 * not in any rotation.
 */

export const realWorkFiles = {
  "product-design": ["02.jpg", "03.jpg", "04.jpg"],
  "prototype-dfm": ["02.jpg", "03.jpg", "04.jpg"],
  "machine-tooling": ["02.jpg", "03.jpg", "04.jpg"],
  "cad-3d-modeling": ["02.jpg", "03.jpg", "04.jpg"],
  "pdm-plm": ["02.jpg", "03.jpg", "04.jpg"],
  "manufacturing-consultation": ["02.jpg", "03.jpg", "04.jpg"],
} as const;

export type ServiceId = keyof typeof realWorkFiles;

export type MotionSlot = {
  id: string;
  /** Path relative to `client/public`. */
  video: string;
  mobileVideo?: string;
  poster: string;
  /** Real-work photos only, relative to `client/public`. */
  images: readonly string[];
  /**
   * Loop the clip instead of advancing to photos.
   * Hero and the services intro have no real-work stills to cycle to.
   */
  loop: boolean;
  /** Hero is on screen at load. Everything else waits until it is near the viewport. */
  eager: boolean;
};

function servicePaths(serviceId: ServiceId): string[] {
  return realWorkFiles[serviceId].map(
    (file) => `images/services/${serviceId}/${file}`,
  );
}

export const motionSlots = {
  hero: {
    id: "hero",
    video: "videos/hero-logo-sting.mp4",
    mobileVideo: "videos/hero-logo-sting-mobile.mp4",
    poster: "videos/hero-logo-sting-poster.webp",
    images: [],
    loop: true,
    eager: true,
  },
  servicesIntro: {
    id: "services-intro",
    video: "videos/services-intro.mp4",
    poster: "videos/services-intro-poster.webp",
    images: [],
    loop: true,
    eager: false,
  },
  productDesign: {
    id: "product-design",
    video: "videos/product-design.mp4",
    poster: "videos/product-design-poster.webp",
    images: servicePaths("product-design"),
    loop: false,
    eager: false,
  },
  cad3d: {
    id: "cad-3d-modeling",
    video: "videos/cad-3d-modeling.mp4",
    poster: "videos/cad-3d-modeling-poster.webp",
    images: servicePaths("cad-3d-modeling"),
    loop: false,
    eager: false,
  },
  machineTooling: {
    id: "machine-tooling",
    video: "videos/machine-tooling.mp4",
    poster: "videos/machine-tooling-poster.webp",
    images: servicePaths("machine-tooling"),
    loop: false,
    eager: false,
  },
} as const satisfies Record<string, MotionSlot>;

export type MotionSlotKey = keyof typeof motionSlots;

const STOCK_FILE = /(^|\/)01\.jpg$/;
const STOCK_HERO = "hero-engineering.jpg";

/** Relative public paths for a service card's real-work photos. */
export function realWorkImagePaths(serviceId: ServiceId): readonly string[] {
  return servicePaths(serviceId);
}

export function listsStockPhoto(paths: readonly string[]): boolean {
  return paths.some(
    (path) => STOCK_FILE.test(path) || path.includes(STOCK_HERO),
  );
}

export type PlaybackPlan = {
  autoplay: boolean;
  loop: boolean;
  /** Still poster is the visible fallback (and the whole frame when motion is reduced). */
  showPoster: boolean;
  /** Advance through real-work photos after the clip ends. */
  cycleImages: boolean;
};

/**
 * Reduced motion never autoplays. Slots with no real-work photos loop
 * (hero sting, services intro). Slots with photos play the clip once,
 * then cycle those photos.
 */
export function resolvePlayback(
  slot: Pick<MotionSlot, "loop" | "images">,
  reducedMotion: boolean,
): PlaybackPlan {
  if (reducedMotion) {
    return {
      autoplay: false,
      loop: false,
      showPoster: true,
      cycleImages: false,
    };
  }
  const loop = slot.loop || slot.images.length === 0;
  return {
    autoplay: true,
    loop,
    showPoster: true,
    cycleImages: !loop && slot.images.length > 0,
  };
}

/** Attach a video source only once the slot may actually play. */
export function shouldAttachVideoSource(opts: {
  reducedMotion: boolean;
  eager: boolean;
  inView: boolean;
}): boolean {
  if (opts.reducedMotion) return false;
  return opts.eager || opts.inView;
}

export function nextImageIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  return (current + 1) % count;
}
