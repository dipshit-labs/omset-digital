# Omset Digital — Wayfinder Map

> Label: `wayfinder:map`
> Repo: ashtrath/omset-digital
> Status: open

## Destination

A complete spec for Omset Digital: a multi-tenant SaaS storefront platform for Indonesian SMEs, with optional BYOK Xendit payment and RajaOngkir shipping integrations, built on PayloadCMS v3 + Next.js + PostgreSQL, deployed via Dokploy on a Hostinger KVM2 VPS. The spec is ready to hand to `/to-tickets` → `/implement`.

## Notes

- Stack: PayloadCMS v3 (Drizzle + PostgreSQL), Next.js (theme switching), Dokploy on Hostinger KVM2 VPS
- Multi-tenancy: single Payload instance, tenant-scoped collections
- BYOK: merchant registers directly with Xendit and RajaOngkir; their keys are stored per-tenant; Omset Digital never holds platform funds
- Checkout: cart on Omset Digital → Xendit invoice API with merchant key → Xendit hosted payment page → webhook confirms payment
- Shipping: live RajaOngkir rates at checkout; generic shipping provider interface (extensible)
- Fallback: WhatsApp pre-filled cart message when Xendit not configured
- Pricing: single flat annual plan + 14-day free trial
- Custom domain: merchant sets CNAME → Omset Digital; auto SSL on first request (Traefik via Dokploy handles this)
- Skills to consult each session: `/grilling`, `/domain-modeling`

## Decisions so far

_(empty — no tickets resolved yet)_

## Not yet specified

- Template design system: how themes are structured as React component sets; how section customization works within a theme (which sections are configurable, what data each section accepts)
- Xendit checkout flow details: invoice creation payload, webhook signature verification, idempotency on retries, payment failure handling
- RajaOngkir integration specifics: which API plan (free vs paid), which endpoints for cost calculation, how merchant keys are validated on save
- Email provider for buyer order confirmation: Resend, Nodemailer + SMTP, or other; whether email is sent by Payload's hooks or a separate worker
- Subdomain routing: wildcard DNS + Dokploy/Traefik config for `*.omsetdigital.com` and custom domains
- Blog: Payload collection shape, whether posts are per-tenant or platform-wide, slug routing in Next.js
- Digital product delivery: how download links are generated and secured after payment
- Storefront section customization: what sections exist (hero, product grid, about, contact, testimonials?), which fields are editable per section

## Out of scope

_(nothing ruled out yet)_
