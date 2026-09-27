# Ghid: activarea Apple Wallet și Google Wallet

> Scris pe 27.09.2026 (Etapa 5). Codul pentru Wallet este gata și testat. Mai lipsesc doar conturile clubului la Apple și la Google (Q24). Fără ele, clienții își folosesc cardul din cont (codul QR) sau cardul fizic.
>
> **Regula de aur:** parolele, cheile și certificatele **nu se trimit pe chat și nu intră în git**. Se pun direct pe server, ca fișiere, iar căile lor se scriu în `.env`.

## Apple Wallet

Costă **99 USD pe an** (Apple Developer Program). Înscrierea firmei durează de la câteva zile la 2–3 săptămâni, din cauza numărului D-U-N-S.

1. **Numărul D-U-N-S al firmei** (gratuit).
   - Apple îl cere ca să verifice că firma există.
   - Se verifică sau se cere din pagina Apple dedicată D-U-N-S (developer.apple.com → Enroll → „D-U-N-S Number lookup”).
   - Datele trebuie să fie exact ca la Registrul Comerțului.
2. **Înscrierea în Apple Developer Program ca „Organization”** (developer.apple.com/programs/enroll), cu:
   - numele legal al firmei;
   - D-U-N-S;
   - un site pe domeniul clubului (Q39);
   - un email pe domeniul clubului.

   Persoana care se înscrie trebuie să aibă dreptul să semneze pentru firmă.
3. **Team ID.** După aprobare, în „Membership details” găsiți „Team ID” (10 caractere). Îl scrieți în `.env` la `APPLE_TEAM_ID`.
4. **Pass Type ID.**
   - În „Certificates, Identifiers & Profiles”: Identifiers → „+” → **Pass Type IDs**.
   - Identificatorul recomandat: `pass.ro.junglepadel.member`, sau după domeniul ales.
   - Îl scrieți în `.env` la `APPLE_PASS_TYPE_ID`.
5. **Certificatul cardului.**
   1. Pe server, eu (sau cine administrează serverul) generez cererea de certificat:
      ```
      openssl req -new -newkey rsa:2048 -nodes -keyout apple-pass-key.pem -out apple-pass.csr -subj "/CN=Jungle Padel Pass/O=<denumirea firmei>/C=RO"
      ```
   2. În contul Apple, la Pass Type ID: „Create Certificate” → încărcați `apple-pass.csr` → descărcați `pass.cer`.
   3. Pe server, conversia în formatul folosit de noi:
      ```
      openssl x509 -inform der -in pass.cer -out apple-pass-cert.pem
      ```
6. **Certificatul intermediar Apple (WWDR G4).**
   - Se descarcă de pe pagina „Apple PKI” (apple.com/certificateauthority): „Worldwide Developer Relations — G4”.
   - Se convertește la fel: `openssl x509 -inform der -in AppleWWDRCAG4.cer -out apple-wwdr-g4.pem`.
7. **Pe server:**
   - puneți cele trei fișiere în locul din `.env` (implicit `/run/secrets/`);
   - completați în `.env`:
     - `APPLE_WALLET_ENABLED=true`;
     - `APPLE_WALLET_WEB_SERVICE_URL=https://api.<domeniu>/api/v1/wallet/apple`;
   - reporniți backend-ul;
   - verificați configurarea:
     ```
     uv run python apps/backend/manage.py wallet_check
     ```
     Rezultatul trebuie să fie „Apple Wallet: pass de test semnat”.

Actualizările automate ale cardului (R-023) cer ca serverul să fie public, pe HTTPS, la adresa de mai sus. Asta se întâmplă la deploy (Etapa 14).

## Google Wallet

Este gratuit.

1. **Profilul clubului.**
   - În **Google Pay & Wallet Console** (pay.google.com/business/console) creați profilul de afacere al clubului.
   - La „Google Wallet API” primiți **Issuer ID** (un număr lung). Îl scrieți în `.env` la `GOOGLE_WALLET_ISSUER_ID`.
2. **Proiectul Google Cloud.**
   - În Google Cloud Console (console.cloud.google.com), creați un proiect „Jungle Padel Wallet”.
   - Activați **Google Wallet API**.
3. **Contul de serviciu.**
   - IAM → Service accounts → „Create service account” (de exemplu `wallet@…`).
   - Apoi „Keys” → „Add key” → JSON → se descarcă un fișier.
   - **Fișierul acesta e secret:** îl copiați direct pe server, nu îl trimiteți pe email sau pe chat.
4. **Legătura dintre cele două.**
   - În Wallet Console → „Users”, invitați emailul contului de serviciu, cu rolul „Developer”.
5. **Aprobarea pentru public.**
   - În Wallet Console cereți „Publishing access”.
   - Până la aprobare (de obicei câteva zile), cardul se poate salva doar de conturile de test adăugate în consolă.
6. **Pe server:**
   - puneți fișierul JSON în locul din `.env`;
   - setați `GOOGLE_WALLET_ENABLED=true`;
   - reporniți backend-ul și rulați `wallet_check`. Rezultatul trebuie să fie „Google Wallet: link de test semnat”.

## Ce vede clientul după activare
În contul lui, lângă codul QR, apar butoanele „Adaugă în Apple Wallet” (pe iPhone) și „Adaugă în Google Wallet” (pe Android).

Cardul din telefon se actualizează singur când se schimbă ceva pe card:
- cardul e reemis, de exemplu după o pierdere (cel vechi devine invalid);
- își schimbă numele;
- din Etapa 6, rangul și punctele după fiecare meci validat.
