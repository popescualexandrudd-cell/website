# Registrul activităților de prelucrare (GDPR art. 30)

> 07.10.2026, verificarea finală (§12.2). **Redactat fără revizuire juridică. Recomandăm verificarea de către un avocat/DPO.** Se completează cu datele firmei (Q26) și se aprobă de proprietar (Q41). Descrie ce face sistemul construit, așa cum e în cod; o prelucrare nouă intră aici înainte de lansarea ei.

## Operatorul
**[Denumirea firmei — DE_CONFIRMAT]**, CUI **[DE_CONFIRMAT]**, sediul **[DE_CONFIRMAT]**; contact pentru date: **[email — DE_CONFIRMAT]**. Responsabil cu protecția datelor: nu e obligatoriu pentru un club de această mărime (art. 37); persoana de contact o numește proprietarul (DE_CONFIRMAT).

## Prelucrările
| # | Prelucrarea | Persoanele | Datele | Scopul și temeiul (art. 6) | Cine le vede | Cât se păstrează |
|---|---|---|---|---|---|---|
| 1 | Lista de așteptare (pre-lansare) | vizitatori | nume, email, nivel, limba | anunțul deschiderii; consimțământ (a) | personalul cu `waitlist` | 7 zile neconfirmat (`purge_waitlist`); confirmat: până la 12 luni după deschidere sau dezabonare |
| 2 | Contul | clienți (de la 14 ani; copiii prin părinte) | nume, email, telefon, data nașterii, limba, parola (hash), 2FA pentru personal | contractul (b); vârsta pentru ligă (18+) | clientul; recepția și managerul (R-004) | cât e activ; la ștergere: pseudonimizat („Jucător retras”), `privacy.erase` |
| 3 | Rezervări, prezențe, scanări | clienți | rezervări, intrări (card scanat), neprezentări | contractul (b) | clientul; personalul pe locație | rezervările: păstrate pseudonimizate după ștergere (istoricul clubului); scanările: șterse la ștergerea contului |
| 4 | Bani: plăți, sold, abonamente, vouchere, bonuri | clienți, firme | sume, metodă, bon fiscal, legătura cu rezervarea | contractul (b); obligație legală, contabilitate (c) | clientul; managerul, contabilul (export) | registrul nu se șterge (ADR-0009); termenul legal **DE_CONFIRMAT cu contabilul** (de regulă 5–10 ani, Legea contabilității 82/1991) |
| 5 | Cardul de membru și Wallet | clienți | numărul cardului, codul QR (token aleatoriu), numele | contractul (b) | clientul; scanerele clubului | cât e activ; la ștergere: revocat, Wallet anulat |
| 6 | Liga | jucători 18+ cu acord semnat la chioșc | rezultate, rating, LP, rang, nivel, istoric | contractul (b) + acordul ligii (a) | public: doar ce permite R-012 (Q49); restul doar jucătorul | cât e activ; la retragerea acordului sau ștergere: „Jucător retras” în istoricul altora |
| 7 | Numele pe ecranele terenurilor | toți jucătorii unei rezervări | nume, prenume; „Ligă” pentru cei din ligă | interes legitim (f), cu opoziție (`NameObjection`) | cei din club, cât ține rezervarea | nu se păstrează nimic în plus |
| 8 | Notificări (email, push) | clienți, personal | adresa de email, abonarea push a browserului, textul mesajului | contractul (b); noutățile clubului: consimțământ (a, opt-in) | sistemul; clientul | textele: 90 de zile (rămâne doar faptul); abonările push: până la dezabonare sau ștergerea contului |
| 9 | Întrebarea NPS după primul meci (Q71) | clienți cu noutățile pornite | nota 0–10, data | interes legitim (f): calitatea serviciului; răspunsul e opțional | managerul vede doar media (NPS), nu cine a răspuns | cât e activ contul |
| 10 | Asistentul AI (când e pornit, ADR-0019) | vizitatori, clienți | întrebarea, trimisă furnizorului AI; în jurnal doar faptul, fără text | contractul (b) | furnizorul AI (persoană împuternicită) | jurnalul `AIInteraction`: fără text; furnizorul: după contractul lui (DE_CONFIRMAT, Q68) |
| 11 | Jurnalul de audit și jurnalele tehnice | personal, clienți | cine, ce, când, IP, motivul | interes legitim (f): securitate, dovada acordurilor; obligație legală (c) | adminul, managerul | jurnalul de audit: 3 ani (Q75, DE_CONFIRMAT); jurnalele serverului: 5 fișiere × 10 MB pe serviciu (rotite automat); rulările sarcinilor: 30 de zile |
| 12 | Erorile tehnice (GlitchTip) | vizitatori, clienți | mesajul erorii, adresa paginii, browserul; fără parole sau date de plată | interes legitim (f): funcționarea | noi, cei care întreținem | după setarea din GlitchTip (implicit 90 de zile) |
| 13 | Statistici de vizită (Umami) | vizitatori care au acceptat | pagini, țară, browser; fără cookie-uri, fără IP păstrat | consimțământ (a), după bannerul de cookie-uri | proprietarul | agregate |
| 14 | Backup-urile | toate cele de mai sus | copia criptată a bazei de date | interes legitim (f) și obligația de securitate (art. 32) | doar cine are cheia | 2 copii complete săptămânale + jurnalul continuu (circa 2–3 săptămâni); datele șterse dispar din backup după acest interval |

## Persoanele împuternicite (art. 28)
Fiecare are nevoie de un contract (DPA), semnat de club la deschiderea contului:
- găzduirea serverului (Q40) și stocarea copiei de backup în UE (Q73);
- furnizorul de email (Q24);
- furnizorul AI (Q68), doar dacă asistentul e pornit;
- Apple și Google, doar pentru cardurile adăugate în Wallet de client;
- casa de marcat fiscală (R-066) și, mai târziu, procesatorul de plăți online.

Monitorizarea (Uptime Kuma, GlitchTip, Umami) rulează pe serverul clubului: nu e un terț.

## Transferuri în afara UE
Niciunul implicit. Furnizorul AI și Apple/Google pot implica transferuri: se folosesc doar cu garanțiile din capitolul V GDPR, verificate la semnarea contractului (DE_CONFIRMAT).

## Măsuri de securitate (art. 32)
Pe scurt; detaliile în `01-securitate.md` și în `tests/security/README.md`:
- HTTPS peste tot; aparatele doar cu certificatul clubului (mTLS);
- 2FA pentru tot personalul; permisiuni pe rol și locație; jurnal de audit;
- parolele doar ca hash;
- backup criptat, testat lunar prin restaurare;
- date minime pe ecranele publice (R-012); ștergerea contului prin pseudonimizare, testată.

## Drepturile persoanei
- **Acces și portabilitate:** din cont, exportul complet (`GET /api/v1/me/export`).
- **Ștergere:** din cont sau la manager (`privacy.erase`).
- **Opoziție la nume pe ecrane:** la recepție.
- **Retragerea acordului ligii:** din cont, oricând (R-011).
- **Noutățile clubului:** se opresc din cont, la Notificări.

Termenul de răspuns: o lună (art. 12).
