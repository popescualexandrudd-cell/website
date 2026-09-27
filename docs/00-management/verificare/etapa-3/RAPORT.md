# Raport de verificare — Etapa 3 (rezervări, prețuri, anulări, prezențe)

> Data: 27.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **livrată, așteaptă aprobarea proprietarului.**

Etapa 3 construiește „motorul” rezervărilor, în backend: regulile, prețurile, anulările, lista de așteptare, prezențele și neprezentările. Ecranele pentru clienți (pe site) și pentru recepție (în admin) vin în Etapele 10–11 și vor folosi exact aceste funcții. Până atunci, totul se verifică prin testele automate și prin documentația API (`/api/v1/docs`).

## Ce s-a construit
| Ce | Reguli | Detalii |
|---|---|---|
| Rezervarea unui teren | R-040 … R-044 | Online (clientul, pentru el) sau la recepție (pentru un client). Start la fix sau la jumătate (grila de 30 de minute). Durate 60–180 min, din 30 în 30 (Q2). Doar în programul clubului (Q3), doar în viitor. Tipul sesiunii (meci oficial, antrenament, lecție, turneu, provocare, închiriere liberă) se schimbă până la prima scanare (Q29). |
| Fără suprapuneri, garantat | R-043, ADR-0004 | Baza de date refuză singură două rezervări pe același teren în același timp și un antrenor în două locuri deodată. Refuză și rezervările în afara grilei sau cu durate nepermise, chiar dacă cineva ar ocoli regulile din cod. Doi clienți care apasă „Rezervă” exact în aceeași secundă: unul primește locul, celălalt mesajul „tocmai s-a ocupat”. |
| Prețuri | R-050 … R-053 | Tarif pe fiecare jumătate de oră: bandă orară (vârf, semi-vârf, în afara vârfului), sezon (vară din 1 aprilie, iarnă din 1 octombrie), tip client (neabonat, abonat, corporate), produs (închiriere, lecție, clasă, eveniment). O rezervare care trece dintr-o bandă în alta se plătește proporțional. Totul în bani întregi (RON × 100). Lista tarifelor e publică. Singurul preț cunoscut e tenisul, 120 RON/oră (R-051); restul sunt **DEMO, marcate DE_STABILIT** (Q21), până le stabiliți din admin. |
| Anulări | R-070, R-071 | Cu cel puțin 24 h înainte: gratuită (eligibilă pentru recuperare; creditul în cont vine în Etapa 4, Q14). Mai târziu: se plătește. Recepția poate scuti de plată, doar cu motiv scris (apare în jurnalul de audit). |
| Lista de așteptare automată | R-074, Q16 | Pentru un interval ocupat. Când cineva anulează, primul de pe listă primește automat rezervarea și un email. Anularea e gratuită în primele 2 ore de la promovare, chiar dacă mai sunt sub 24 h până la oră. Câmpul de prioritate pentru abonați există (Q4) și se leagă de abonamente în Etapa 4. |
| Pilates Reformer | R-100 … R-103, Q46 | Clase programate de instructor. Capacitatea ≤ numărul de aparate active (4 acum; al 5-lea și al 6-lea se activează din admin). Înscriere sau listă de așteptare când e plin; la o anulare, următorul intră automat și primește email. Ședințele private pe un aparat se rezervă ca lecție. |
| Sala de evenimente | Q34 | Cerere online (dată, durată, număr de invitați ≤ capacitate, mesaj). Managerul aprobă sau respinge; la aprobare se creează rezervarea. |
| Prezențe | R-030 … R-032 | Scanarea cardului: la sosire, la intrarea pe teren (se leagă automat de rezervarea care rulează pe acel teren) și la clasă (= prezență; antrenorul nu face nimic). În această etapă scanările vin de la recepție; din Etapa 7, de la scanere și chioșcuri, prin aceeași funcție. |
| Neprezentări și blocare | R-072, R-073, Q15 | Nicio scanare în 15 minute de la start = neprezentare. La a treia neprezentare în 90 de zile: rezervările online se blochează, iar persoana responsabilă primește o notificare în platformă. Responsabilul e antrenorul lecției, instructorul clasei sau, pentru închirieri, managerul (Q15). Antrenorul sau managerul deblochează, cu motiv. Cine întârzie, dar ajunge înainte de final, nu mai e socotit neprezentare. |
| Protecție la conturi false | R-002 | Rezervarea online cere emailul confirmat, altfel conturile false ar putea ține terenurile ocupate. Recepția poate rezerva oricând pentru un client. |

## Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend | **202**, toate trec (71 noi pentru Etapa 3), acoperire **96%** (prag 95%) |
| Motorul ligii | 173 de teste, 100% pe ramuri (neschimbat) |
| Site: teste cap-coadă (Playwright, desktop + mobil) + axe | 26 trec (neschimbat) |
| ruff, mypy strict, migrații, client API, traduceri RO/EN | 0 probleme (`scripts/test-all` verde) |

Testele poartă ID-ul regulii în nume. Printre ele:
- ziua schimbării orei (28.03.2027): 23 de ore, iar o rezervare de la 10:00 e stocată corect în UTC;
- 31.10.2027: ziua de 25 de ore;
- concurența: două rezervări simultane pe același teren;
- refuzurile direct în baza de date;
- promovarea de pe listă, cu email;
- blocarea la a treia neprezentare.

## Dubla revizuire: probleme găsite și reparate
1. **Calculul pe ziua schimbării orei.** Python adună minutele pe ceasul local, iar pe 28.03.2027 „+30 de minute” putea sări o oră. Acum toate calculele de timp se fac în UTC; testul acoperă și intervalul 02:30–04:30 din noaptea schimbării.
2. **Două rezervări în aceeași secundă.** Baza de date refuza corect a doua, dar raporta un „deadlock” în loc de „locul tocmai s-a ocupat”, deci clientul ar fi văzut o eroare de server. Acum rezervările pe același teren și pentru același antrenor se pun la rând; testul rulează două fire de execuție simultan.
3. **Antrenorul în două locuri.** Se putea rezerva o lecție de padel cu instructorul în timpul clasei lui de pilates, și invers. Acum ambele direcții sunt verificate.
4. **Mesajul „capacitate prea mare”** trimitea numărul de aparate sub alt nume decât cel din text, deci numărul nu ar fi apărut în mesaj. Reparat și testat.
5. **Conturi neconfirmate.** Un cont cu emailul neconfirmat putea rezerva online. Acum nu mai poate (vezi tabelul).
6. **Din perspectiva unui atacator:**
   - disponibilitatea publică arată doar intervalele ocupate, fără nume (R-012);
   - clientul anulează doar rezervările lui, iar scutirea de plată cere rol de personal cu 2FA și motiv;
   - orele fără fus orar sunt refuzate;
   - scanările se leagă doar de terenuri și clase din aceeași locație;
   - toate acțiunile de personal trec prin roluri și apar în jurnalul de audit.

## Ce e marcat „de confirmat” (lucrăm cu varianta implicită, schimbabilă din admin)
| Întrebare | Varianta folosită |
|---|---|
| Q2 durate | 60, 90, 120, 150, 180 de minute |
| Q3 program și benzi | 08:00–23:00 în fiecare zi; vârf 15–22, semi-vârf 08–12, restul în afara vârfului; weekendul ca în cursul săptămânii |
| Q4 prioritatea abonaților | câmp pregătit pe lista de așteptare; se activează cu abonamentele (Etapa 4) |
| Q14 „recuperare” | anularea gratuită e marcată „eligibilă”; creditul în cont vine în Etapa 4 |
| Q15 neprezentări | fereastră de 90 de zile; responsabil pentru închirieri: managerul |
| Q16 promovare | anulare gratuită în primele 2 ore de la promovare |
| Q21 prețuri | tarife DEMO, marcate DE_STABILIT (padel, pilates, lecții, sala de evenimente) |
| Q29 tipul sesiunii | ales la rezervare, schimbabil până la prima scanare |
| Q34 sala de evenimente | cerere online, aprobată de manager |

## Limitări cunoscute (intenționate, cu etapa în care se rezolvă)
- Plata rezervării, creditul în cont și abonamentele: **Etapa 4**.
- Ecranele de rezervare pe site și pentru recepție: **Etapele 10–11**.
- Scanerele și chioșcurile reale: **Etapa 7**.
- Emailurile se trimit prin furnizorul ales la Q24.
- Rularea automată a verificării neprezentărilor la fiecare 5 minute se configurează la deploy (**Etapa 14**). Comanda există deja: `process_no_shows`.
- Blocarea după neprezentări e per persoană, în toate locațiile. Orice antrenor sau manager o poate ridica, cu motiv, iar ridicarea apare în jurnal.

## Cum verificați (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschideți acest raport.
2. Deschideți `docs/00-management/INTREBARI_DESCHISE.md` și răspundeți, dacă puteți, la Q2, Q3, Q15, Q16 și Q21 (mai ales prețurile și programul).
3. Opțional, local:
   - rulați `scripts/setup`, apoi `scripts/dev`;
   - deschideți `http://localhost:8000/api/v1/docs`: secțiunile „bookings”, „classes”, „events”, „pricing” și „staff: …” arată toate funcțiile;
   - `GET /api/v1/bookings/availability?location=jungle-padel&day=…` arată ce e ocupat într-o zi.
