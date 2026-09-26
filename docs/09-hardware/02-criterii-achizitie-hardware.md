# Criterii de achiziție hardware (propunere)

> Creat în Etapa 0 (26.09.2026), ca ajutor pentru răspunsul la **Q23**. Nu numește modele: verifică orice ofertă față de criteriile de mai jos și trimite-mi modelele propuse **înainte de cumpărare**. Tot ce ține de casa de marcat fiscală se confirmă și cu contabilul clubului (§12.3).

## De ce contează acum
Aparatele se integrează în Etapele 7–9 (cu simulatoare) și la club în Etapa 14 (februarie 2027). Un aparat fără protocol documentat poate face imposibilă integrarea, iar termenele de livrare pot fi de câteva săptămâni. Recomand alegerea modelelor **până la finalul lui noiembrie 2026**.

## 1. Aparatul de numerar cu rest (Chioșcul de Plăți)
Obligatoriu:
- **Reciclator**, nu doar acceptor: trebuie să poată **da rest** din bancnotele și monedele primite (§8.3).
- **Protocol de comunicare documentat** și disponibil (de exemplu SSP, ccTalk sau MDB) sau un SDK utilizabil din **Linux**; documentația tehnică trebuie primită înainte de cumpărare (§8.4: „nu presupune, verifică modelul cumpărat”).
- Raportarea nivelului de rest disponibil, pe cupiuri (pentru avertizarea „nu avem rest” înainte ca clientul să introducă banii).
- Semnalizarea erorilor: blocaj de bancnotă, casetă plină, ușă deschisă, bancnotă respinsă.
- Recunoaște bancnotele RON în circulație; actualizări de firmware pentru cupiuri noi.
- Casetă cu cheie și acces separat pentru golire și alimentare (mod personal, §8.3).
Recomandat:
- Acceptarea monedelor, cu reciclare de monede pentru restul mic.
- Service și piese de schimb disponibile în România.

## 2. Casa de marcat fiscală (AMEF)
Obligatoriu (de confirmat cu contabilul și cu furnizorul):
- Model **avizat pentru utilizare în România**, conectat la sistemul ANAF, potrivit pentru **încasări într-un chioșc fără casier** (regim nesupravegheat).
- **Interfață de comandă din calculator** (protocol sau SDK documentat, utilizabil din Linux) pentru: emiterea bonului, anularea, raportul X, raportul Z (§8.3).
- Posibilitatea de a tipări pe bon numărul comenzii de cafenea și textele clubului.
Recomandat:
- Semnalizarea „hârtie pe terminate” și a erorilor de imprimare.

## 3. Imprimanta de bonuri nefiscale (opțională)
- Compatibilă **ESC/POS** (standard de facto), conectare USB sau rețea.
- Necesară doar dacă se tipăresc tichete separate de bonul fiscal (de exemplu la barul cafenelei, Q33).

## 4. Scannerele de coduri QR
- Citesc coduri QR de pe **ecranul telefonului** (inclusiv cu luminozitate redusă) și de pe **cardul fizic tipărit**.
- Conectare USB, în mod „tastatură” (HID) sau port serial virtual; fără drivere proprietare obligatorii.
- Unul pentru fiecare chioșc; lângă fiecare teren doar dacă se alege scanarea la teren (Q23, R-031).

## 5. Calculatoarele chioșcurilor și ale ecranelor
- Mini-PC care rulează **Linux** (Ubuntu LTS), cu suficiente porturi USB (sau serial) pentru aparatele de mai sus.
- Minimum orientativ pentru chioșcuri: procesor x86 modern cu 4 nuclee, 8 GB RAM, SSD 128 GB, rețea prin cablu.
- Pornire automată după revenirea curentului (setare BIOS „power on after power loss”).
- Pentru ecranele de teren: se poate folosi un dispozitiv mai mic, dacă rulează un browser modern stabil.

## 6. Ecranele
- **Chioșcuri:** ecran tactil, capacitiv, citibil în lumina halei, montat la înălțime accesibilă (WCAG).
- **Terenuri și lobby:** ecrane profesionale pentru funcționare îndelungată (nu televizoare obișnuite), luminozitate potrivită pentru hală, montare sigură în afara zonei de joc.

## 7. Rețea și energie
- Rețea prin cablu pentru chioșcuri și ecrane; rețea separată (VLAN) pentru dispozitive, față de Wi-Fi-ul clienților.
- **UPS** pentru chioșcuri (inclusiv aparatul de numerar), rețea și server.
- Internet de rezervă (de exemplu 4G/5G) cu comutare automată (§14).

## Ce îmi trimiți pentru fiecare aparat
Producătorul și modelul exact, fișa tehnică, documentația protocolului sau a SDK-ului, sistemele de operare suportate, termenul de livrare și cine asigură service-ul în România.
