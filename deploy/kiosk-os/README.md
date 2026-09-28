# Configurarea aparatelor (mod kiosk)

> **Stare:** construit în Etapa 7 (28.09.2026) pentru Chioșcul de Ligă; aceleași fișiere servesc Chioșcului de Plăți (Etapa 8) și ecranelor (Etapa 9).

Transformă un mini-PC cu **Debian 12/13** într-un chioșc (ADR-0014): Hardware Bridge ca serviciu, Chromium pe tot ecranul (în `cage`, fără desktop), permis doar pentru aplicația chioșcului, watchdog, fără acces la sistem, actualizări de securitate automate.

## Fișiere

| Fișier | Rol |
|---|---|
| `install.sh` | instalarea completă (`--dry-run` doar randează fișierele într-un folder temporar) |
| `check.sh` | verificare fără instalare (sintaxă, randare, politica Chromium, restricțiile serviciilor); rulat de `scripts/test-all` |
| `files/jungle-bridge.service` | Hardware Bridge: utilizator propriu, repornire automată, doar `/var/lib/jungle-bridge` poate fi scris |
| `files/jungle-kiosk.service` | ecranul: `cage` + Chromium `--kiosk`, utilizatorul `kiosk`, pe tty1 |
| `files/start.html` | pagina locală „Serviciu temporar indisponibil”, care deschide aplicația când serverul răspunde |
| `files/chromium-policy.json` | ce are voie browserul (doar chioșcul, API-ul, bridge-ul local; fără unelte de dezvoltare, descărcări, printare) și certificatul client |
| `files/watchdog.sh` + `jungle-kiosk-watchdog.{service,timer}` | la fiecare minut: bridge-ul ascultă? ecranul rulează? Altfel repornire; după 5 eșecuri, repornirea aparatului |
| `files/watchdog-hardware.conf` | watchdog-ul hardware (repornire dacă sistemul îngheață) |
| `files/logind-kiosk.conf`, `files/sysctl-kiosk.conf` | fără console text, fără SysRq, butonul de pornire ignorat |
| `files/52jungle-unattended-upgrades` | doar actualizări de securitate, repornire la 04:30 |

## Utilizare

Pașii completi, cu înrolarea aparatului: [docs/09-hardware/03-instalare-chiosc-si-inrolare.md](../../docs/09-hardware/03-instalare-chiosc-si-inrolare.md). Varianta Windows: [docs/09-hardware/04-varianta-windows.md](../../docs/09-hardware/04-varianta-windows.md).

```bash
sudo deploy/kiosk-os/install.sh --kiosk-url https://kiosk-liga.<domeniu>/ \
  --api-url https://<api>/api/v1 --bridge-env /root/bridge.env
deploy/kiosk-os/check.sh      # verificare, fără instalare
```

Secretele (tokenul aparatului) stau doar în `/etc/jungle-bridge/bridge.env` pe aparat (drepturi 600), niciodată în git.

## Specificații și decizii

[§8.4](../../docs/09-hardware/01-hardware-bridge.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0013](../../docs/04-arhitectura/adr/0013-hardware-bridge.md), [ADR-0014](../../docs/04-arhitectura/adr/0014-chioscuri-ecrane-kiosk-os.md)
