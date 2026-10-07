# Pachete partajate

Cod folosit de mai multe aplicații. Pachetele nu importă niciodată din `apps/` (ADR-0002).

- [`api-client/`](api-client/) — Clientul API (TypeScript, generat)
- [`design-tokens/`](design-tokens/) — Design tokens
- [`i18n/`](i18n/) — Traduceri (i18n)
- [`kiosk-kit/`](kiosk-kit/) — Ce au în comun ecranele aparatelor (bridge, texte, tastaturi, stil)
- [`league-engine/`](league-engine/) — Motorul ligii (Python pur)

Componentele React comune aparatelor stau în `kiosk-kit/`; site-ul și panoul își țin componentele în aplicația lor (ADR-0025).
