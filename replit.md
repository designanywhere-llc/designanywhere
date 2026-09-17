# Design Anywhere Website

A professional website for **Design Anywhere** — a premier remote mechanical engineering team. This is a replica of the site at myhomenippon.wpengine.com, intended to be served from designanywhere.org.

## Pages

- **Home** (`/`) — Full landing page with hero, 6 service cards, stats section, and CTAs
- **Contact** (`/contact`) — Contact form with name, email, phone, service, subject, and message fields

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (static file serving only — no API routes needed)
- **Routing**: Wouter
- **Forms**: react-hook-form + zod validation
- **Icons**: lucide-react + react-icons/si (social media logos)

## Project Structure

```
client/src/
  pages/
    home.tsx        # Landing page with hero, services, stats, CTAs
    contact.tsx     # Contact form — submits via mailto: link
  components/
    navbar.tsx      # Sticky transparent-to-solid navbar
    footer.tsx      # Footer with logo, email, X/LinkedIn links, quick links, services
    logo.tsx        # Logo component (mix-blend-mode: screen on JPEG)
    ui/             # shadcn/ui components
server/
  routes.ts         # Empty — no backend API routes
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

The contact form uses `mailto:` — when submitted, it opens the visitor's default email client with all fields pre-filled (name, email, phone, service, subject, message) addressed to `engineering@designanywhere.org`. No backend or API key required.

## Deployment

Configured as **autoscale** on Replit. Build: `npm run build`. Run: `node ./dist/index.cjs`. Custom domain: designanywhere.org.
