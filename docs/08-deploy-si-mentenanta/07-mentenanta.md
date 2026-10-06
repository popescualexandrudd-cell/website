# Mentenanța de zi cu zi: ghidul proprietarului

> Etapa 14E, 06.10.2026 (§14). Ce faceți, cum faceți și când ne chemați. Comenzile se rulează pe server, din `/opt/jungle`.

## O versiune nouă
Când vă anunțăm o versiune nouă (de exemplu `v1.1.0`):
```bash
cd /opt/jungle
sudo deploy/scripts/update v1.1.0
```
Scriptul face, în ordine:
1. un backup complet;
2. ia codul versiunii;
3. construiește aplicațiile;
4. aduce baza de date la zi;
5. repornește tot și verifică dacă sistemul răspunde.

Durează 5–15 minute. Faceți actualizarea când clubul e închis sau liniștit.

## Înapoi la versiunea de dinainte
Dacă ceva nu merge după o actualizare:
```bash
sudo deploy/scripts/rollback
```
- **Dacă actualizarea nu a schimbat baza de date:** revine doar codul, fără pierderi.
- **Dacă a schimbat-o:** scriptul vă spune și cere să scrieți `DA`. Baza de date revine la momentul dinaintea actualizării, iar ce s-a salvat după se pierde (de obicei câteva minute). De aceea actualizările se fac cu clubul închis.

## Un chioșc, un ecran sau afișajul cafenelei nu merge
Primiți mesajul „Aparat offline” după 10 minute.
1. **Ecranul arată „Serviciu temporar indisponibil”:** aparatul nu ajunge la server.
   - verificați cablul de rețea și internetul clubului;
   - aparatul reîncearcă singur.
2. **Ecranul e negru sau înghețat:** watchdog-ul repornește aplicația în cel mult un minut și aparatul după 5 încercări. Dacă nu, opriți-l din buton și porniți-l din nou.
3. **Banii la Chioșcul de Plăți:** nu se pierd. Fiecare leu e scris pe disc de aparat, iar la repornire se trimite serverului (ADR-0013).
4. **Dacă nu revine în 30 de minute:** chemați-ne. Între timp, recepția lucrează din panou.

## Prețurile
Panou → **Prețuri**: alegeți tipul resursei, produsul și banda orară, apoi schimbați prețul și scrieți motivul. Prețul nou se aplică rezervărilor făcute de atunci înainte. Cele existente își păstrează prețul.

## Un sezon nou de ligă
Panou → **Liga → Sezoane → Sezon nou**: numărul, numele, datele; pentru primul, bifați „Sezon de calibrare (fără premii)” (Q27). Apoi **Pornesc sezonul**. La final, **Închei sezonul**: sistemul calculează singur recompensele și anunță jucătorii.

## Verificările lunare (15 minute)
- [ ] Panou → **Starea sistemului → Sarcini programate**: testul de restaurare din 1 ale lunii e „reușit”, backup-ul din ultima noapte la fel.
- [ ] Uptime Kuma (`https://status.<domeniu>`): toate verificările sunt verzi.
- [ ] GlitchTip (`https://erori.<domeniu>`): nicio eroare nouă care se repetă.
- [ ] Discul serverului: sub 85% (altfel primiți deja mesaj).
- [ ] Panou → Dispozitive: toate aparatele au „ultimul semnal” recent.
- [ ] Copiile offline ale fișierelor din `/etc/jungle` sunt la zi.

## Când ne chemați imediat
- un backup eșuat de două ori la rând;
- un mesaj „Disc ocupat” peste 95%;
- o diferență la numărarea casei care nu se explică;
- orice mesaj despre o dispută de ligă pe care nu o puteți rezolva din panou.
