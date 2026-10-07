# Hardware

Chioșcuri, scannere, numerar, fiscal, ecrane. Specificațiile funcționale ale chioșcurilor și ecranelor sunt în [`../04-arhitectura/aplicatii/`](../04-arhitectura/aplicatii/).

## Conținut

- [8.4 Hardware Bridge (serviciu local pe fiecare aparat)](01-hardware-bridge.md)
- [Criterii de achiziție hardware (propunere)](02-criterii-achizitie-hardware.md)
- [Instalarea unui chioșc și înrolarea lui (runbook)](03-instalare-chiosc-si-inrolare.md) — Etapa 7
- [Varianta Windows pentru chioșcuri](04-varianta-windows.md) — Etapa 7

Interfețele aparatelor (`Scanner`, `CashDevice`, `FiscalPrinter`, `ReceiptPrinter`, `Health`) și simulatoarele lor: [`services/hardware-bridge`](../../services/hardware-bridge/README.md).

## Ce rămâne

- Driverele reale, după alegerea aparatelor (Q23); până atunci Hardware Bridge lucrează cu simulatoarele, cu același contract.
