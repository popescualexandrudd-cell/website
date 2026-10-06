# Etapa 14 — Deploy, securitate, backup, monitorizare, hardware real: planul pe faze

> Început pe 06.10.2026, după aprobarea Etapei 13 („aprob, continuă”). Sursele: §14 (`docs/08-deploy-si-mentenanta/01-cerinte-deploy-backup-monitorizare.md`), §12.1 (securitate), ADR-0012 (dispozitivele), ADR-0013 (Hardware Bridge), ADR-0014 (sistemul chioșcurilor), ADR-0015 (Docker + Caddy), ADR-0016 (backup), ADR-0017 (monitorizare), Q22, Q23, Q40.

## Ce se poate face acum și ce așteaptă
- **Acum, în cod:** tot ce rulează pe server: configurația de producție, proxy-ul, backup-ul, monitorizarea, scripturile de instalare și de actualizare, runbook-urile.
- **Verificarea:** în CI (GitHub Actions are Docker): imaginile se construiesc, configurațiile se validează, iar un mediu complet pornește și răspunde. În acest mediu de lucru Docker nu are serviciul pornit.
- **Așteaptă serverul (Q22) și aparatele (Q23):** instalarea propriu-zisă, testul de restaurare pe serverul real, driverele reale ale aparatelor (bancnote, monede, casa de marcat, cititoarele). Până atunci, simulatoarele din Etapa 7–8.

## Ce decide proprietarul (variantele implicite)
| Întrebare | Varianta cu care lucrăm |
|---|---|
| Q22 Serverul | Ubuntu Server 24.04 LTS, minimum 8 nuclee, 32 GB RAM, 2 × 1 TB NVMe în oglindă, UPS, IP fix, internet de rezervă 4G/5G |
| Q72 RPO / RTO (nouă) | pierdere maximă de date 1 oră (RPO), refacere în cel mult 4 ore (RTO), ca în ADR-0016 |
| Q73 Stocarea off-site (nouă) | un spațiu S3 în UE, plătit lunar, cu datele criptate înainte de a pleca |
| Domeniul (Q39) | `<domeniu>` până la cumpărare; subdomeniile din §4.6 |

## Fazele
1. **14A — Producția în Docker Compose și proxy-ul Caddy:**
   - `deploy/compose/prod` și `staging`: baza de date, Redis, backend-ul (gunicorn), procesul de timp real (daphne, `/ws/`), sarcinile programate (un container cu `cron`), site-ul, aplicațiile statice (panoul, chioșcurile, ecranele, afișajul cafenelei) și Caddy;
   - Caddy: TLS automat, subdomeniile din §4.6, headerele de securitate și CSP, certificatul de client (mTLS) pe subdomeniul dispozitivelor, iar pe celelalte headerul certificatului e șters, ca să nu poată fi falsificat;
   - `.env.example` de producție, fără secrete;
   - CI: imaginile se construiesc și configurațiile se validează la fiecare push.
2. **14B — Backup și restaurare:**
   - pgBackRest: backup complet zilnic și jurnalul continuu (WAL), criptat, cu copie off-site;
   - fișierele, cu restic;
   - testul automat lunar de restaurare, cu raport; un eșec trimite `staff.backup_failed`;
   - runbook-ul de recuperare după dezastru.
3. **14C — Monitorizare și alerte:**
   - GlitchTip pentru erori, în backend și în site;
   - Uptime Kuma pentru disponibilitate, cu semnalele de viață ale sarcinilor programate și ale backup-ului;
   - aparatele care nu mai dau semn de viață trimit `staff.device_offline` (până acum evenimentul exista, dar nu pleca de nicăieri);
   - jurnalele în JSON, cu ID de corelare;
   - alertele pentru spațiul pe disc.
4. **14D — Serverul și aparatele:**
   - scriptul de instalare a serverului (firewall, SSH doar cu cheie, actualizările de securitate automate, Docker);
   - autoritatea internă de certificate pentru aparate și înrolarea unui aparat nou, pas cu pas (ADR-0012);
   - actualizarea și revenirea la versiunea anterioară, cu un singur script.
5. **14E — Runbook-urile pentru proprietar (§14):**
   - cum se face o actualizare și cum se revine;
   - ce faceți dacă un chioșc nu mai merge;
   - cum se schimbă prețurile și cum se deschide un sezon nou;
   - verificările lunare.

   Toate sunt scrise pentru un non-programator, cu comenzi de copiat.

Fiecare fază se încheie cu teste (unde e cod), raport, documentație și push, doar cu `test-all` verde.
