# Design Anywhere Website

A professional website for **Design Anywhere** — a premier remote mechanical engineering team. This is a replica of the site at myhomenippon.wpengine.com, intended to be served from designanywhere.org.

## Pages

- **Home** (`/`) — Full landing page with hero, 6 service cards, stats section, and CTAs
- **Contact** (`/contact`) — Contact form with name, email, phone, service, subject, and message fields

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (static serving + `POST /api/contact` via Resend)
- **Routing**: Wouter
- **Forms**: react-hook-form + zod validation
- **Icons**: lucide-react + react-icons/si (social media logos)

## Project Structure

```
client/src/
  pages/
    home.tsx        # Landing page with hero, services, stats, CTAs
    contact.tsx     # Contact form — POST /api/contact
  components/
    navbar.tsx      # Sticky transparent-to-solid navbar
    footer.tsx      # Footer with logo, email, X/LinkedIn links, quick links, services
    logo.tsx        # Logo component (mix-blend-mode: screen on JPEG)
    ui/             # shadcn/ui components
server/
  routes.ts         # POST /api/contact
  contact.ts        # Validation, rate limit, Resend send
client/public/images/
  hero-engineering.jpg
  product-design.jpg
  prototype-dfm.jpg
  machine-tooling.jpg
  cad-3d-modeling.jpg
  pdm-plm.jpg
  manufacturing-consultation.jpg
```

## Services

1. Product Design
2. Prototype & DFM
3. Machine & Tooling Design
4. 3D Modeling & CAD Services
5. PDM/PLM Creation
6. Manufacturing Solutions Consultation

## Contact Form

The public contact form posts to `https://api.designanywhere.org/api/lead` (Vercel function in `services/lead-api`). Leads are stored in Vercel Blob, then emailed **To** `engineering@designanywhere.org` and **Bcc** `jordanbell@designanywhere.org` via Resend. A mailto fallback remains on the page. The Express `POST /api/contact` path is local/legacy only. See `README.md`.

## Deployment

Configured as **autoscale** on Replit. Build: `npm run build`. Run: `node ./dist/index.cjs`. Custom domain: designanywhere.org still points at Replit (no DNS change in this work). Add `RESEND_API_KEY` as a Replit secret so leads send.
