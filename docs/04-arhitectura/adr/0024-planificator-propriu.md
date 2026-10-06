# ADR-0024: Sarcinile programate cu un planificator propriu, fără Celery

- **Stare:** Acceptat (06.10.2026, Etapa 14A; proprietarul a cerut continuarea: „aprob, continuă”)
- **Data:** 2026-10-06
- **Legat de:** §4.3, §8.1, §14, ADR-0006 (îl înlocuiește la punctele 1 și 5), ADR-0010, ADR-0017
- **Înlocuiește:** ADR-0006, punctele 1 (Celery + Celery Beat) și 5 (semnalele de viață ale worker-ilor)

## Context
ADR-0006 alesese Celery și Celery Beat. În Etapele 3–13, fiecare sarcină programată a fost scrisă ca o comandă Django scurtă și idempotentă, care își verifică singură timpul:
- `send_notifications`, la minut;
- `process_no_shows` și `expire_league_matches`, la 5 minute;
- `league_daily`, `notifications_daily` și `purge_waitlist`, zilnic.

Nicio sarcină nu rulează în fundal la cererea unui utilizator, deci nu e nevoie de o coadă. Celery ar adăuga două procese, un broker și o bibliotecă mare pe care proprietarul, fără programator, ar trebui să le întrețină.

## Decizie
1. **Un singur proces** (`manage.py run_scheduler`, serviciul `scheduler` din producție) rulează, la începutul fiecărui minut, comenzile din `jungle/scheduler/schedule.py` (`JOBS`):
   - o sarcină „la N minute” rulează când ultima pornire are N minute;
   - o sarcină zilnică rulează o dată pe zi a clubului (`Europe/Bucharest`), la ora ei sau imediat după, dacă serverul a fost oprit;
   - nicio oră zilnică nu cade între 03:00 și 04:00 (ora care lipsește în martie și se repetă în octombrie, ADR-0010).
2. **Un singur planificator lucrează odată:** un lacăt PostgreSQL (`pg_try_advisory_lock`) îl ține deoparte pe al doilea.
3. **Fiecare rulare se notează** (`JobRun`: pornire, sfârșit, reușită, ce a scris), 30 de zile. Eșecul unei sarcini nu le oprește pe celelalte.
4. **Semnal de viață:** după o tură în care toate sarcinile au reușit, planificatorul cheamă adresa „push” din Uptime Kuma (`SCHEDULER_HEARTBEAT_URL`, ADR-0017). Lipsa semnalului înseamnă o alertă.
5. ADR-0006, punctele 2–4, rămân: sarcinile sunt idempotente, timpul se verifică la fiecare cerere, iar calculele urmează ADR-0010.

## Alternative analizate
- **Celery + Beat (ADR-0006):** respins acum. Aduce două procese și un broker în plus, fără nicio sarcină care să aibă nevoie de coadă.
- **cron de sistem:** respins. Programarea ar sta în afara codului, fără jurnal și fără teste.
- **supercronic în container:** respins. E un binar în plus, iar jurnalul rulărilor ar lipsi tot.

## Consecințe
- O sarcină nouă = o comandă Django + un rând în `JOBS` (testul verifică: comanda există, un singur fel de program, nicio oră între 03 și 04).
- Dacă va apărea o sarcină lungă, cerută de un utilizator, se reia discuția despre o coadă, cu un ADR nou.
