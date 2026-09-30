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

The `/contact` form POSTs JSON to the lead API:

`https://api.designanywhere.org/api/lead`

That URL is the `CONTACT_ENDPOINT` constant in `client/src/lib/submitContact.ts`. The static site stays on GitHub Pages. The API is a separate Vercel project (see [Lead API](#lead-api)).

The function writes the lead to Vercel Blob first, then emails it with Resend:

| Field | Value |
| --- | --- |
| **To** | `engineering@designanywhere.org` |
| **Bcc** | `jordanbell@designanywhere.org` |
| **From** | `Design Anywhere <leads@contact.designanywhere.org>` |
| **Reply-To** | the visitor's email |

If that POST fails — non-OK status, non-JSON body, `success` not `true`, a network error, or no response within about 10 seconds — the page opens the visitor's email app with a prefilled message to `engineering@designanywhere.org` (CC `jordanbell@designanywhere.org`) using their name, email, phone, service, subject, and message. Mailto has no Bcc field, so the fallback still uses CC. The form stays on screen with a link to open that email again and a plain display of the address. Very long messages are shortened so the mailto link stays usable.

`{ success: true, id }` counts as received, including `{ success: true, id, emailed: false }` when the lead was stored but Resend failed. A JSON `message` that mentions activation is still treated as received so an old FormSubmit confirmation body is not shown as a failure.

The JSON body includes the form fields, `type: "contact"`, a hidden `_honey` honeypot, and `_url`. `_cc` and `_captcha` are not sent. If `_honey` is non-empty, the API returns success and does not store or email the submission.

The Express `POST /api/contact` + Resend path is still in the repo for local/legacy use. The static site does not call it.

## Lead API

Source: `services/lead-api`. It deploys on its own to `https://api.designanywhere.org` as `POST /api/lead` (plus an `OPTIONS` preflight). GitHub Pages does not build or upload it (`.github/workflows/pages.yml` ignores that directory).

Vercel project settings:

| Setting | Value |
| --- | --- |
| **Root Directory** | `services/lead-api` |
| **Framework Preset** | Other |
| **Build Command** | empty — this package has no build script. Do not use the repository `npm run build` or `npm run build:client`. |
| **Output Directory** | empty — no static output. Do not set `dist`, `dist/public`, or `public`. |

The repository-root `vercel.json` fails the build on purpose if the Root Directory is left as the repo root, so the marketing site cannot be published on the API host.

Create the Blob store as **private** and connect it to this Vercel project. Vercel then injects `BLOB_READ_WRITE_TOKEN`. Leads are stored at `leads/YYYY/MM/<ISO timestamp>-<random>.json`. If the store rejects private access, the function retries once as a public blob with an unguessable suffix and does not publish a listing. Success is returned only after the blob write. If email fails after that, the response is still `{ success: true, id, emailed: false }` and the failure is written back onto the blob (or a `.email-error.json` sidecar).

List recent leads (for the owner's assistant):

```bash
BLOB_READ_WRITE_TOKEN=... npm run leads:list
npm run leads:list -- --limit 20
```

### Environment variables

Set these on the **Vercel** project. Do not commit secret values. GitHub Pages does not read them.

| Variable | Required | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | Yes, to send mail | From the Resend dashboard. `contact.designanywhere.org` is the verified sending domain. |
| `CONTACT_FROM_EMAIL` | No | Default `Design Anywhere <leads@contact.designanywhere.org>`. |
| `CONTACT_TO_EMAIL` | No | Default `engineering@designanywhere.org`. |
| `CONTACT_BCC_EMAIL` | No | Default `jordanbell@designanywhere.org`. |
| `CONTACT_ALLOWED_ORIGIN` | No | Comma-separated. Default `https://designanywhere.org,https://www.designanywhere.org`. |
| `BLOB_READ_WRITE_TOKEN` | Injected | Set automatically when a Blob store is connected to the project. |

`http://localhost:5173` is also allowed when `NODE_ENV` is not `production`. When `CONTACT_ALLOWED_ORIGIN` is set, it replaces the default list (localhost in non-production is still added).

The legacy local Express server still reads `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`, and `CONTACT_BCC_EMAIL` for `POST /api/contact`. Its From default remains the Resend sandbox sender.

## Scripts

```bash
npm install
npm run dev            # legacy: Vite + Express (Resend API still mounted)
npm run check          # tsc
npm test               # contact form submit, mailto fallback, and lead API
npm run leads:list     # list recent lead blobs (needs BLOB_READ_WRITE_TOKEN)
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

**None for GitHub Pages.** The contact form in the browser calls the public lead API; it does not embed keys.

The Vercel lead API needs the variables in [Lead API](#lead-api). Copy `.env.example` for local names. Never commit `.env`.
