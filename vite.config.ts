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
 * The prerendered HTML is the first paint. Running the client bundle immediately
 * keeps the main thread busy and delays that paint on a slow phone, so the
 * module is attached on the first frame after CSS has been applied.
 */
function deferClientBundle(): Plugin {
  return {
    name: "defer-client-bundle",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.replace(
          /<script type="module"( crossorigin)? src="([^"]+)"><\/script>/,
          (_match, cross: string | undefined, src: string) => {
            const crossAssign = cross ? 's.crossOrigin="anonymous";' : "";
            return `<script>
      (function () {
        function load() {
          var s = document.createElement("script");
          s.type = "module";
          s.src = ${JSON.stringify(src)};
          ${crossAssign}
          document.body.appendChild(s);
        }
        function arm() {
          requestAnimationFrame(function () { requestAnimationFrame(load); });
        }
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", arm, { once: true });
        } else {
          arm();
        }
      })();
    </script>`;
          },
        );
      },
    },
  };
}

/**
 * GitHub Pages has no SPA fallback. Copy the shell to 404.html and to each
 * client route so a hard refresh works even before prerender. script/postbuild-static.ts
 * then replaces those files with per-route HTML.
 *
 * The repo-root CNAME is copied into dist/public by .github/workflows/pages.yml
 * after this build so Pages serves designanywhere.org.
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
    deferClientBundle(),
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
