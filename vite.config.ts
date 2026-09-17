import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

/** GitHub Pages `base_path` is `/` or `/repo` (no trailing slash). Vite wants a trailing slash. */
function viteBase(): string {
  const raw = process.env.BASE_PATH;
  if (!raw || raw === "/") return "/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

/**
 * GitHub Pages has no SPA fallback. Copy index.html to 404.html and to each
 * client route so /contact and /pricing work on a hard refresh.
 *
 * Do not copy the repo-root CNAME into the artifact until DNS is cut over to
 * GitHub; publishing it now would send the github.io preview to Replit.
 */
function githubPagesSpaFallback(): Plugin {
  return {
    name: "github-pages-spa-fallback",
    apply: "build",
    writeBundle() {
      const outDir = path.resolve(import.meta.dirname, "dist/public");
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) return;
      const html = fs.readFileSync(indexPath, "utf-8");
      fs.writeFileSync(path.join(outDir, "404.html"), html);
      fs.writeFileSync(path.join(outDir, ".nojekyll"), "");
      for (const route of ["contact", "pricing"]) {
        const dir = path.join(outDir, route);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), html);
      }
    },
  };
}

export default defineConfig({
  base: viteBase(),
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" ? [runtimeErrorOverlay()] : []),
    githubPagesSpaFallback(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
