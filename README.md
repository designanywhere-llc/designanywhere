# Design Anywhere

Marketing site for [Design Anywhere](https://designanywhere.org) — a remote mechanical engineering team. React/Vite client with an Express server.

**Live site:** `designanywhere.org` still points at the Replit deployment. This GitHub repo is the source of truth for upcoming changes; do not change DNS until a later cutover.

## Contact email

The `/contact` form submits to **`POST /api/contact`**. The server validates the same fields as the client, then sends a transactional email via [Resend](https://resend.com):

| Field | Value |
| --- | --- |
| **To** | `engineering@designanywhere.org` |
| **Bcc** | `jordanbell@designanywhere.org` |
| **From** | `onboarding@resend.dev` (Resend sandbox) until the domain is verified, then `leads@designanywhere.org` |
| **Reply-To** | the visitor's email |

Visitors without a mail client no longer depend on `mailto:`. A visible `engineering@designanywhere.org` link remains on the form as a fallback.

CI typecheck/build does **not** need `RESEND_API_KEY`. Sending email only happens at runtime when that secret is set (Replit Secrets today).

## Required secrets

Copy `.env.example` and fill in values locally or in Replit Secrets. Never commit `.env`.

| Variable | Required | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | Yes (to send) | From the Resend dashboard. If missing, the API returns `503` and asks the visitor to email engineering@ directly. |
| `CONTACT_FROM_EMAIL` | No | Defaults to `Design Anywhere <onboarding@resend.dev>`. After verifying `designanywhere.org` in Resend, set `Design Anywhere <leads@designanywhere.org>`. |
| `CONTACT_TO_EMAIL` | No | Defaults to `engineering@designanywhere.org`. |
| `CONTACT_BCC_EMAIL` | No | Defaults to `jordanbell@designanywhere.org`. |

## Scripts

```bash
npm install
npm run dev      # development (Vite + Express)
npm run check    # tsc
npm run build    # client + server
npm start        # production (dist/index.cjs)
```

## Deployment

Still **autoscale on Replit**. Build: `npm run build`. Run: `node ./dist/index.cjs`. Add `RESEND_API_KEY` (and optionally `CONTACT_FROM_EMAIL`) as Replit secrets so contact leads actually send.
