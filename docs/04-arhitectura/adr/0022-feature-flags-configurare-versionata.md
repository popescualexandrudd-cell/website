# ADR-0022: Feature flags și configurare versionată, cu valori „DE_CONFIRMAT” vizibile

- **Stare:** Acceptat (26.09.2026, odată cu aprobarea Etapei 0 de către proprietar)
- **Data:** 2026-09-26
- **Legat de:** §1.1 punctul 2, §2.2, §6 (parametri versionați), §8.6, R-006, R-110

## Context
Multe funcții sunt pregătite, dar dezactivate la lansare (parkour, ligă de juniori, WhatsApp, plăți online, POS), iar multe valori nu sunt încă stabilite (prețuri, program, parametri ai ligii).

## Decizie
1. **`FeatureFlag`** în baza de date, editabil din admin, cu jurnal de audit. Flag-uri inițiale: parkour, teren de tenis pe amplasament, ligă de juniori, conturi de copii, WhatsApp, SMS, plăți online, POS cu card, membri fondatori, AI (oprire globală).
2. **`ConfigVersion`:** parametrii ligii, prețurile și regulile configurabile sunt versiuni imutabile, cu dată de intrare în vigoare. Pentru ligă: implicit de la sezonul următor; imediat doar cu confirmare explicită și jurnal de audit (§6).
3. Valorile nestabilite au valori implicite sigure, marcate **`DE_CONFIRMAT`** (decizie de luat) sau **`DE_STABILIT`** (preț de stabilit), afișate vizibil în admin și listate în documentație (§1.1 punctul 2).
4. Resursele noi (terenuri, săli, aparate reformer, locații) se adaugă din admin, fără cod nou (§2.2).

## Alternative analizate
- **Flag-uri în variabile de mediu:** fiecare schimbare ar cere un deploy. Respins.
- **Servicii SaaS de feature flags:** dependență de terți. Respins.

## Consecințe
- Adminul are o pagină „Ce mai trebuie confirmat” care listează toate valorile `DE_CONFIRMAT` / `DE_STABILIT`.
