# Etapa 12 — AI și notificări: raport

Planul pe faze: [PLAN.md](PLAN.md).

## Faza 12A — Nucleul notificărilor (01.10.2026)

### Ce s-a construit
1. **O singură listă de mesaje (outbox).** Orice modul al clubului cere o notificare printr-un singur apel (`notifications.services.notify`). Mesajul se scrie întâi într-o listă și pleacă imediat după ce schimbarea s-a salvat. Același eveniment pentru același lucru (de exemplu memento-ul unei rezervări) nu pleacă niciodată de două ori.
2. **Canalele (Q17, Q18, DE_CONFIRMAT):** email și **notificări pe telefon** (push, din site-ul instalat ca aplicație). SMS-ul e pregătit, dar oprit. Fără WhatsApp.
3. **Notificările push** sunt criptate cap-coadă (standardele RFC 8291 și 8292): serviciul de push al telefonului (Google, Apple, Mozilla) doar le transportă și nu le poate citi. Cheile clubului se fac o dată, cu `manage.py vapid_keys`, și stau doar în `.env` pe server. Fără ele, push-ul rămâne oprit și mesajele vin pe email.
4. **Lista de evenimente din §11** (33), fiecare cu categoria, canalele și dacă se poate opri. Mesajele despre cont, rezervări, taxe și deciziile clubului (de exemplu o blocare) vin mereu. Memento-urile, liga, abonamentele, voucherele și noutățile se pot opri din cont.
5. **Textele, în română și engleză**, cu valori implicite scrise de noi și **editabile din panou**. Un text greșit (de exemplu `{{` neînchis) e refuzat înainte de salvare.
6. **Mesajele programate** (memento-urile) și **reîncercările** pleacă prin `manage.py send_notifications`, care rulează în fiecare minut (programarea pe server, în Etapa 14). Un mesaj netrimis se reîncearcă de cel mult 5 ori.
7. **Minimizarea datelor:** textul unui mesaj se șterge după 90 de zile; rămâne doar faptul că s-a trimis (cui, ce, când).

### În cont și în panou
1. **Contul → Notificări** (`/cont/notificari`):
   - „Primește notificări aici”, care pornește notificările pe acel telefon sau calculator, cu permisiunea browserului;
   - un tabel cu ce se poate opri, pe email și pe telefon;
   - explicația a ce vine mereu.
2. **Panoul → Notificări** (înlocuiește marcajul „vine în Etapa 12”; acțiunea nouă `notifications.manage`, pentru admin și manager):
   - textele fiecărui mesaj, pe canal și limbă, cu modificare și „Revino la textul implicit”;
   - ultimele mesaje trimise, cu starea lor: cui, ce, când, fără textul primit de client.
3. **Service worker-ul** (versiunea 3) arată notificarea și, la atingere, deschide pagina clubului la care se referă, niciodată alt site.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend (`jungle/notifications`, 100% pe ramuri, impus de `test-all`) | 21. Criptarea push e verificată decriptând-o ca un browser real, iar semnătura VAPID e verificată cu cheia publică. Mai sunt acoperite: emailul trimis o singură dată, push-ul pe fiecare dispozitiv (cel dezabonat se șterge), preferințele (ce se poate și ce nu se poate opri), memento-urile la ora lor, reîncercările până la 5 și apoi „netrimis”, ștergerea textelor după 90 de zile, alertele pentru managerii locației, abonarea la push, textele din panou (salvare, refuz, revenire, jurnal) și drepturile de acces. |
| Teste în panou | 3: modulul doar cu `notifications.manage`, editarea și revenirea la textul implicit, lista mesajelor, refuzul unui text greșit. |
| Teste pe site | Cheia clubului ca octeți (unitar). Cap-coadă, în fluxul contului: pagina Notificări, oprirea memento-urilor pe email, alegerea păstrată la reîncărcare, accesibilitatea. |

### Ce urmează (12B)
Legarea fiecărui eveniment din §11 de modulul lui. De exemplu: confirmarea și memento-urile rezervărilor, lista de așteptare, validarea nivelului, cardul, liga (scoruri, ranguri, Diamant, provocări, decay, meciurile necesare, finalul sezonului, Meciul zilei), absențele, taxele, blocările, abonamentele, voucherele, evenimentele noi și alertele pentru personal.
