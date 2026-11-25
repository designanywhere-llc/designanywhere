import { serviceCatalog } from "../content/services";
import { ESTIMATE_SERVICES } from "./estimate";
import { HERO_IMAGE_SIZES, HERO_POSTER_REL, lookupImage, variantSrcSet } from "./imageMeta";

export const SITE_ORIGIN = "https://designanywhere.org";
export const SITE_NAME = "Design Anywhere";
export const CONTACT_EMAIL = "engineering@designanywhere.org";

export const HOME_TITLE = "Design Anywhere | Premier Remote Mechanical Engineering Team";
export const HOME_DESCRIPTION =
  "Design Anywhere is a premier remote engineering team offering cutting-edge solutions in mechanical design, CAD, prototyping, PDM/PLM, and manufacturing consultation.";

const OG_IMAGE = `${SITE_ORIGIN}/videos/hero-logo-sting-poster.webp`;
const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;

export type PageId = "home" | "pricing" | "contact" | "not-found";

export type PageSeo = {
  id: PageId;
  /** Path the router renders. Directory routes keep the trailing slash GitHub Pages redirects to. */
  ssrPath: string;
  /** Output path under dist/public. */
  file: string;
  title: string;
  description: string;
  canonical?: string;
  robots: string;
  /** Visible h1 text the prerendered HTML must contain. */
  h1: string;
  jsonLd: unknown;
  preloadHero: boolean;
};

function organizationNode() {
  return {
    "@type": ["Organization", "ProfessionalService"],
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: "Design Anywhere LLC",
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/apple-touch-icon.png`,
    image: OG_IMAGE,
    email: CONTACT_EMAIL,
    description: HOME_DESCRIPTION,
    areaServed: "Worldwide",
    sameAs: [
      "https://x.com/IDesignAnywhere",
      "https://www.linkedin.com/company/designanywhere",
    ],
  };
}

function graph(...nodes: unknown[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

const contactDescription =
  "Contact Design Anywhere about product design, CAD, prototyping, tooling, PDM, or manufacturing. Email engineering@designanywhere.org or send a message.";

const pricingDescription =
  "Describe your mechanical engineering project and get a ballpark by service and hours. The first consultation with Design Anywhere is free.";

export const pages: readonly PageSeo[] = [
  {
    id: "home",
    ssrPath: "/",
    file: "index.html",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    canonical: `${SITE_ORIGIN}/`,
    robots: "index,follow",
    h1: "About Design Anywhere",
    preloadHero: true,
    jsonLd: graph(
      organizationNode(),
      ...serviceCatalog.map((service) => ({
        "@type": "Service",
        "@id": `${SITE_ORIGIN}/#service-${service.id}`,
        name: service.title,
        description: service.description,
        serviceType: "Mechanical engineering",
        url: `${SITE_ORIGIN}/#services`,
        provider: { "@id": ORGANIZATION_ID },
      })),
    ),
  },
  {
    id: "pricing",
    ssrPath: "/pricing/",
    file: "pricing/index.html",
    title: "Project Estimate | Design Anywhere",
    description: pricingDescription,
    canonical: `${SITE_ORIGIN}/pricing/`,
    robots: "index,follow",
    h1: "Estimate Your Project",
    preloadHero: false,
    jsonLd: graph(organizationNode(), {
      "@type": "OfferCatalog",
      "@id": `${SITE_ORIGIN}/pricing/#offers`,
      name: "Design Anywhere engineering services",
      url: `${SITE_ORIGIN}/pricing/`,
      itemListElement: ESTIMATE_SERVICES.map((service) => ({
        "@type": "Offer",
        name: service.label,
        url: `${SITE_ORIGIN}/pricing/`,
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: service.rate,
          priceCurrency: "USD",
          referenceQuantity: {
            "@type": "QuantitativeValue",
            value: 1,
            unitCode: "HUR",
          },
        },
        itemOffered: {
          "@type": "Service",
          name: service.label,
          ...(service.note ? { description: service.note } : {}),
          provider: { "@id": ORGANIZATION_ID },
        },
      })),
    }),
  },
  {
    id: "contact",
    ssrPath: "/contact/",
    file: "contact/index.html",
    title: "Contact Design Anywhere | Remote Mechanical Engineering",
    description: contactDescription,
    canonical: `${SITE_ORIGIN}/contact/`,
    robots: "index,follow",
    h1: "Get in Touch",
    preloadHero: false,
    jsonLd: graph(organizationNode(), {
      "@type": "ContactPage",
      "@id": `${SITE_ORIGIN}/contact/#webpage`,
      url: `${SITE_ORIGIN}/contact/`,
      name: "Contact Design Anywhere",
      description: contactDescription,
      mainEntity: { "@id": ORGANIZATION_ID },
    }),
  },
  {
    id: "not-found",
    ssrPath: "/404",
    file: "404.html",
    title: "Page not found | Design Anywhere",
    description: "That page is not part of the Design Anywhere site.",
    robots: "noindex",
    h1: "404 Page Not Found",
    preloadHero: false,
    jsonLd: graph(organizationNode()),
  },
];

