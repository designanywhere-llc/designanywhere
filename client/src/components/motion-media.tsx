import { useEffect, useRef, useState } from "react";
import {
  nextImageIndex,
  resolvePlayback,
  shouldAttachVideoSource,
} from "@/lib/motionMedia";

const CYCLE_MS = 3000;
const FADE_MS = 1000;

type MotionMediaProps = {
  videoSrc: string;
  mobileVideoSrc?: string;
  poster: string;
  images: readonly string[];
  loop: boolean;
  eager?: boolean;
  alt: string;
  testId: string;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Plays a muted inline clip first, then crossfades the slot's real-work photos.
 * Below-the-fold clips are not mounted until they intersect, so nothing is
 * fetched early. Reduced motion keeps the poster still and does not autoplay.
 */
export function MotionMedia({
  videoSrc,
  mobileVideoSrc,
  poster,
  images,
  loop,
  eager = false,
  alt,
  testId,
}: MotionMediaProps) {
  const reduced = usePrefersReducedMotion();
  const playback = resolvePlayback({ loop, images }, reduced);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(eager);
  const [phase, setPhase] = useState<"video" | "images" | "poster">(
    playback.autoplay ? "video" : "poster",
  );

  useEffect(() => {
    if (reduced) {
      setPhase("poster");
      return;
    }
    setPhase((current) => (current === "poster" ? "video" : current));
  }, [reduced]);

  useEffect(() => {
    if (eager || reduced) return;
    const element = rootRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [eager, reduced]);

  const attachVideo = shouldAttachVideoSource({
    reducedMotion: reduced,
    eager,
    inView,
  });

  useEffect(() => {
    if (!attachVideo || phase !== "video") return;
    for (const src of images) {
      const preload = new Image();
      preload.src = src;
    }
  }, [attachVideo, phase, images]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !attachVideo || phase !== "video") return;
    video.muted = true;
    const play = () => {
      video.play().catch(() => {
        // A rejected autoplay leaves the poster in place. Don't surface it.
      });
    };
    // play() starts the fetch even when preload is none. canplay covers the
    // case where the element was already buffering from the autoPlay attribute.
    play();
    video.addEventListener("canplay", play, { once: true });
    return () => video.removeEventListener("canplay", play);
  }, [attachVideo, phase, videoSrc, mobileVideoSrc]);

  const count = images.length;
  const [frontSrc, setFrontSrc] = useState(images[0] ?? "");
  const [backSrc, setBackSrc] = useState(images[Math.min(1, Math.max(count - 1, 0))] ?? "");
  const [frontOnTop, setFrontOnTop] = useState(true);
  const frontOnTopRef = useRef(true);
  const nextIdxRef = useRef(count > 1 ? 2 % count : 0);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(() => {
    if (phase !== "images" || !playback.cycleImages || count < 2) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const step = () => {
      if (cancelled) return;
      const showFront = !frontOnTopRef.current;
      frontOnTopRef.current = showFront;
      setFrontOnTop(showFront);
      timer = setTimeout(() => {
        if (cancelled) return;
        const upcoming = nextIdxRef.current;
        nextIdxRef.current = nextImageIndex(upcoming, imagesRef.current.length);
        const src = imagesRef.current[upcoming] ?? "";
        if (frontOnTopRef.current) setBackSrc(src);
        else setFrontSrc(src);
        timer = setTimeout(step, CYCLE_MS - FADE_MS);
      }, FADE_MS + 100);
    };

    timer = setTimeout(step, CYCLE_MS);
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [phase, playback.cycleImages, count]);

  const activeSrc =
    phase === "images" ? (frontOnTop ? frontSrc : backSrc) : phase === "video" ? videoSrc : poster;
  const transition = `opacity ${FADE_MS}ms ease-in-out`;

  return (
    <div
      ref={rootRef}
      className="absolute inset-0"
      data-testid={testId}
      data-phase={phase}
      data-active-src={activeSrc}
      data-reduced-motion={reduced ? "true" : "false"}
    >
      <img
        src={poster}
        alt={phase === "poster" ? alt : ""}
        aria-hidden={phase === "poster" ? undefined : true}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {attachVideo && phase === "video" ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          poster={poster}
          muted
          playsInline
          autoPlay
          loop={playback.loop}
          preload={eager ? "auto" : "none"}
          onEnded={() => {
            if (!playback.cycleImages) return;
            setPhase("images");
          }}
          aria-hidden="true"
        >
          {mobileVideoSrc ? (
            <source src={mobileVideoSrc} type="video/mp4" media="(max-width: 767px)" />
          ) : null}
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : null}
      {phase === "images" && frontSrc ? (
        <>
          <img
            src={backSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: frontOnTop ? 0 : 1, transition, zIndex: 1 }}
          />
          <img
            src={frontSrc}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: frontOnTop ? 1 : 0, transition, zIndex: 2 }}
          />
        </>
      ) : null}
    </div>
  );
}
