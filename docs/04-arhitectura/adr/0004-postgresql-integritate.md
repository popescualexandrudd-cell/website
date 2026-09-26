# ADR-0004: PostgreSQL, cu integritatea garantată în baza de date

- **Stare:** Acceptat (26.09.2026, odată cu aprobarea Etapei 0 de către proprietar)
- **Data:** 2026-09-26
- **Legat de:** §4.3, R-043, R-064, R-067, §6.16

## Context
Regulile critice (fără suprapuneri de rezervări, bani care nu se pot modifica, idempotență, aplicarea o singură dată a unui meci) nu trebuie să depindă doar de cod: o eroare de program sau două cereri simultane nu trebuie să poată strica datele.

## Decizie
1. **PostgreSQL 17** (minimum 16), rulat în Docker. Este singura sursă de adevăr; Redis servește doar pentru cache, mesaje în timp real și coada de sarcini.
2. **Fără suprapuneri (R-043):** constrângere de excludere cu extensia `btree_gist` pe `(resursă, interval tstzrange)`, aplicată doar rezervărilor active.
3. **Constrângeri CHECK** pentru valorile permise (durate 60–180 din 30 în 30, pornire pe grila de 30 de minute, sume nenegative unde e cazul).
4. **Idempotență (R-067):** chei unice pe operațiile de plată și pe aplicarea meciurilor.
5. **Tabele doar-adăugare** pentru registrul contabil, jurnalul de audit și evenimentele de rating: rolul de bază de date al aplicației nu are drept de `UPDATE`/`DELETE` pe ele, iar un trigger refuză orice modificare. Migrările rulează cu un rol separat.
6. **Concurență:** confirmările de scor și plățile blochează rândul afectat (`SELECT … FOR UPDATE`) într-o tranzacție; testele de concurență verifică dubla confirmare, dubla plată și dubla rezervare (§13.3).
7. Migrări reversibile (§14).

## Alternative analizate
- **MySQL/MariaDB:** fără constrângeri de excludere pe intervale. Respins.
- **SQLite:** nepotrivit pentru mulți utilizatori simultani. Respins (folosit doar local, în Hardware Bridge, ADR-0013).

## Consecințe
- Testele de integrare rulează pe PostgreSQL real, nu pe SQLite.
- Unele erori apar ca excepții de bază de date și trebuie traduse în coduri de eroare prietenoase (de exemplu `booking.slot_taken`).
