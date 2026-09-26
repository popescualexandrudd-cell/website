# ADR-0011: Autentificarea utilizatorilor și a personalului

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** R-001, R-002, §8.1 (roluri), §8.6, §12.1

## Context
Clienții își fac cont pe website (sau asistat la recepție). Personalul (Admin, Manager, Recepție, Antrenor/Instructor) are acces la date personale și la bani, deci are nevoie de protecție suplimentară.

## Decizie
1. Model propriu de utilizator Django, cu emailul ca identificator; parole cu Argon2; verificarea emailului obligatorie (R-002).
2. **Sesiuni pe cookie** `HttpOnly`, `Secure`, `SameSite=Lax`, cu protecție CSRF, comune pentru `www.<domeniu>` și `api.<domeniu>` (același domeniu de bază).
3. **2FA obligatorie** (TOTP, cu coduri de recuperare) pentru toate rolurile de personal; passkeys (WebAuthn) opțional, ulterior. Sesiuni scurte pentru personal (durată configurabilă). Restricție opțională pe IP pentru admin (§8.6).
4. Blocare temporară după încercări eșuate și limitarea ratei cererilor (§12.1).
5. **Roluri și permisiuni (RBAC):** rolurile din §8.1 (Admin, Manager, Recepție, Antrenor/Instructor, Jucător/Client, Dispozitiv). Permisiunile sunt pe acțiuni (de exemplu „anulează rezervare cu motiv”), verificate în stratul de servicii, nu doar în interfață. Principiul privilegiului minim.
6. Acțiunile AI rulează cu identitatea clientului autentificat plus o restricție suplimentară „origine AI” (ADR-0019).
7. Contul rapid la chioșc pentru invitați (Q8) și conturile de copii gestionate de părinți (Q7) se proiectează în Etapa 1A, ca opțiuni configurabile.

## Alternative analizate
- **JWT păstrat în `localStorage`:** vulnerabil la XSS și greu de revocat. Respins.
- **Furnizor extern de identitate (Auth0, Firebase Auth etc.):** dependență de terți (§1.1 punctul 5). Respins.

## Consecințe
- API-ul și website-ul trebuie servite pe subdomenii ale aceluiași domeniu (§4.6).
