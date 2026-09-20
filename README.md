# Design Anywhere

Marketing site for [Design Anywhere](https://designanywhere.org) — a remote mechanical engineering team.

**Intended host:** GitHub Pages (this repo). **Replit is legacy** and should not receive new deploys.

| Environment | URL |
| --- | --- |
| **Custom domain (canonical)** | `https://designanywhere.org` |
| Pages preview | `https://designanywhere-llc.github.io/designanywhere/` |

Pages is published from the Vite client build (`dist/public`) by `.github/workflows/pages.yml`. The deploy artifact includes a root `CNAME` (`designanywhere.org`). The workflow builds with `BASE_PATH` from `actions/configure-pages` (`/` on a custom domain so assets load at the apex).

## Service card photos

Homepage service cards cycle 4 images on hover. Drop real job photos into:

`client/public/images/services/<service-id>/01.jpg` … `04.jpg`

See [`client/public/images/services/README.md`](client/public/images/services/README.md) for folder names, sizing, and the filename convention. Replacing those files does not require a code change.

## Contact form

The `/contact` form POSTs to **[FormSubmit](https://formsubmit.co)** — no Express server and no API keys:

`https://formsubmit.co/ajax/engineering@designanywhere.org`

| Field | Value |
| --- | --- |
| **To** | `engineering@designanywhere.org` |
| **CC** | `jordanbell@designanywhere.org` (FormSubmit supports `_cc`, not BCC) |
| **Reply-To** | the visitor's email |

A visible `engineering@designanywhere.org` mailto remains on the form as a fallback.

**First submission:** FormSubmit emails `engineering@` a one-time confirmation link. Click it before leads will forward. After that, inbound messages land in engineering@ (CC jordanbell@).

**Later:** Namecheap-hosted mailbox for `engineering@` / `leads@` is planned; FormSubmit keeps working as a free forwarder until then. **Sales Bot** will monitor these leads.

The Express `POST /api/contact` + Resend path is still in the repo for local/legacy use. The static site does not call it.

## Scripts

```bash
npm install
npm run dev            # legacy: Vite + Express (Resend API still mounted)
npm run check          # tsc
npm run build:client   # static marketing site → dist/public
npm run preview        # preview the Vite client build
npm run build          # full client + Express bundle (local / Replit leftover)
npm start              # production Express (dist/index.cjs)
```

## GitHub Pages

1. Repo **Settings → Pages → Source: GitHub Actions** (required once).
2. Push to `main` (or run **Deploy GitHub Pages** via workflow_dispatch).
3. Canonical: **https://designanywhere.org** (preview: **https://designanywhere-llc.github.io/designanywhere/**).

The workflow builds with `BASE_PATH` from `actions/configure-pages` so asset URLs work on the project site (`/designanywhere/`) and on the custom domain (`/`). Client routes `/`, `/contact`, and `/pricing` are emitted as folders plus a `404.html` SPA fallback.

### Custom domain

A root `CNAME` file (`designanywhere.org`) is copied into `dist/public` after `build:client` so the Pages artifact publishes the apex domain. DNS is managed outside this repo (Squarespace); do not drop existing iCloud mail records.

| Host | Type | Value |
| --- | --- | --- |
| `@` (apex) | A | `185.199.108.153` |
| `@` (apex) | A | `185.199.109.153` |
| `@` (apex) | A | `185.199.110.153` |
| `@` (apex) | A | `185.199.111.153` |
| `www` (optional) | CNAME | `designanywhere-llc.github.io` |

Leave MX and TXT records for iCloud mail unchanged. After DNS points at GitHub, wait for Pages HTTPS on `designanywhere.org`.

## Required secrets

**None for GitHub Pages or the contact form.** FormSubmit is a free email forwarder.

Express/Resend (optional, local only) still reads:

| Variable | Required | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | Only for `POST /api/contact` | From the Resend dashboard. Unused on Pages. |
| `CONTACT_FROM_EMAIL` | No | Defaults to the Resend sandbox sender. |
| `CONTACT_TO_EMAIL` | No | Defaults to `engineering@designanywhere.org`. |
| `CONTACT_BCC_EMAIL` | No | Defaults to `jordanbell@designanywhere.org`. |

Copy `.env.example` for local Express. Never commit `.env`.
