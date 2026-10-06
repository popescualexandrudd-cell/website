# Etapa 14 — Deploy, securitate, backup, monitorizare, hardware real: raport

## Faza 14A — Producția în Docker Compose, proxy-ul Caddy, planificatorul, 06.10.2026

### Ce s-a construit
1. **Producția, într-un singur fișier** (`deploy/compose/prod/compose.yaml`):
   - **baza de date** (PostgreSQL 17) și **Redis**;
   - **`migrate`**, care pornește primul și aduce baza de date la zi;
   - **backend-ul** (API-ul și panoul), **canalul live** al ecranelor și **planificatorul**;
   - **site-ul** și **proxy-ul**.

   Doar proxy-ul se vede din internet, pe porturile 80 și 443. Setările stau într-un fișier de pe server (`/etc/jungle/prod.env`), după modelul `.env.example`, fără niciun secret în cod.
2. **Proxy-ul (Caddy):**
   - certificatele HTTPS se obțin și se reînnoiesc singure;
   - fiecare parte are subdomeniul ei (§4.6): `www`, `api`, `admin`, `device`, `kiosk-liga`, `kiosk-plati`, `ecrane`, `cafe`;
   - aparatele intră doar cu certificatul clubului: fără el, conexiunea e refuzată, iar backend-ul verifică în plus că certificatul e chiar al aparatului (ADR-0012);
   - nimeni nu se poate da drept aparat trimițând din afară headerul certificatului;
   - headerele de securitate și politicile de conținut (CSP) sunt puse pe toate paginile.
3. **Planificatorul (ADR-0024, înlocuiește Celery din ADR-0006):**
   - rulează la minut sarcinile programate: mesajele, neprezentările, scorurile expirate, sarcina zilnică a ligii, memento-urile zilei, curățarea listei de așteptare;
   - fiecare rulare se notează 30 de zile;
   - o sarcină zilnică ratată (serverul oprit) rulează imediat ce serverul pornește, în aceeași zi;
   - după fiecare tură reușită, trimite un semnal de viață monitorizării.
4. **Imaginile Docker:** backend-ul, site-ul și proxy-ul, în care sunt incluse panoul, chioșcurile, ecranele și afișajul cafenelei. Imaginile de bază se pot schimba pentru o construire în spatele unui proxy de rețea.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Planificatorul (`jungle/scheduler`, 100% pe ramuri) | 9 teste: fiecare sarcină e o comandă reală, fără ore între 03 și 04; intervalul; ziua clubului, inclusiv după o oprire și în noaptea trecerii la ora de vară; un eșec nu le oprește pe celelalte; semnalul de viață doar după o tură reușită; un singur planificator odată; comanda pornită și oprită. |
| Proxy-ul pe un Caddy real (`deploy/proxy/test-proxy`) | 31 de verificări: headerul falsificat e șters pe www, api și admin; aparatele fără certificat sau cu certificat străin sunt refuzate; backend-ul primește amprenta reală; aplicațiile, CSP, HSTS, redirecționarea domeniului. |
| Tot sistemul (`deploy/scripts/smoke-stack`) | construit din Dockerfile-uri și pornit din fișierul de producție, verificat prin proxy: site-ul, API-ul, panoul, chioșcul cu și fără certificat, API-ul aparatelor; `manage.py check --deploy` fără avertismente; planificatorul a făcut o tură. |
| `scripts/test-deploy` | toate trei, rulate și în CI la fiecare push (jobul `deploy`). |

### Ce decideți
- **Q72:** cât timp și câte date poate pierde clubul la o avarie. Varianta implicită: cel mult o oră de date, refacere în cel mult 4 ore.
- **Q73:** unde se ține copia backup-ului în afara clubului.

### Cum verificați
1. Citiți `deploy/proxy/README.md` (tabelul subdomeniilor) și ADR-0024.
2. Pe GitHub → Actions: jobul `deploy` e verde.
