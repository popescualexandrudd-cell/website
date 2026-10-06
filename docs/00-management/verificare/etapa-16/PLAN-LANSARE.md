# Etapa 16 — Inaugurarea și pornirea: planul zilei de lansare

> 06.10.2026 (PLAN_DETALIAT, Etapa 16: „lansare, Sezonul 0/1 al ligii (Q27), monitorizare intensivă”). Se folosește după lista de lansare (`docs/00-management/verificare/etapa-15/02-lista-de-lansare.md`) bifată complet. Data inaugurării: DE_CONFIRMAT (Q74), martie 2027. Comenzile se rulează pe server, din `/opt/jungle`.

## Cu o săptămână înainte (Z−7)
1. **Versiunea finală:**
   - din `main`, cu CI verde, se pune eticheta `v1.0.0` (procedura: `docs/08-deploy-si-mentenanta/08-versiuni.md`);
   - pe server: `sudo deploy/scripts/update v1.0.0`.
2. **Datele de test din beta:**
   - baza de date se golește complet: `sudo deploy/scripts/reset-before-launch` (cere numele domeniului ca confirmare; registrul banilor nu se poate curăța pe bucăți, ADR-0009). Setările din `/etc/jungle`, autoritatea aparatelor și certificatele lor rămân;
   - apoi, cum spune scriptul la final: primul administrator (`deploy/scripts/manage bootstrap_admin …`), conturile personalului cu 2FA, aparatele înregistrate și înrolate din nou, primul backup (`sudo deploy/scripts/backup full`);
   - prețurile, programul și textele se pun din nou din panou (sunt în baza de date); banii de test din casă se returnează.
3. **Liga:** în panou → Liga → Sezoane → Sezon nou:
   - „Sezonul 0”, cu bifa „Sezon de calibrare (fără premii)” (Q27, confirmat);
   - durata: o lună de la inaugurare.

   Nu se pornește încă.
4. **Ultima repetiție:** un tur complet al fiecărui rol, pe sistemul real.

## Cu o zi înainte (Z−1)
- [ ] Backup complet manual: `sudo deploy/scripts/backup full`. Imediat după: `sudo deploy/scripts/backup restore-test`.
- [ ] Panou → Starea sistemului: toate aparatele „online”, sarcinile programate „OK”.
- [ ] Restul în Chioșcul de Plăți, numărat (modul personal).
- [ ] Prețurile finale verificate în panou, pe fiecare bandă orară.

## Ziua lansării (Z)
| Ora | Ce | Cine |
|---|---|---|
| 07:30 | Site-ul intră în motoarele de căutare: în `/etc/jungle/prod.env`, `SITE_INDEXABLE=true`, apoi `sudo deploy/scripts/update` (aceeași versiune, refăcută). | noi |
| 08:00 | Panou → Setări și feature flags → **`full_site` pornit**, cu motivul „Lansarea”. Site-ul complet apare imediat (Q57). | proprietarul sau managerul |
| 08:05 | Verificarea site-ului de pe un telefon: pagina principală, rezervări, liga, contul. | noi |
| 08:15 | Mesajul către lista de așteptare (cei care au acceptat): „Am deschis” (`docs/11-marketing/02-plan-pre-lansare.md`). | managerul |
| 09:00 | Primele rezervări la club; recepția după ghid. | recepția |
| 12:00 | Prima privire în GlitchTip și Uptime Kuma; orice eroare nouă, reparată în aceeași zi. | noi |
| seara | Inaugurarea, cu DJ. Liga: **Pornesc sezonul** pentru Sezonul 0. | proprietarul |
| 23:30 | Închiderea zilei la chioșc (raportul Z). Nicio diferență la casă. | recepția |

## Primele 14 zile (monitorizare intensivă)
- **Zilnic, noi:**
  - GlitchTip, Uptime Kuma;
  - starea sistemului (sarcini, aparate);
  - semnalele (disputele, diferențele de casă).

  O problemă care atinge banii, liga sau accesul se repară în aceeași zi, cu o versiune nouă (`update`), testată ca de obicei.
- **Zilnic, managerul:** tabloul de bord, disputele ligii, casa.
- **Săptămânal, împreună:** 30 de minute. Ce a mers, ce nu, ce schimbăm, plus NPS-ul primelor păreri (Q71).

## După lansare
- **Ziua 30:** Sezonul 0 se încheie (fără premii); se pornește Sezonul 1, cu premii (Q6).
- **Ziua 30:** raportul primei luni: ocuparea pe benzi, NPS, încasările; deciziile de preț pe baza „Semnale și cerere”.
- **Lunar:** verificările din `docs/08-deploy-si-mentenanta/07-mentenanta.md`.
