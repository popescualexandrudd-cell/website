# Jungle Padel — sistemul digital al clubului

Sistemul propriu al clubului **Jungle Padel** (Șoseaua Biruinței, lângă Selgros Pantelimon): website, rezervări, abonamente, plăți la chioșc, liga de padel „Jungle”, ecrane live la terenuri și în lobby, cafenea, pilates Reformer, evenimente și asistent AI. Totul într-un singur sistem, al clubului, fără platforme de rezervări externe.

**Deschiderea clubului: martie 2027.**

## Unde suntem acum
**Etapa 0 (organizarea proiectului) este gata și așteaptă aprobarea ta.** Încă nu există cod de aplicație: el începe după aprobare, cu Etapa 1A (fundația sistemului) și Etapa 1B (pagina de pre-lansare cu listă de așteptare).

## Ce să citești, în ordine
1. [Progresul proiectului](docs/00-management/PROGRES.md) — unde suntem și cum verifici fiecare etapă.
2. [Întrebările deschise](docs/00-management/INTREBARI_DESCHISE.md) — deciziile pe care le ai de luat (cele `URGENTĂ` primele).
3. [Planul detaliat](docs/00-management/PLAN_DETALIAT.md) și [calendarul](docs/00-management/CALENDAR.md).
4. [Documentația completă](docs/README.md) — regulile clubului, liga, arhitectura, securitatea, marketingul.

## Cum e organizat
| Folder | Ce conține |
|---|---|
| [`docs/`](docs/) | Toată documentația, pe teme (în română) |
| [`apps/`](apps/) | Aplicațiile: backend, website, admin, chioșcul de ligă, chioșcul de plăți, ecranele, afișajul cafenelei |
| [`packages/`](packages/) | Piese folosite de mai multe aplicații: motorul ligii, identitatea vizuală, componente, traduceri |
| [`services/`](services/) | Serviciul local care leagă chioșcurile de aparate (scanner, numerar, casă de marcat) |
| [`deploy/`](deploy/) | Instalarea pe serverul propriu, backup, monitorizare, configurarea chioșcurilor |
| [`scripts/`](scripts/) | Comenzi utile (pornire, date demo, toate testele) |
| [`tests/`](tests/) | Teste care traversează mai multe aplicații |
| [`MEGA_PROMPT.md`](MEGA_PROMPT.md) | Documentul original al proiectului (nu se modifică) |
| [`CLAUDE.md`](CLAUDE.md) | Memoria de lucru pentru sesiunile de dezvoltare |

## Pornire rapidă
Nu există încă nimic de pornit. Instrucțiunile de rulare apar aici în Etapa 1A.
