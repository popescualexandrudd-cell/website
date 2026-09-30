# Videoul de prezentare (originalul)

Aici se pune **originalul** videoului din hero-ul site-ului (ADR-0023, Faza 2). Nu se servește pe site: din el, comanda de mai jos face fișierele mici pe care le vede vizitatorul.

## Ce video
- Orizontal 16:9, minimum 1920×1080 (ideal 4K), 15–30 de secunde, care se poate relua în buclă (începutul și sfârșitul se potrivesc).
- Fără text „ars” în imagine și fără sunet obligatoriu (site-ul îl redă fără sunet, Q59).
- Opțional, o variantă verticală 9:16 pentru telefon (Q60).
- Doar filmări reale (clubul de tenis, șantierul); orice randare sau imagine generată e „ilustrativă” (Q44): se rulează comanda cu `--illustrative`.

## Cum îl urcați (prin GitHub, fișiere de cel mult 25 MB)
1. Deschideți pe GitHub branch-ul de lucru, apoi folderul `apps/web/media-src/hero`.
2. **Add file** → **Upload files**, trageți videoul, apoi **Commit changes**.
3. Dacă fișierul e mai mare de 25 MB: exportați-l la 1080p (sau mai scurt) și urcați-l din nou.

## Ce face programatorul apoi
```
pnpm --filter @jungle/web video:hero            # sau: --illustrative, --max-seconds 20, --poster-at 3
```
Comanda verifică durata, rezoluția și sunetul, scrie în `apps/web/public/media/hero/` variantele pentru calculator (≤ 8 MB) și telefon (≤ 3 MB), în MP4 și WebM, fără sunet, plus o imagine de rezervă, și le recomprimă singură dacă depășesc bugetul. Apoi: commit, push, iar în panou comutatorul `web_hero_video` pornit. Are nevoie de `ffmpeg` (`apt-get install ffmpeg`).
