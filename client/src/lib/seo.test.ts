import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  SITE_ORIGIN,
  pages,
  pageForPath,
  realPages,
  renderRobotsTxt,
  renderSitemapXml,
} from "./seo";

const publicDir = path.resolve(import.meta.dirname, "../../public");

describe("page metadata", () => {
  it("gives each real route its own title, description, and canonical on designanywhere.org", () => {
    const live = realPages();
    assert.equal(live.length, 3);
    assert.equal(new Set(live.map((page) => page.title)).size, 3);
    assert.equal(new Set(live.map((page) => page.description)).size, 3);
    assert.equal(new Set(live.map((page) => page.canonical)).size, 3);
    for (const page of live) {
      assert.match(page.canonical ?? "", /^https:\/\/designanywhere\.org\//);
      assert.equal(page.robots, "index,follow");
      assert.equal(page.h1.length > 0, true);
    }
    assert.equal(pageForPath("/").title, HOME_TITLE);
    assert.equal(pageForPath("/").description, HOME_DESCRIPTION);
    assert.notEqual(pageForPath("/contact").title, pageForPath("/pricing/").title);
    assert.equal(pageForPath("/contact/").id, "contact");
    assert.equal(pageForPath("/pricing").id, "pricing");
    assert.equal(pageForPath("/missing").id, "not-found");
    assert.equal(pageForPath("/missing").robots, "noindex");
  });

  it("describes the company without a personal name", () => {
    const blob = JSON.stringify(pages);
    assert.equal(/jordan/i.test(blob), false);
    assert.match(blob, /"Organization"/);
    assert.match(blob, /"ProfessionalService"/);
    assert.match(blob, /"Service"/);
    assert.match(blob, /Design Anywhere/);
    assert.equal(blob.includes("engineering@designanywhere.org"), true);
  });
});

describe("robots and sitemap", () => {
  it("points crawlers at the designanywhere.org sitemap", () => {
    const robots = renderRobotsTxt();
    const sitemap = renderSitemapXml();
    assert.match(robots, /Sitemap: https:\/\/designanywhere\.org\/sitemap\.xml/);
    assert.match(sitemap, /<loc>https:\/\/designanywhere\.org\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/designanywhere\.org\/pricing\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/designanywhere\.org\/contact\/<\/loc>/);
    assert.equal(sitemap.includes("/404"), false);
    assert.equal(fs.readFileSync(path.join(publicDir, "robots.txt"), "utf8"), robots);
    assert.equal(fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf8"), sitemap);
    assert.equal(SITE_ORIGIN, "https://designanywhere.org");
  });
});
