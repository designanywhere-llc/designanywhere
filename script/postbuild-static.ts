import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";
import { optimizePublicImages } from "./optimize-images";
import { applySeoToHtml, pages, renderRobotsTxt, renderSitemapXml } from "../client/src/lib/seo";

const repoRoot = path.resolve(import.meta.dirname, "..");
const distPublic = path.join(repoRoot, "dist/public");

/** Match vite.config.ts so asset URLs in prerendered HTML match the client bundle. */
function viteBase(): string {
  const raw = process.env.BASE_PATH;
  if (!raw || raw === "/") return "/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertPage(html: string, page: (typeof pages)[number]) {
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  if (title !== page.title) {
    throw new Error(`${page.file} title was ${JSON.stringify(title)}`);
  }
  if (!html.includes(`content="${page.description}"`)) {
    throw new Error(`${page.file} is missing its meta description`);
  }
  if (page.canonical) {
    if (!html.includes('rel="canonical"') || !html.includes(`href="${page.canonical}"`)) {
      throw new Error(`${page.file} is missing canonical ${page.canonical}`);
    }
  }
  if (!html.includes('name="twitter:card"')) {
    throw new Error(`${page.file} is missing Twitter card tags`);
  }
  if (!html.includes('type="application/ld+json"')) {
    throw new Error(`${page.file} is missing JSON-LD`);
  }
  const heading = page.h1
    .split(/\s+/)
    .map(escapeRegex)
    .join("[\\s\\S]{0,300}");
  if (!new RegExp(`<h1[^>]*>[\\s\\S]*${heading}[\\s\\S]*</h1>`, "i").test(html)) {
    throw new Error(`${page.file} is missing h1 text ${page.h1}`);
  }
  const head = html.slice(0, html.indexOf("</head>"));
  if (/jordan/i.test(head)) {
    throw new Error(`${page.file} head includes a personal name`);
  }
}

/** The latin Inter file is what the hero text uses. Preload it so the swap is not the LCP. */
function withFontPreload(html: string): string {
  const cssHref = html.match(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"/)?.[1];
  if (!cssHref) return html;
  const cssPath = path.join(distPublic, cssHref.replace(/^\//, ""));
  if (!fs.existsSync(cssPath)) return html;
  const css = fs.readFileSync(cssPath, "utf8");
  const fonts = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((match) =>
    match[1].replace(/["']/g, ""),
  );
  const latin = fonts.find((url) => url.includes("inter-latin-") && !url.includes("latin-ext"));
  if (!latin) return html;
  const tag = `<link rel="preload" as="font" type="font/woff2" href="${latin}" crossorigin />`;
  if (html.includes(tag)) return html;
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

export async function postbuildStatic(): Promise<void> {
  const templatePath = path.join(distPublic, "index.html");
  const template = withFontPreload(fs.readFileSync(templatePath, "utf8"));
  await optimizePublicImages(distPublic);

  const ssrOut = path.join(repoRoot, "dist/ssr");
  await build({
    configFile: false,
    root: path.join(repoRoot, "client"),
    base: viteBase(),
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.join(repoRoot, "client/src"),
        "@shared": path.join(repoRoot, "shared"),
        "@assets": path.join(repoRoot, "attached_assets"),
      },
    },
    build: {
      ssr: path.join(repoRoot, "client/src/entry-server.tsx"),
      outDir: ssrOut,
      emptyOutDir: true,
    },
    ssr: { noExternal: true },
    logLevel: "info",
  });

  const bundle = path.join(ssrOut, "entry-server.js");
  const { render } = (await import(pathToFileURL(bundle).href)) as {
    render: (url: string) => string;
  };

  const titles = new Set<string>();
  for (const page of pages) {
    const body = render(page.ssrPath);
    const html = applySeoToHtml(template, page, viteBase()).replace(
      '<div id="root"></div>',
      `<div id="root">${body}</div>`,
    );
    assertPage(html, page);
    if (titles.has(page.title)) throw new Error(`Duplicate title ${page.title}`);
    titles.add(page.title);
    const file = path.join(distPublic, page.file);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
  }

  fs.writeFileSync(path.join(distPublic, "robots.txt"), renderRobotsTxt());
  fs.writeFileSync(path.join(distPublic, "sitemap.xml"), renderSitemapXml());
  fs.writeFileSync(path.join(distPublic, ".nojekyll"), "");
  console.log(`Prerendered ${pages.length} HTML files, robots.txt, and sitemap.xml`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (invokedDirectly) {
  postbuildStatic().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
