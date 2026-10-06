# Lista de lansare (Etapa 15)

> 06.10.2026. Ce trebuie să fie gata înainte de inaugurare. Fiecare rând are cine îl face și unde se verifică. Lista se parcurge cu proprietarul, punct cu punct, în ultima săptămână din beta.

## Decizii ale proprietarului
- [ ] **Prețurile finale** (Q21): padel, pilates, lecții, sala de evenimente, cafeneaua. Panou → Prețuri; marcajul DE_STABILIT dispare.
- [ ] **Textele legale aprobate** (Q41): termeni, confidențialitate, cookie-uri, anulare, acordul ligii, regulamentul. Fiscalul, confirmat cu contabilul.
- [ ] **Datele firmei** în subsolul site-ului: Panou → Setări → datele firmei.
- [ ] **Domeniul** (Q39) și **marca** (verificarea la OSIM și EUIPO).
- [ ] Ce **oferte de lansare** se folosesc (`docs/13-vanzari/05-oferte-de-lansare.md`).

## Tehnic (noi, cu proprietarul)
- [ ] Serverul instalat după `06-instalarea-serverului.md`; `deploy/scripts/update v1.0.0` reușit.
- [ ] Certificatele HTTPS pentru toate adresele (le obține Caddy singur).
- [ ] **Emailul:** furnizorul ales (Q24), plus SPF, DKIM și DMARC pe domeniu (altfel mesajele ajung în spam); un email de test primit pe Gmail și Yahoo.
- [ ] **Backup:**
  - backup-ul de noapte reușit 3 nopți la rând;
  - testul de restaurare reușit;
  - copia din afara clubului (Q73) pornită;
  - cheile păstrate offline.
- [ ] **Monitorizarea:** Uptime Kuma cu verificările și semnalele de viață; GlitchTip cu DSN-ul în setări; Umami pornit.
- [ ] **Aparatele** înrolate, cu certificatul fiecăruia:
  - Chioșcul Ligii și Chioșcul de Plăți;
  - ecranele de teren și cel din lobby;
  - afișajul cafenelei.
- [ ] **Casa de marcat fiscală** (R-066) aleasă, conectată, testată cu un bon real; driverul real în Hardware Bridge (Q23).
- [ ] **Apple și Google Wallet** (Q24): certificatele puse, `manage.py wallet_check` reușit.
- [ ] **Testul de încărcare** pe serverul real: `k6 run tests/load/club.js` cu `DOMAIN` și `RESOLVE` ale serverului, toate pragurile verzi.
- [ ] Versiunea `v1.0.0` etichetată în GitHub, din `main`, cu CI verde.

## În club
- [ ] Personalul instruit; fiecare cu cont, rol și 2FA; PIN-ul pentru casă.
- [ ] Restul pentru Chioșcul de Plăți (monede și bancnote mici).
- [ ] Cardurile tipărite pentru primii membri.
- [ ] Regulamentul afișat la recepție.

## Ziua lansării
Pașii, pe ore: `docs/00-management/verificare/etapa-16/PLAN-LANSARE.md`.
