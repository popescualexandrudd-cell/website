# 5.3 Carduri (legitimații)

> **Sursa:** `MEGA_PROMPT.md` §5.3 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **R-020** Fiecare jucător primește o **legitimație cu cod QR**, emisă din website/sistem, trimisă pe **email**, de unde o poate adăuga în **Apple Wallet** și în **Google Wallet** (ambele confirmate).
- **R-021** **Cardurile fizice le produc proprietarii** („le facem noi de mână”). Sistemul generează fișierul de tipar (PDF la dimensiunea standard de card CR80, 85,60 × 53,98 mm, cu QR, nume și prenume) și o coadă de „carduri de emis” în admin.
- **R-022** Codul QR conține un **token aleatoriu** (nu date personale), revocabil. Card pierdut → blocare instant din cont sau admin → reemitere. Toate cardurile vechi ale unui utilizator devin invalide la reemitere.
- **R-023** Cardul din Wallet se **actualizează automat** (rang, LP) după fiecare meci validat.
- **R-024** **Card fizic nou la promovarea în Diamant**, la care jucătorul „alege de junglă” (o temă sau emblemă din junglă dintr-o listă predefinită). **NU se face card de design personalizat** (proprietarul a refuzat explicit cardul „de design”). Detalii: Q1.
- **R-025** Cardul se folosește peste tot: check-in, intrarea pe teren, prezențe la antrenamente și pilates, ligă, plăți, cafenea.

## Modificări

- **26.09.2026** (confirmat de proprietar, Q24): înscrierea în Apple Developer nu se începe acum. **Apple Wallet se amână**: adaptorul se construiește, dar rămâne dezactivat până la crearea contului. R-020 rămâne valabilă pentru Google Wallet, email și PDF.
- **27.09.2026** (confirmat de proprietar): **Apple Wallet se face în Etapa 5**, alături de Google Wallet (R-020 integral). Activarea cere contul Apple Developer al firmei și certificatul pentru carduri (Q24).
