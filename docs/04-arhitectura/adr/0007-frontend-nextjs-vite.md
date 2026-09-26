# ADR-0007: Frontend — Next.js pentru website, React + Vite pentru celelalte aplicații

- **Stare:** Acceptat (26.09.2026, odată cu aprobarea Etapei 0 de către proprietar)
- **Data:** 2026-09-26
- **Legat de:** §4.3, §8, §9, §15.1

## Context
Website-ul are nevoie de randare pe server (SSR/SSG) pentru SEO, URL-uri localizate și PWA. Adminul, chioșcurile, ecranele și afișajul cafenelei sunt aplicații de tip „ecran” (fără nevoi de SEO), care trebuie să pornească rapid și să funcționeze stabil pe aparate dedicate.

## Decizie
1. **`apps/web`: Next.js** (App Router, SSR/SSG), TypeScript strict, `next-intl` pentru rute localizate (`/ro/…`, `/en/…`), PWA (manifest + service worker, notificări push), animații la scroll (GSAP ScrollTrigger sau Framer Motion; alegerea finală în Etapa 11) cu variantă „reduced motion” completă.
2. **`apps/admin`, `apps/kiosk-league`, `apps/kiosk-payments`, `apps/court-screens`, `apps/cafe-display`: React + Vite** (aplicații într-o singură pagină), TypeScript strict, TanStack Query pentru date, React Router.
3. **`packages/api-client`:** generat din schema OpenAPI a backend-ului cu `openapi-typescript` + `openapi-fetch` (client subțire, complet tipat, fără cod scris de mână pentru contract).
4. **`packages/ui`:** componente React partajate, accesibile (WCAG 2.2 AA), construite doar pe tokenii din `packages/design-tokens` (ADR-0020).
5. **Stil:** Tailwind CSS cu tema legată de variabilele CSS generate din tokeni (o schimbare de identitate vizuală = o schimbare de tokeni).
6. Versiunile curente la data deciziei (verificate pe npm pe 26.09.2026): Next.js 16.x, React 19.x, Vite 8.x. Versiunile exacte se fixează în fișierul de blocare la prima instalare.

## Alternative analizate
- **Next.js pentru toate aplicațiile:** chioșcurile și ecranele nu au nevoie de SSR; Vite produce pachete statice simple, ușor de servit și de pus în cache pe aparat. Respins.
- **Astro / Remix pentru website:** §4.3 cere Next.js; ecosistemul Next.js e cel mai răspândit (ușor de preluat de un programator). Respins.
- **CSS scris manual fără framework:** mai mult cod de întreținut; Tailwind legat de tokeni păstrează un singur loc de adevăr. Respins.

## Consecințe
- Două unelte de build (Next.js și Vite), dar aceleași componente, tokeni, traduceri și client API.
- Orice schimbare de API se vede imediat ca eroare de tip în toate aplicațiile afectate.