export function normalizePath(path: string): string {
  const bare = path.split("#")[0]?.split("?")[0] || "/";
  if (bare.length > 1 && bare.endsWith("/")) return bare.slice(0, -1);
  return bare || "/";
}

export function pageForPath(path: string): PageSeo {
  const normal = normalizePath(path);
  return (
    pages.find((page) => page.id !== "not-found" && normalizePath(page.ssrPath) === normal) ??
    pages.find((page) => page.id === "not-found")!
  );
}

export function realPages(): PageSeo[] {
  return pages.filter((page) => page.id !== "not-found");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonLdScript(data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json" id="site-jsonld">${json}</script>`;
}

export function heroPreloadTag(assetBase: string): string {
  const base = assetBase.endsWith("/") ? assetBase : `${assetBase}/`;
  const src = `${base}${HERO_POSTER_REL}`;
  const meta = lookupImage(src, base);
  const widths = meta?.widths ?? [];
  const srcSet = variantSrcSet(src, "avif", widths);
  const href = src.replace(/\.webp$/i, `-${widths[widths.length - 1]}w.avif`);
  return `<link rel="preload" as="image" id="lcp-preload" href="${escapeHtml(href)}" imagesrcset="${escapeHtml(srcSet)}" imagesizes="${HERO_IMAGE_SIZES}" type="image/avif" fetchpriority="high" />`;
}

export function renderSeoBlock(page: PageSeo, assetBase: string): string {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const image = escapeHtml(OG_IMAGE);
  const lines = [
    `<meta name="robots" content="${escapeHtml(page.robots)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ];
  if (page.canonical) {
    const canonical = escapeHtml(page.canonical);
    lines.push(`<link rel="canonical" id="canonical" href="${canonical}" />`);
    lines.push(`<meta property="og:url" content="${canonical}" />`);
  }
  if (page.preloadHero) lines.push(heroPreloadTag(assetBase));
  lines.push(jsonLdScript(page.jsonLd));
  return lines.join("\n    ");
}

export function applySeoToHtml(template: string, page: PageSeo, assetBase: string): string {
  if (!template.includes("<!--seo-->")) {
    throw new Error("Built index.html is missing the <!--seo--> marker");
  }
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  const descriptionTag = `<meta name="description" content="${escapeHtml(page.description)}" />`;
  if (!/<meta\s+name="description"/i.test(html)) {
    throw new Error("Built index.html is missing the description meta");
  }
  html = html.replace(/<meta\s+name="description"[^>]*>/i, descriptionTag);
  html = html.replace("<!--seo-->", renderSeoBlock(page, assetBase));
  return html;
}

export function renderRobotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}

export function renderSitemapXml(): string {
  const urls = realPages()
    .map((page) => `  <url>\n    <loc>${page.canonical}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Keep the address bar title and share tags in sync after a client-side navigation. */
export function applyDocumentMeta(page: PageSeo, assetBase = "/"): void {
  document.title = page.title;
  upsertMeta("name", "description", page.description);
  upsertMeta("name", "robots", page.robots);
  upsertMeta("property", "og:title", page.title);
  upsertMeta("property", "og:description", page.description);
  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:image", OG_IMAGE);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", page.title);
  upsertMeta("name", "twitter:description", page.description);
  upsertMeta("name", "twitter:image", OG_IMAGE);

  const canonical = document.head.querySelector('link[rel="canonical"]');
  if (page.canonical) {
    const link = canonical ?? document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.id = "canonical";
    link.setAttribute("href", page.canonical);
    if (!canonical) document.head.appendChild(link);
    upsertMeta("property", "og:url", page.canonical);
  } else {
    canonical?.remove();
    document.head.querySelector('meta[property="og:url"]')?.remove();
  }

  const existingLd = document.getElementById("site-jsonld");
  const json = JSON.stringify(page.jsonLd).replace(/</g, "\\u003c");
  if (existingLd) {
    existingLd.textContent = json;
  } else {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "site-jsonld";
    script.textContent = json;
    document.head.appendChild(script);
  }

  const preload = document.getElementById("lcp-preload");
  if (page.preloadHero) {
    if (!preload) {
      document.head.insertAdjacentHTML("beforeend", heroPreloadTag(assetBase));
    }
  } else {
    preload?.remove();
  }
}
