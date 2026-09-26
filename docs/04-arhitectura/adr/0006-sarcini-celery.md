# ADR-0006: Sarcini programate cu Celery și Celery Beat

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** §4.3, §8.1 (sarcini programate), §6.9

## Context
Sistemul are multe acțiuni care depind de timp: remindere, ferestre de scor, expirări, neprezentări, decay, închiderea sezonului, recompense, rapoarte, semnale de viață ale dispozitivelor.

## Decizie
1. **Celery 5** cu broker **Redis**; **Celery Beat** cu programarea stocată în baza de date (`django-celery-beat`), vizibilă din admin.
2. Toate sarcinile sunt **idempotente**: dacă rulează de două ori, efectul rămâne unul singur (chei de idempotență și blocări).
3. **Timpul nu depinde de punctualitatea sarcinilor.** Regulile de tip „fereastra de scor e deschisă între 15:30 și 16:00” se verifică la fiecare cerere, după ora curentă a serverului. Sarcina programată doar anunță (notificări) și finalizează stările expirate. Astfel, un worker întârziat nu poate permite un scor în afara ferestrei.
4. Toate calculele de timp folosesc regulile din ADR-0010 (`Europe/Bucharest`).
5. Alertă către personal dacă Beat sau worker-ii nu mai rulează (semnal de viață în monitorizare, ADR-0017).

## Alternative analizate
- **RQ / Dramatiq:** mai simple, dar fără echivalentul matur al lui Celery Beat integrat cu Django. Respins.
- **cron de sistem:** fără vizibilitate în admin și fără reîncercări. Respins.

## Consecințe
- Procese separate pentru worker și Beat în Docker Compose.
- Testele de timp folosesc un ceas controlat (de exemplu `time-machine`).
