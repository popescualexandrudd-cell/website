# Proxy și TLS

> **Stare:** construit în Etapa 14A (06.10.2026): [`Caddyfile`](Caddyfile), [`Dockerfile`](Dockerfile) (Caddy + aplicațiile statice), [`test-proxy`](test-proxy) (31 de verificări pe un Caddy real).

Configurarea Caddy: subdomeniile din §4.6, TLS automat, verificarea certificatelor dispozitivelor (mTLS), headere de securitate.

## Specificații

- [4. ARHITECTURA SISTEMULUI](../../docs/04-arhitectura/01-arhitectura-sistemului.md)
- [12.1 Securitate](../../docs/07-securitate-gdpr-legal/01-securitate.md)

## Decizii tehnice

[ADR-0015](../../docs/04-arhitectura/adr/0015-infrastructura-docker-caddy.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md)

## Timp real (Etapa 9, ADR-0005)

Ecranele de la terenuri și din lobby primesc actualizările live pe `wss://<domeniul API>/ws/screens/?ticket=…` (un bilet de o singură folosință, valabil 60 de secunde, cerut de ecran cu tokenul lui prin API). În producție:
- `/ws/*` merge la un proces ASGI separat: `daphne -b 0.0.0.0 -p 8001 jungle.asgi:application`, din aceeași imagine ca backendul;
- restul (`/api/*`, adminul) merge la gunicorn, ca până acum;
- `REDIS_URL` e obligatoriu în producție: prin Redis ajung anunțurile de la procesul care a făcut schimbarea (site, recepție, sarcini) la procesul ASGI.

În dezvoltare (`deploy/compose/dev`), backendul rulează direct sub daphne, pe același port.

## Subdomeniile (§4.6, Etapa 14A)
| Subdomeniu | Ce servește | Cine intră |
|---|---|---|
| `<domeniu>` | redirecționare spre `www` | oricine |
| `www` | site-ul (Next.js) | oricine |
| `api` | API-ul; `/ws/` merge la canalul live | oricine (site-ul, telefonul) |
| `admin` | panoul, cu API-ul pe aceeași origine | personalul (2FA) |
| `device` | API-ul aparatelor | doar cu certificatul clubului (mTLS) |
| `kiosk-liga`, `kiosk-plati`, `ecrane`, `cafe` | aplicațiile aparatelor | doar cu certificatul clubului (mTLS) |

Headerul `X-Client-Cert-SHA256` e șters pe toate subdomeniile. Pe cele ale aparatelor e pus de Caddy, din certificatul verificat. Astfel nimeni nu se poate da drept un aparat trimițând headerul din afară; `test-proxy` verifică exact asta.

