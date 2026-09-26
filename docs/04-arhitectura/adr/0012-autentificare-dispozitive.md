# ADR-0012: Autentificarea dispozitivelor (chioșcuri, ecrane, afișajul cafenelei)

- **Stare:** Acceptat (26.09.2026, odată cu aprobarea Etapei 0 de către proprietar)
- **Data:** 2026-09-26
- **Legat de:** §4.1, §4.6, §6.9 punctul 8, §8.2, §8.3, §12.1

## Context
Regula cea mai importantă a ligii: **scorurile se introduc exclusiv la chioșcul de ligă din club**, iar regula se aplică pe server (§4.1, §12.1). Plățile din chioșc vin doar de la dispozitivul „Plăți”. Ecranele au voie doar să citească.

## Decizie
1. Fiecare aparat este o entitate `Device` (tip, locație, cheie, stare, ultimul semnal de viață), administrată din admin.
2. **Autentificare în straturi:**
   1. **Certificat client (mTLS)** emis de o autoritate de certificare internă a clubului; proxy-ul verifică certificatul pe subdomeniile dispozitivelor și transmite backend-ului identitatea aparatului.
   2. **Token de dispozitiv** legat de acel certificat.
   3. **Restricție de rețea:** doar rețeaua clubului (sau un tunel VPN WireGuard către server, dacă serverul nu este în club).
   4. **Rol de dispozitiv** cu drepturi minime (Dispozitiv Ligă, Dispozitiv Plăți, Ecran, Cafenea).
3. Serviciile de scor acceptă EXCLUSIV identitatea „Dispozitiv Ligă”. Orice altă sursă (website, telefon, admin, AI, alt aparat) primește refuz, iar încercarea se înregistrează în jurnal. Există un test automat pentru fiecare sursă interzisă.
4. Jucătorul se identifică la chioșc prin scanarea cardului (token QR aleatoriu, R-022); sesiunea lui la chioșc expiră după 30 de secunde de inactivitate (§8.2).
5. Revocare: dezactivarea aparatului din admin + revocarea certificatului; efect imediat.
6. Procedura de „înrolare” a unui aparat nou (generare certificat, instalare, test) se scrie ca runbook în `docs/09-hardware/`.

## Alternative analizate
- **Doar cheie API:** poate fi copiată de pe aparat. Respins ca unică protecție.
- **Doar filtrare pe IP:** ușor de ocolit într-o rețea locală. Respins ca unică protecție.

## Consecințe
- Cheia privată a autorității de certificare interne se păstrează offline.
- Adăugarea unui chioșc nou necesită un pas de configurare făcut de personalul autorizat.
