# Versiunile: cum se face și cum se instalează o versiune nouă

> Etapa 16, 06.10.2026 (§14, Q42). Pentru noi și pentru un programator angajat ulterior. Serverul instalează doar **versiuni etichetate** (`deploy/scripts/update v1.2.0`), niciodată o ramură în lucru.

## Numele versiunilor
`vMAJOR.MINOR.PATCH`, de exemplu `v1.0.0` la lansare:
- **PATCH** (`v1.0.1`): o reparație, fără funcții noi și fără schimbări în baza de date, dacă se poate.
- **MINOR** (`v1.1.0`): funcții noi, eventual migrații ale bazei de date.
- **MAJOR** (`v2.0.0`): o schimbare mare, anunțată proprietarului din timp.

Etichetele etapelor (`etapa-0`, `etapa-1a` …, Q42) rămân separate: ele marchează aprobarea unei etape, nu ce rulează pe server.

## Pașii, de fiecare dată
1. **Pe ramura de lucru:** `scripts/test-all` verde (hook-ul de push îl impune), CI verde pe GitHub (joburile `test-all` și `deploy`: stiva întreagă, backup, actualizare, revenire, testul de încărcare, auditul dependențelor).
2. **În `main`:** commitul ajunge în `main` doar după CI verde pe ramură pentru același commit (regula 9 din `CLAUDE.md`), apoi CI verde și pe `main`.
3. **`CHANGELOG.md`:** o secțiune nouă cu numărul versiunii și data, cu ce s-a schimbat pe înțelesul proprietarului; dacă are migrații, se spune („revenirea readuce baza de date în timp”).
4. **Eticheta:** pe GitHub → **Releases → Draft a new release → Choose a tag** → `v1.1.0`, ținta `main`, titlul și textul din `CHANGELOG.md` → **Publish release**. Din linia de comandă, de pe un calculator cu drept de scriere:
   ```bash
   git checkout main && git pull
   git tag -a v1.1.0 -m "v1.1.0"
   git push origin v1.1.0
   ```
   O etichetă publicată nu se mută și nu se șterge; o greșeală se repară cu o versiune nouă.
5. **Pe server**, cu clubul închis sau liniștit: `sudo deploy/scripts/update v1.1.0` (`07-mentenanta.md`). Dacă nu merge: `sudo deploy/scripts/rollback`.
6. **După instalare:** Panou → Starea sistemului (sarcinile „OK”, aparatele online), GlitchTip fără erori noi în prima oră.

## Ce nu se face
- Nu se instalează pe server o ramură sau un commit fără etichetă.
- Nu se modifică fișiere direct pe server (`update` refuză un folder cu modificări locale); setările stau doar în `/etc/jungle/`.
- Nu se sare peste CI și nu se împinge cu `--no-verify`.
