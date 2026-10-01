"""The default texts of the notifications (§11), in Romanian and English (R-140).

The panel can replace any of them (`Template`); these stay as the fallback. Each event has a subject
(the email's subject and the push notification's title), the email's text and the push's short
text. The texts use `{{ name }}`-style fields from the notification's context; every context has
`first_name` and `url` (the page of the site the message is about).
"""

from __future__ import annotations

from typing import NamedTuple


class Texts(NamedTuple):
    subject: str
    email: str
    push: str


SIGNATURE = {"ro": "\n\nEchipa Jungle Padel", "en": "\n\nThe Jungle Padel team"}

DEFAULTS: dict[str, dict[str, Texts]] = {
    "account.email_confirm": {
        "ro": Texts(
            "Confirmă adresa de email",
            "Bună, {{ first_name }}!\n\nConfirmă adresa de email a contului Jungle Padel: {{ url }}",
            "",
        ),
        "en": Texts(
            "Confirm your email address",
            "Hi {{ first_name }},\n\nConfirm the email address of your Jungle Padel account: {{ url }}",
            "",
        ),
    },
    "account.level_validated": {
        "ro": Texts(
            "Nivelul tău a fost validat",
            "Bună, {{ first_name }}!\n\nUn antrenor ți-a validat nivelul: {{ level }}. Dacă ai și acordul ligii semnat la Chioșcul Ligii, poți juca meciuri oficiale.\n\n{{ url }}",
            "Nivelul tău a fost validat: {{ level }}.",
        ),
        "en": Texts(
            "Your level has been validated",
            "Hi {{ first_name }},\n\nA coach validated your level: {{ level }}. With the league's consent signed at the League Kiosk, you can play official matches.\n\n{{ url }}",
            "Your level has been validated: {{ level }}.",
        ),
    },
    "account.card_issued": {
        "ro": Texts(
            "Cardul tău Jungle Padel",
            "Bună, {{ first_name }}!\n\nCardul tău de membru are numărul {{ number }}. Îl găsești în cont, cu codul QR și butoanele pentru Wallet: {{ url }}",
            "Cardul tău de membru e gata: {{ number }}.",
        ),
        "en": Texts(
            "Your Jungle Padel card",
            "Hi {{ first_name }},\n\nYour member card number is {{ number }}. Find it in your account, with the QR code and the Wallet buttons: {{ url }}",
            "Your member card is ready: {{ number }}.",
        ),
    },
    "booking.confirmed": {
        "ro": Texts(
            "Rezervarea e confirmată",
            "Bună, {{ first_name }}!\n\n{{ resource }}, {{ when }}. Plata se face la club, la Chioșcul de Plăți.\n\nRezervările tale: {{ url }}",
            "{{ resource }}, {{ when }}: rezervarea e confirmată.",
        ),
        "en": Texts(
            "Your booking is confirmed",
            "Hi {{ first_name }},\n\n{{ resource }}, {{ when }}. You pay at the club, at the Payments Kiosk.\n\nYour bookings: {{ url }}",
            "{{ resource }}, {{ when }}: your booking is confirmed.",
        ),
    },
    "booking.changed": {
        "ro": Texts(
            "Rezervarea s-a schimbat",
            "Bună, {{ first_name }}!\n\nRezervarea ta s-a schimbat: {{ resource }}, {{ when }}.\n\n{{ url }}",
            "Rezervarea s-a schimbat: {{ resource }}, {{ when }}.",
        ),
        "en": Texts(
            "Your booking has changed",
            "Hi {{ first_name }},\n\nYour booking has changed: {{ resource }}, {{ when }}.\n\n{{ url }}",
            "Your booking has changed: {{ resource }}, {{ when }}.",
        ),
    },
    "booking.cancelled": {
        "ro": Texts(
            "Rezervarea e anulată",
            "Bună, {{ first_name }}!\n\nRezervarea de {{ when }} ({{ resource }}) e anulată. {{ outcome }}\n\n{{ url }}",
            "Rezervarea de {{ when }} e anulată.",
        ),
        "en": Texts(
            "Your booking is cancelled",
            "Hi {{ first_name }},\n\nYour booking on {{ when }} ({{ resource }}) is cancelled. {{ outcome }}\n\n{{ url }}",
            "Your booking on {{ when }} is cancelled.",
        ),
    },
    "booking.reminder_24h": {
        "ro": Texts(
            "Mâine la Jungle Padel",
            "Bună, {{ first_name }}!\n\nTe așteptăm mâine: {{ resource }}, {{ when }}. Dacă nu mai poți veni, anulează din cont.\n\n{{ url }}",
            "Mâine: {{ resource }}, {{ when }}.",
        ),
        "en": Texts(
            "Tomorrow at Jungle Padel",
            "Hi {{ first_name }},\n\nSee you tomorrow: {{ resource }}, {{ when }}. If you can no longer come, cancel from your account.\n\n{{ url }}",
            "Tomorrow: {{ resource }}, {{ when }}.",
        ),
    },
    "booking.reminder_2h": {
        "ro": Texts("În două ore", "", "În două ore: {{ resource }}, {{ when }}."),
        "en": Texts("In two hours", "", "In two hours: {{ resource }}, {{ when }}."),
    },
    "waitlist.promoted": {
        "ro": Texts(
            "S-a eliberat un loc",
            "Bună, {{ first_name }}!\n\nS-a eliberat un loc și ești înscris: {{ what }}, {{ when }}.\n\n{{ url }}",
            "Ai primit un loc: {{ what }}, {{ when }}.",
        ),
        "en": Texts(
            "A place opened up",
            "Hi {{ first_name }},\n\nA place opened up and you are in: {{ what }}, {{ when }}.\n\n{{ url }}",
            "You got a place: {{ what }}, {{ when }}.",
        ),
    },
    "classes.absences": {
        "ro": Texts(
            "Ne e dor de tine la antrenamente",
            "Bună, {{ first_name }}!\n\nAi lipsit de la ultimele {{ count }} antrenamente ale abonamentului. Te așteptăm: programul e în cont.\n\n{{ url }}",
            "Ai lipsit de la ultimele {{ count }} antrenamente. Te așteptăm!",
        ),
        "en": Texts(
            "We miss you at training",
            "Hi {{ first_name }},\n\nYou missed the last {{ count }} sessions of your subscription. We look forward to seeing you: the schedule is in your account.\n\n{{ url }}",
            "You missed the last {{ count }} sessions. See you soon!",
        ),
    },
    "booking.fee": {
        "ro": Texts(
            "Taxă de neprezentare sau anulare târzie",
            "Bună, {{ first_name }}!\n\nPentru {{ when }} ({{ resource }}) se datorează {{ amount }}: {{ reason }}. O achiți la Chioșcul de Plăți.\n\n{{ url }}",
            "Taxă: {{ amount }} pentru {{ when }}.",
        ),
        "en": Texts(
            "No-show or late cancellation fee",
            "Hi {{ first_name }},\n\nFor {{ when }} ({{ resource }}) {{ amount }} is due: {{ reason }}. You pay it at the Payments Kiosk.\n\n{{ url }}",
            "Fee: {{ amount }} for {{ when }}.",
        ),
    },
    "booking.blocked": {
        "ro": Texts(
            "Rezervările online sunt blocate",
            "Bună, {{ first_name }}!\n\nDupă neprezentări repetate, rezervările online sunt blocate până pe {{ until }}. Pentru detalii, întreabă la recepție.",
            "Rezervările online sunt blocate până pe {{ until }}.",
        ),
        "en": Texts(
            "Online bookings are blocked",
            "Hi {{ first_name }},\n\nAfter repeated no-shows, online bookings are blocked until {{ until }}. Ask at reception for details.",
            "Online bookings are blocked until {{ until }}.",
        ),
    },
    "league.score_window": {
        "ro": Texts(
            "Introduceți scorul",
            "",
            "Meciul s-a terminat: introduceți scorul la Chioșcul Ligii, în club.",
        ),
        "en": Texts(
            "Enter the score",
            "",
            "The match is over: enter the score at the League Kiosk, at the club.",
        ),
    },
    "league.score_proposed": {
        "ro": Texts(
            "Un scor așteaptă confirmarea ta",
            "Bună, {{ first_name }}!\n\nS-a propus scorul {{ score }} pentru meciul de {{ when }}. Îl confirmi sau îl contești la Chioșcul Ligii, până la {{ until }}.",
            "Scor propus: {{ score }}. Confirmă la Chioșcul Ligii.",
        ),
        "en": Texts(
            "A score is waiting for you",
            "Hi {{ first_name }},\n\nThe score {{ score }} was proposed for the match on {{ when }}. Confirm or dispute it at the League Kiosk, by {{ until }}.",
            "Score proposed: {{ score }}. Confirm at the League Kiosk.",
        ),
    },
    "league.score_validated": {
        "ro": Texts(
            "Meci validat: {{ lp }} LP",
            "Bună, {{ first_name }}!\n\nMeciul de {{ when }} ({{ score }}) e validat: {{ lp }} LP.\n\n{{ url }}",
            "Meci validat: {{ lp }} LP.",
        ),
        "en": Texts(
            "Match validated: {{ lp }} LP",
            "Hi {{ first_name }},\n\nThe match on {{ when }} ({{ score }}) is validated: {{ lp }} LP.\n\n{{ url }}",
            "Match validated: {{ lp }} LP.",
        ),
    },
    "league.rank_changed": {
        "ro": Texts(
            "Rang nou: {{ rank }}",
            "Bună, {{ first_name }}!\n\nAi ajuns {{ rank }} în clasamentul {{ ladder }}.\n\n{{ url }}",
            "Rang nou: {{ rank }} ({{ ladder }}).",
        ),
        "en": Texts(
            "New rank: {{ rank }}",
            "Hi {{ first_name }},\n\nYou are now {{ rank }} in the {{ ladder }} ladder.\n\n{{ url }}",
            "New rank: {{ rank }} ({{ ladder }}).",
        ),
    },
    "league.diamond": {
        "ro": Texts(
            "Bine ai venit în Diamant",
            "Bună, {{ first_name }}!\n\nAi ajuns la rangul Diamant. Cardul tău fizic de Diamant te așteaptă la recepție.\n\n{{ url }}",
            "Diamant! Cardul fizic te așteaptă la recepție.",
        ),
        "en": Texts(
            "Welcome to Diamond",
            "Hi {{ first_name }},\n\nYou reached the Diamond rank. Your physical Diamond card is waiting at reception.\n\n{{ url }}",
            "Diamond! Your physical card is waiting at reception.",
        ),
    },
    "league.challenge": {
        "ro": Texts(
            "Provocare: {{ status }}",
            "Bună, {{ first_name }}!\n\nProvocarea {{ who }}: {{ status }}. Detaliile sunt în cont; răspunsul se dă la Chioșcul Ligii.\n\n{{ url }}",
            "Provocare {{ who }}: {{ status }}.",
        ),
        "en": Texts(
            "Challenge: {{ status }}",
            "Hi {{ first_name }},\n\nThe challenge {{ who }}: {{ status }}. The details are in your account; the answer is given at the League Kiosk.\n\n{{ url }}",
            "Challenge {{ who }}: {{ status }}.",
        ),
    },
    "league.decay_risk": {
        "ro": Texts(
            "Nu ai mai jucat de {{ days }} zile",
            "Bună, {{ first_name }}!\n\nDin {{ starts }}, fără un meci oficial, începi să pierzi LP în clasamentul {{ ladder }}. Un meci e de ajuns.\n\n{{ url }}",
            "Din {{ starts }} începi să pierzi LP. Un meci e de ajuns.",
        ),
        "en": Texts(
            "No match for {{ days }} days",
            "Hi {{ first_name }},\n\nFrom {{ starts }}, without an official match, you start losing LP in the {{ ladder }} ladder. One match is enough.\n\n{{ url }}",
            "From {{ starts }} you start losing LP. One match is enough.",
        ),
    },
    "league.matches_needed": {
        "ro": Texts(
            "Încă {{ count }} meciuri pentru clasamentul final",
            "Bună, {{ first_name }}!\n\nÎți mai trebuie {{ count }} meciuri oficiale până la finalul sezonului ({{ until }}) ca să intri în clasamentul final și la premii.\n\n{{ url }}",
            "Încă {{ count }} meciuri pentru clasamentul final.",
        ),
        "en": Texts(
            "{{ count }} more matches for the final standings",
            "Hi {{ first_name }},\n\nYou need {{ count }} more official matches before the season ends ({{ until }}) to enter the final standings and the prizes.\n\n{{ url }}",
            "{{ count }} more matches for the final standings.",
        ),
    },
    "league.season_end": {
        "ro": Texts(
            "Sezonul s-a încheiat",
            "Bună, {{ first_name }}!\n\nSezonul {{ season }} s-a încheiat: ai terminat pe locul {{ position }}. {{ reward }}\n\n{{ url }}",
            "Sezonul s-a încheiat: locul {{ position }}.",
        ),
        "en": Texts(
            "The season is over",
            "Hi {{ first_name }},\n\nSeason {{ season }} is over: you finished in place {{ position }}. {{ reward }}\n\n{{ url }}",
            "The season is over: place {{ position }}.",
        ),
    },
    "league.match_of_the_day": {
        "ro": Texts("Meciul zilei", "", "Meciul tău e Meciul zilei: {{ when }}, {{ court }}."),
        "en": Texts(
            "Match of the day", "", "Your match is the Match of the day: {{ when }}, {{ court }}."
        ),
    },
    "league.inactive": {
        "ro": Texts(
            "Hai înapoi pe teren",
            "Bună, {{ first_name }}!\n\nN-ai mai jucat de {{ days }} zile. Jucători de nivelul tău care caută parteneri: {{ partners }}.\n\n{{ url }}",
            "N-ai mai jucat de {{ days }} zile. Hai înapoi pe teren!",
        ),
        "en": Texts(
            "Back on court",
            "Hi {{ first_name }},\n\nYou have not played for {{ days }} days. Players of your level looking for partners: {{ partners }}.\n\n{{ url }}",
            "You have not played for {{ days }} days. Back on court!",
        ),
    },
    "subscription.bought": {
        "ro": Texts(
            "Abonamentul e activ",
            "Bună, {{ first_name }}!\n\nAbonamentul {{ what }} e activ între {{ starts }} și {{ ends }}.\n\n{{ url }}",
            "Abonamentul e activ până pe {{ ends }}.",
        ),
        "en": Texts(
            "Your subscription is active",
            "Hi {{ first_name }},\n\nYour {{ what }} subscription is active from {{ starts }} to {{ ends }}.\n\n{{ url }}",
            "Your subscription is active until {{ ends }}.",
        ),
    },
    "subscription.expiring": {
        "ro": Texts(
            "Abonamentul expiră pe {{ ends }}",
            "Bună, {{ first_name }}!\n\nAbonamentul {{ what }} expiră pe {{ ends }}. Îl reînnoiești la Chioșcul de Plăți.\n\n{{ url }}",
            "Abonamentul expiră pe {{ ends }}.",
        ),
        "en": Texts(
            "Your subscription ends on {{ ends }}",
            "Hi {{ first_name }},\n\nYour {{ what }} subscription ends on {{ ends }}. You renew it at the Payments Kiosk.\n\n{{ url }}",
            "Your subscription ends on {{ ends }}.",
        ),
    },
    "subscription.frozen": {
        "ro": Texts(
            "Abonamentul e înghețat",
            "Bună, {{ first_name }}!\n\nAbonamentul e înghețat între {{ starts }} și {{ ends }} și se prelungește cu atât.\n\n{{ url }}",
            "Abonamentul e înghețat până pe {{ ends }}.",
        ),
        "en": Texts(
            "Your subscription is frozen",
            "Hi {{ first_name }},\n\nYour subscription is frozen from {{ starts }} to {{ ends }} and extended by as much.\n\n{{ url }}",
            "Your subscription is frozen until {{ ends }}.",
        ),
    },
    "subscription.sessions_left": {
        "ro": Texts(
            "Mai ai {{ count }} sesiuni luna aceasta",
            "Bună, {{ first_name }}!\n\nMai ai {{ count }} sesiuni de {{ sport }} luna aceasta; cele nefolosite nu trec în luna următoare.\n\n{{ url }}",
            "Mai ai {{ count }} sesiuni de {{ sport }} luna aceasta.",
        ),
        "en": Texts(
            "{{ count }} sessions left this month",
            "Hi {{ first_name }},\n\nYou have {{ count }} {{ sport }} sessions left this month; unused ones do not carry over.\n\n{{ url }}",
            "{{ count }} {{ sport }} sessions left this month.",
        ),
    },
    "voucher.received": {
        "ro": Texts(
            "Ai primit un voucher",
            "Bună, {{ first_name }}!\n\nAi primit un voucher: {{ what }}, valabil până pe {{ until }}. Îl folosești la plată, la club.\n\n{{ url }}",
            "Voucher nou: {{ what }}.",
        ),
        "en": Texts(
            "You received a voucher",
            "Hi {{ first_name }},\n\nYou received a voucher: {{ what }}, valid until {{ until }}. You use it when paying, at the club.\n\n{{ url }}",
            "New voucher: {{ what }}.",
        ),
    },
    "club.new_event": {
        "ro": Texts(
            "Nou la Jungle Padel: {{ title }}",
            "Bună, {{ first_name }}!\n\n{{ title }}, {{ when }}. {{ text }}\n\n{{ url }}",
            "{{ title }}, {{ when }}.",
        ),
        "en": Texts(
            "New at Jungle Padel: {{ title }}",
            "Hi {{ first_name }},\n\n{{ title }}, {{ when }}. {{ text }}\n\n{{ url }}",
            "{{ title }}, {{ when }}.",
        ),
    },
    "staff.cash_low": {
        "ro": Texts(
            "Rest scăzut: {{ device }}",
            "Chioșcul {{ device }} mai are puțin rest: {{ detail }}.",
            "Rest scăzut: {{ device }}.",
        ),
        "en": Texts(
            "Low change: {{ device }}",
            "The kiosk {{ device }} is low on change: {{ detail }}.",
            "Low change: {{ device }}.",
        ),
    },
    "staff.device_offline": {
        "ro": Texts(
            "Aparat offline: {{ device }}",
            "Aparatul {{ device }} nu mai răspunde din {{ since }}.",
            "Aparat offline: {{ device }}.",
        ),
        "en": Texts(
            "Device offline: {{ device }}",
            "The device {{ device }} has not answered since {{ since }}.",
            "Device offline: {{ device }}.",
        ),
    },
    "staff.dispute": {
        "ro": Texts(
            "Scor contestat",
            "Un scor a fost contestat la Chioșcul Ligii ({{ when }}). Se rezolvă din panou, la Liga.",
            "Scor contestat: {{ when }}.",
        ),
        "en": Texts(
            "Score disputed",
            "A score was disputed at the League Kiosk ({{ when }}). It is resolved from the panel, under League.",
            "Score disputed: {{ when }}.",
        ),
    },
    "staff.backup_failed": {
        "ro": Texts(
            "Backup eșuat",
            "Backup-ul din {{ when }} nu s-a încheiat: {{ detail }}.",
            "Backup eșuat: {{ when }}.",
        ),
        "en": Texts(
            "Backup failed",
            "The backup of {{ when }} did not finish: {{ detail }}.",
            "Backup failed: {{ when }}.",
        ),
    },
}
