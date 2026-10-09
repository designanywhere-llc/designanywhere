import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  listsStockPhoto,
  motionSlots,
  nextImageIndex,
  realWorkFiles,
  realWorkImagePaths,
  resolvePlayback,
  shouldAttachVideoSource,
  type ServiceId,
} from "./motionMedia";

const publicRoot = path.resolve(import.meta.dirname, "../../public");

describe("real-work photo lists", () => {
  it("keeps Jordan's job photos and leaves every stock lead out", () => {
    const serviceIds = Object.keys(realWorkFiles) as ServiceId[];
    assert.deepEqual(serviceIds.sort(), [
      "cad-3d-modeling",
      "machine-tooling",
      "manufacturing-consultation",
      "pdm-plm",
      "product-design",
      "prototype-dfm",
    ]);
    for (const serviceId of serviceIds) {
      const files = realWorkFiles[serviceId];
      assert.deepEqual(files, ["02.jpg", "03.jpg", "04.jpg"]);
      const paths = realWorkImagePaths(serviceId);
      assert.equal(listsStockPhoto(paths), false);
      for (const relative of paths) {
        assert.equal(
          fs.existsSync(path.join(publicRoot, relative)),
          true,
          relative,
        );
      }
    }
  });

  it("does not serve the removed stock files", () => {
    const removed = [
      "images/hero-engineering.jpg",
      "images/services/product-design/01.jpg",
      "images/services/prototype-dfm/01.jpg",
      "images/services/machine-tooling/01.jpg",
      "images/services/cad-3d-modeling/01.jpg",
      "images/services/pdm-plm/01.jpg",
      "images/services/manufacturing-consultation/01.jpg",
    ];
    for (const relative of removed) {
      assert.equal(fs.existsSync(path.join(publicRoot, relative)), false, relative);
    }
  });
});

describe("motion slots", () => {
  it("points each clip at an encoded video and poster, never a stock photo", () => {
    for (const slot of Object.values(motionSlots)) {
      assert.equal(listsStockPhoto([slot.video, slot.poster, ...slot.images]), false);
      assert.equal(fs.existsSync(path.join(publicRoot, slot.video)), true, slot.video);
      assert.equal(fs.existsSync(path.join(publicRoot, slot.poster)), true, slot.poster);
      if ("mobileVideo" in slot && slot.mobileVideo) {
        assert.equal(
          fs.existsSync(path.join(publicRoot, slot.mobileVideo)),
          true,
          slot.mobileVideo,
        );
      }
    }
  });

  it("loops the hero sting and the services intro, and cycles the three cards", () => {
    assert.deepEqual(motionSlots.hero.images, []);
    assert.equal(motionSlots.hero.loop, true);
    assert.equal(motionSlots.hero.eager, true);
    assert.equal(motionSlots.hero.mobileVideo, "videos/hero-logo-sting-mobile.mp4");

    assert.deepEqual(motionSlots.servicesIntro.images, []);
    assert.equal(motionSlots.servicesIntro.loop, true);
    assert.equal(motionSlots.servicesIntro.eager, false);

    for (const slot of [
      motionSlots.productDesign,
      motionSlots.cad3d,
      motionSlots.machineTooling,
    ]) {
      assert.equal(slot.loop, false);
      assert.equal(slot.eager, false);
      assert.equal(slot.images.length, 3);
    }
  });
});

describe("resolvePlayback", () => {
  it("autoplays, then cycles real-work photos when the clip does not loop", () => {
    assert.deepEqual(resolvePlayback(motionSlots.productDesign, false), {
      autoplay: true,
      loop: false,
      showPoster: true,
      cycleImages: true,
    });
  });

  it("loops the hero instead of cycling, because the only hero still was stock", () => {
    assert.deepEqual(resolvePlayback(motionSlots.hero, false), {
      autoplay: true,
      loop: true,
      showPoster: true,
      cycleImages: false,
    });
  });

  it("does not autoplay or cycle when the visitor prefers reduced motion", () => {
    assert.deepEqual(resolvePlayback(motionSlots.productDesign, true), {
      autoplay: false,
      loop: false,
      showPoster: true,
      cycleImages: false,
    });
    assert.equal(resolvePlayback(motionSlots.hero, true).autoplay, false);
  });
});

describe("shouldAttachVideoSource", () => {
  it("keeps below-the-fold clips unloaded until they are near the viewport", () => {
    assert.equal(
      shouldAttachVideoSource({ reducedMotion: false, eager: false, inView: false }),
      false,
    );
    assert.equal(
      shouldAttachVideoSource({ reducedMotion: false, eager: false, inView: true }),
      true,
    );
  });

  it("loads the hero immediately, and never attaches a source under reduced motion", () => {
    assert.equal(
      shouldAttachVideoSource({ reducedMotion: false, eager: true, inView: false }),
      true,
    );
    assert.equal(
      shouldAttachVideoSource({ reducedMotion: true, eager: true, inView: true }),
      false,
    );
  });
});

describe("nextImageIndex", () => {
  it("wraps through the real-work photos", () => {
    assert.equal(nextImageIndex(0, 3), 1);
    assert.equal(nextImageIndex(2, 3), 0);
    assert.equal(nextImageIndex(0, 0), 0);
  });
});
