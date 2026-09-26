# 10. INTELIGENȚA ARTIFICIALĂ (integrată în tot sistemul)

> **Sursa:** `MEGA_PROMPT.md` §10 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

## 10.1 Arhitectură
- Un modul `ai` în backend, cu **adaptor de furnizor** (implicit API-ul Claude de la Anthropic; modelul se setează prin variabilă de mediu, nu se hardcodează), limită de cost lunară, jurnal pentru fiecare interacțiune (fără date sensibile inutile) și un comutator de oprire globală.
- AI-ul acționează doar prin **unelte (tools) cu permisiuni explicite**, apelând același API intern ca oamenii, cu aceleași validări.
- **Interdicții absolute**: nu introduce, nu modifică și nu validează scoruri; nu modifică rating, LP, ranguri, clasamente; nu mișcă bani, nu acordă reduceri sau vouchere; nu accesează și nu modifică acorduri GDPR; nu dezvăluie date personale ale altor utilizatori.
- Minimizarea datelor trimise furnizorului AI (pseudonimizare unde se poate). Totul documentat în registrul de prelucrări GDPR.

## 10.2 Funcții AI
1. **Asistentul clubului** (website, PWA, opțional chioșcuri): multilingv; răspunde la întrebări (program, prețuri, reguli, ligă); verifică disponibilitatea; **face rezervări** pentru utilizatorul autentificat (plata rămâne conform R-063); recomandă pachete; continuă contextul din simulatoare.
2. **Matchmaking**: propune parteneri și adversari de nivel apropiat (după MMR, disponibilitate, istoric, preferințe), inclusiv pentru meciuri oficiale și provocări, cu explicație în limbaj natural. Scorul de potrivire e calculat determinist; AI-ul doar formulează.
3. **Reactivare**: jucător care n-a mai jucat de X zile → propune parteneri de același nivel și intervale libere; client cu abonament care lipsește de la antrenamente → mesaj personalizat (R-092).
4. **Meciul zilei**: alegere pe baza scorului de miză (6.15), text de prezentare, rezumat după meci.
5. **„Jungle Report” săptămânal** personal: meciuri, evoluție, cel mai bun partener, obiectiv pentru săptămâna viitoare.
6. **Mesaje pentru grupul comunității** (R-131): rezultate, promovări, Regii Junglei, evenimente, Meciul zilei, gata de copiat.
7. **Copilot pentru admin**: întrebări în limbaj natural pe date (de exemplu „cât am încasat din pilates în martie?”), exclusiv pe vederi read-only agregate, cu interogările afișate pentru transparență.
8. **Detecție de anomalii** (scoruri suspecte, abuz, fraudă la numerar): semnalează, nu decide.
9. **Asistent de conținut și SEO**: ciorne de articole, descrieri, traduceri (marcate „de revizuit”).
10. **Sugestii de prețuri dinamice și previziuni** (ocupare, risc de abandon): doar propuneri, aprobate manual.
