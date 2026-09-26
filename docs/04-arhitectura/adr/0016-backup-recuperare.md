# ADR-0016: Backup și recuperare după dezastru

- **Stare:** Acceptat (26.09.2026, odată cu aprobarea Etapei 0 de către proprietar)
- **Data:** 2026-09-26
- **Legat de:** §12.1, §14

## Context
Datele clubului (conturi, bani, ligă) nu au voie să se piardă. Serverul este propriu, deci backup-ul și testarea lui sunt responsabilitatea noastră.

## Decizie
1. **pgBackRest** pentru PostgreSQL: backup complet zilnic + arhivare continuă a jurnalului de tranzacții (WAL), cu posibilitatea de restaurare la un moment dat.
2. **Criptare** (AES-256) înainte de ieșirea datelor de pe server; cheia se păstrează separat (în două locuri sigure, cunoscute de proprietar).
3. **Copie în afara clubului** într-un spațiu de stocare compatibil S3, în UE (excepție inevitabilă de la „fără terți”: datele pleacă deja criptate).
4. Fișierele (PDF-uri de carduri, imagini încărcate) se salvează separat, criptat (de exemplu cu `restic`).
5. **Test automat lunar de restaurare** într-un mediu separat, cu raport; alertă la eșec (§12.1).
6. **Obiective propuse** (de confirmat cu proprietarul în Etapa 14): pierdere maximă de date (RPO) ≤ 1 oră, timp maxim de refacere (RTO) ≤ 4 ore.
7. Runbook de recuperare după dezastru în `docs/08-deploy-si-mentenanta/`, scris pentru un non-programator.

## Alternative analizate
- **`pg_dump` zilnic simplu:** fără restaurare la un moment dat; pierdere de până la o zi. Respins ca unică metodă (rămâne export suplimentar).
- **WAL-G:** echivalent; pgBackRest ales pentru verificarea integrată a backup-urilor și documentația amplă.

## Consecințe
- Costul lunar al spațiului de stocare off-site (mic) trebuie aprobat de proprietar.
