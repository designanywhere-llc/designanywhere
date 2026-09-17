# Design Anywhere

Marketing site for [Design Anywhere](https://designanywhere.org) — a remote mechanical engineering team.

**Intended host:** GitHub Pages (this repo). **Replit is legacy** and should not receive new deploys.

**Live custom domain:** `designanywhere.org` still points at the old Replit deployment. Do not change Namecheap DNS until a later cutover. Until then, use the GitHub Pages preview:

| Environment | URL |
| --- | --- |
| **Pages preview** | `https://designanywhere-llc.github.io/designanywhere/` |
| Custom domain (later) | `https://designanywhere.org` |

Pages is published from the Vite client build (`dist/public`) by `.github/workflows/pages.yml`.

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
3. Preview: **https://designanywhere-llc.github.io/designanywhere/**

The workflow builds with `BASE_PATH` from `actions/configure-pages` so asset URLs work on the project site (`/designanywhere/`). Client routes `/`, `/contact`, and `/pricing` are emitted as folders plus a `404.html` SPA fallback.

### Custom domain (not tonight)

A `CNAME` file at the repo root contains `designanywhere.org`. It is **not** copied into the Pages artifact yet, so the github.io preview keeps working while DNS still points at Replit.

When you are ready to cut over:

1. Point Namecheap DNS for `designanywhere.org` (and `www` if desired) at GitHub Pages.
2. Copy `CNAME` into the published site (e.g. add `cp CNAME dist/public/CNAME` to the Pages workflow after `build:client`) **or** set the custom domain in **Settings → Pages**.
3. Wait for HTTPS; then `https://designanywhere.org` is canonical.

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
