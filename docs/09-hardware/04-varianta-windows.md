# Varianta Windows pentru chioșcuri (ADR-0014, punctul 5)

> Redactat în Etapa 7 (28.09.2026). Pentru cazul în care aparatul de plată (sau alt chioșc) vine cu Windows preinstalat și driverele producătorului există doar pentru Windows. Varianta implicită rămâne Linux (`deploy/kiosk-os/`).

## Principiul
Aceleași componente ca pe Linux: **Hardware Bridge** ca serviciu, **browserul în mod kiosk** pe pagina chioșcului, **acces blocat** la sistem. Diferă doar uneltele.

## Pașii
1. **Windows 11 Pro / IoT Enterprise**, actualizat; un cont local de administrator (parolă în seiful clubului) și un cont standard `kiosk`.
2. **Hardware Bridge:** Python 3.12+ pentru toți utilizatorii; `services/hardware-bridge` instalat într-un mediu virtual în `C:\JunglePadel\bridge`; serviciu Windows prin **NSSM** (sau „WinSW”), pornire automată, repornire la eșec, rulat de un cont de serviciu dedicat. Fișierul de mediu (`bridge.env`) și datele (`BRIDGE_DATA_DIR=C:\ProgramData\JunglePadel\bridge`) accesibile doar contului de serviciu și administratorilor (ACL).
3. **Browserul:** Microsoft Edge (sau Chrome) cu **Assigned Access** („Kiosk mode” pentru o singură aplicație) pe contul `kiosk`, adresa `https://kiosk-liga.<domeniu>/`, „Digital sign / interactive display”, repornire după inactivitate dezactivată (aplicația are propria ieșire după 30 s).
4. **Politici de grup** (echivalentul fișierului `chromium-policy.json`): `URLBlocklist = *`, `URLAllowlist` = site-ul chioșcului, API-ul și `ws://127.0.0.1:8765`; `DeveloperToolsAvailability = 2`; descărcări, printare, parole, sincronizare dezactivate; `AutoSelectCertificateForUrls` pentru certificatul client (importat în magazinul utilizatorului `kiosk`).
5. **Blocare:** Ctrl+Alt+Del, Task Manager, schimbarea utilizatorului și tastele Windows dezactivate prin politici („Keyboard Filter” pe ediția IoT); actualizări Windows în afara programului (04:00–06:00).
6. **Watchdog:** serviciul bridge are „Recovery: restart”; o sarcină programată la fiecare minut verifică portul 127.0.0.1:8765 și procesul browserului și le repornește; repornire zilnică la 04:30.
7. **Înrolarea:** identică (runbook-ul `03-instalare-chiosc-si-inrolare.md`); cheia publică: `jungle-bridge public-key` din mediul virtual.

## De confirmat la alegerea aparatului (Q23)
- Dacă driverul casei de marcat sau al acceptorului de numerar există și pentru Linux, rămânem pe Linux.
- Ediția Windows livrată de producător (Assigned Access cere Pro, Enterprise sau IoT).
