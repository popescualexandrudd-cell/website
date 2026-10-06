# Secvențele de email (§15.5)

> Etapa 13E, 06.10.2026. Cele patru secvențe din §15.5 (bun venit, după primul meci, reactivare, reînnoirea abonamentului), legate de notificările construite în Etapa 12 (`jungle/notifications`). Textele mesajelor existente se schimbă din panou, în modulul **Notificări** (șabloanele, RO și EN), fără cod. Ce lipsește e marcat și **nu e construit** până la decizia proprietarului (Q71, Q67). Toate sunt **DE_CONFIRMAT**.

## Regulile comune
- **Mesajele de serviciu** (confirmări, expirări, mementouri despre contul clientului) pleacă fără acord separat, pentru că țin de serviciul cumpărat.
- **Mesajele de promovare** (noutăți, oferte) pleacă doar cu acordul clientului (opt-in, Legea 506/2004 art. 12, GDPR; Q67).
- Fiecare mesaj pleacă **o singură dată** pentru același lucru (sistemul o garantează).
- Clientul își alege canalele din cont, la Notificări, în afară de cele obligatorii.
- Fără prețuri sau oferte care nu sunt în sistem (Q21).

## 1. Bun venit
| Pasul | Când | Mesajul din sistem | Starea |
|---|---|---|---|
| 1 | la crearea contului | „Confirmă-ți adresa de email” (`account.email_confirm`) | construit |
| 2 | când primește cardul de membru | „Cardul tău Jungle Padel e gata” (`account.card_issued`), cu Apple/Google Wallet | construit |
| 3 | la 3 zile după cont, dacă nu are nicio rezervare | „Prima ta oră pe teren”: cum rezervi, ghidul „Ce este padelul”, lecțiile | **propus**, neconstruit (DE_CONFIRMAT) |

## 2. După primul meci
| Pasul | Când | Mesajul | Starea |
|---|---|---|---|
| 1 | a doua zi după prima rezervare jucată | „Cum a fost?”: chestionarul NPS (Q71), simulatorul „Care e nivelul tău?”, cum intri în ligă (18+, la Chioșcul Ligii) | **propus**, neconstruit (Q71) |
| 2 | după primul meci de ligă confirmat | „Scor validat” (`league.score_validated`) și, dacă e cazul, „Rang nou” (`league.rank_changed`) | construit |

## 3. Reactivare
| Pasul | Când | Mesajul | Starea |
|---|---|---|---|
| 1 | după 21 de zile fără meci de ligă | „Hai înapoi pe teren” (`league.inactive`), cu până la 3 parteneri de nivel apropiat | construit (pragul: Q67) |
| 2 | după 2 antrenamente lipsă la rând | „Ne e dor de tine la antrenamente” (`classes.absences`) | construit (pragul: Q67) |
| 3 | după 30 de zile fără nicio rezervare, pentru cei care nu sunt în ligă | „Terenul te așteaptă”: orele libere din săptămâna următoare | **propus**, neconstruit (DE_CONFIRMAT) |

## 4. Reînnoirea abonamentului
| Pasul | Când | Mesajul | Starea |
|---|---|---|---|
| 1 | când mai rămân 2 sesiuni în lună | „Mai ai X sesiuni” (`subscription.sessions_left`) | construit (pragul: Q67) |
| 2 | cu 7 zile înainte de expirare | „Abonamentul expiră” (`subscription.expiring`): se reînnoiește la Chioșcul de Plăți | construit (pragul: Q67) |
| 3 | după cumpărare | „Abonament activ” (`subscription.bought`) | construit |

## Ce decide proprietarul
1. Textele: le citește în panou, în modulul Notificări, și le schimbă unde vrea.
2. Cele trei mesaje propuse (bun venit, pasul 3; după primul meci; reactivarea fără ligă): le construim doar dacă le vrea, ca evenimente noi în catalogul notificărilor, cu același mecanism.
