# Etapa 12 — AI și notificări: planul pe faze

> Început pe 01.10.2026, la cererea proprietarului („Continuă cu tot proiectul până la final cu toate etapele”, 30.09.2026). Sursele: `docs/04-arhitectura/aplicatii/11-notificari.md` (§11), `docs/04-arhitectura/03-inteligenta-artificiala.md` (§10), ADR-0019, Q17–Q19, Q24.

## Ce decide proprietarul (variantele implicite, configurabile)
| Întrebare | Varianta cu care lucrăm (DE_CONFIRMAT) |
|---|---|
| Q17 „Telefon” la notificări | **notificări push** în site-ul instalat (PWA); SMS pregătit, oprit (comutatorul `sms`). |
| Q18 Pilates, lista de așteptare | **email + push**; fără WhatsApp (invariantul 14). |
| Q19 Grupul comunității | AI-ul **generează** textul, echipa îl **postează manual**. |
| Q24 Cheia AI | se creează de proprietar, pe firma clubului, și se pune doar în `.env` pe server. Fără cheie, funcțiile AI rămân oprite, iar restul sistemului merge normal. |

## Fazele
1. **12A — Nucleul notificărilor.** Lista de așteptare a mesajelor (outbox, o singură dată pe eveniment), canalele email și push (Web Push, cheile VAPID în `.env`; SMS doar adaptor, oprit), șabloanele RO/EN editabile din panou, preferințele clientului (opt-out unde legea permite; mesajele despre cont, rezervări și bani nu se pot opri), trimiterea imediată după commit și reîncercarea prin `manage.py send_notifications`.
2. **12B — Matricea din §11, legată de fiecare domeniu:** contul, nivelul, cardul, rezervările (confirmare, modificare, anulare, reminder la 24 h și 2 h), lista de așteptare, liga (fereastra de scor, scor propus/validat cu LP, promovare/retrogradare, Diamant, provocări, decay, „îți mai trebuie N meciuri”, final de sezon, Meciul zilei), absențe, taxe, blocări, abonamente, vouchere, evenimente noi, alertele pentru personal. În cont: „Notificări” cu preferințele și abonarea la push.
3. **12C — Nucleul AI (ADR-0019):** adaptorul de furnizor (implicit Claude, modelul din `AI_MODEL`), comutatorul global `ai`, limita lunară de cost, jurnalul fiecărei interacțiuni (fără date sensibile inutile), registrul de unelte pe context (public, client autentificat, copilot pentru personal) și **dubla barieră**: uneltele interzise nu există, iar serviciile pentru scoruri, rating, LP, clasamente, bani, reduceri, vouchere și acorduri GDPR refuză orice apel cu origine AI. Teste pentru ambele bariere.
4. **12D — Asistentul clubului** pe site (și în aplicația instalată): răspunde din datele clubului, verifică disponibilitatea și face rezervări pentru clientul intrat în cont (plata rămâne la chioșc, R-063).
5. **12E — Funcțiile cu decizie calculată în cod și text scris de AI:** matchmaking (scorul de potrivire determinist), reactivare (R-092), textul Meciului zilei, „Jungle Report” săptămânal, mesajele pentru comunitate (Q19), ciorne de articole și traduceri (marcate „de revizuit”).
6. **12F — Pentru personal:** copilotul pe vederi agregate, doar-citire, cu interogarea afișată; detecția de anomalii (semnalează, nu decide); sugestii de prețuri și previziuni (doar propuneri).

Fiecare fază: teste (backend cu acoperire, panou, site, cap-coadă), raport, documentație, push doar cu `test-all` verde.
