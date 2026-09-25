import { roCount } from "../lib/format";

/** Email copy in both languages. Each email goes out in the client's language. */
export type EmailLang = "ro" | "en";

export const strings = {
  ro: {
    greeting: (name: string) => `Bună, ${name},`,
    signature: "Pe curând pe teren,",
    footerNote: "Primești acest email pentru că ai folosit formularul de pe site.",
    manageLink: "Vezi sau anulează rezervarea",
    details: {
      code: "Cod",
      program: "Program",
      lesson: "Lecția",
      when: "Când",
      where: "Unde",
      participants: "Participanți",
      child: "Copil",
      contact: "Contact",
      message: "Mesaj",
      level: "Nivel declarat",
    },
    requestReceived: {
      subject: (code: string) => `Am primit cererea de rezervare (${code})`,
      preview: "Îți confirmăm în cel mai scurt timp.",
      title: "Am primit cererea ta.",
      body: "Verificăm programul și îți confirmăm pe email, de obicei în aceeași zi. Până atunci, ora rămâne rezervată pentru tine.",
    },
    confirmed: {
      subject: (code: string) => `Lecția e confirmată (${code})`,
      preview: "Ne vedem pe teren.",
      title: "Lecția e confirmată.",
      body: "Am atașat fișierul pentru calendar. Adu pantofi de tenis, apă și haine în care te miști ușor; racheta o poți împrumuta.",
      cancelNote: (hours: number) =>
        `Poți anula gratuit din linkul de mai jos până cu ${roCount(hours, "o oră", "ore")} înainte.`,
    },
    cancelledClient: {
      subject: (code: string) => `Rezervarea ${code} e anulată`,
      preview: "Ora a fost eliberată.",
      titleByClient: "Rezervarea e anulată.",
      titleByCoach: "Am anulat rezervarea.",
      bodyByClient:
        "Am primit anularea. Dacă vrei să alegi altă oră, pagina de rezervare e deschisă oricând.",
      bodyByCoach:
        "Ne pare rău, dar trebuie să anulăm această lecție. Scrie-ne sau alege altă oră din pagina de rezervare, iar dacă ai plătit în avans, îți returnăm suma.",
      reason: "Motiv",
      bookAgain: "Alege altă oră",
    },
    reminder: {
      subject: (code: string) => `Mâine ai lecție de tenis (${code})`,
      preview: "Un memento scurt.",
      title: "Ne vedem mâine.",
      body: "Un memento scurt pentru lecția de mâine. Dacă plouă tare, te anunțăm din timp.",
    },
    review: {
      subject: "Cum a fost prima lecție?",
      preview: "Două minute, dacă ai chef.",
      title: "Cum a fost prima lecție?",
      body: "Dacă ai două minute, câteva rânduri despre prima lecție îi ajută pe alții să aleagă. Recenzia apare pe site doar dacă îți dai acordul.",
      button: "Lasă o recenzie",
      google: "Sau spune-le și altora pe Google",
    },
    giftRequest: {
      subject: "Am primit cererea pentru cardul cadou",
      preview: "Te sunăm pentru plată, apoi primești cardul.",
      title: "Am primit cererea pentru cardul cadou.",
      body: "Te sunăm pentru plată (la club sau prin transfer). După plată primești pe email cardul, gata de tipărit sau de trimis mai departe.",
    },
    giftCard: {
      subject: (recipient: string) => `Cardul cadou pentru ${recipient}`,
      preview: "Cardul e activ: îl tipărești sau îl trimiți mai departe.",
      title: "Cardul cadou e gata.",
      body: "Mulțumim! Cardul de mai jos e activ. Îl poți tipări sau trimite mai departe; cine îl primește își rezervă lecția pe site, cu codul de pe card, sau la telefon.",
      open: "Vezi și tipărește cardul",
      book: "Rezervă cu acest card",
      code: "Codul",
      value: "Valoarea",
      until: "Valabil până la",
    },
    player: {
      subject: "Te-am înscris: liga și partenerii de joc",
      preview: "Te contactăm după ce verificăm înscrierea.",
      title: "Am primit înscrierea ta.",
      body: "Verificăm înscrierea și te contactăm cât de repede putem: pentru ligă, cu grupa și primele meciuri; pentru partener de joc, cu jucători de nivelul tău. Numele tău apare pe site doar dacă ai cerut asta, și atunci doar prenumele și inițiala.",
    },
    newsletter: {
      subject: "Confirmă abonarea",
      preview: "Un singur clic.",
      title: "Confirmă abonarea.",
      body: "Apasă butonul de mai jos ca să primești un email când avem locuri libere sau noutăți de la academie. Dacă nu tu ai cerut abonarea, ignoră acest mesaj.",
      button: "Confirmă abonarea",
      unsubscribe: "Dezabonare",
    },
    test: {
      subject: "Email de test",
      title: "Emailul funcționează.",
      body: "Dacă citești acest mesaj, setările SMTP sunt corecte și rezervările vor ajunge la clienți.",
    },
  },
  en: {
    greeting: (name: string) => `Hello ${name},`,
    signature: "See you on court,",
    footerNote: "You are receiving this email because you used the form on the website.",
    manageLink: "View or cancel the booking",
    details: {
      code: "Code",
      program: "Programme",
      lesson: "Lesson",
      when: "When",
      where: "Where",
      participants: "Participants",
      child: "Child",
      contact: "Contact",
      message: "Message",
      level: "Declared level",
    },
    requestReceived: {
      subject: (code: string) => `Your booking request is in (${code})`,
      preview: "We will confirm shortly.",
      title: "We have your request.",
      body: "We will check the schedule and confirm by email, usually the same day. Until then, the slot is held for you.",
    },
    confirmed: {
      subject: (code: string) => `Your lesson is confirmed (${code})`,
      preview: "See you on court.",
      title: "Your lesson is confirmed.",
      body: "The calendar file is attached. Bring tennis shoes, water and clothes you can move in; you can borrow a racquet.",
      cancelNote: (hours: number) =>
        `You can cancel free of charge from the link below up to ${hours} hours before.`,
    },
    cancelledClient: {
      subject: (code: string) => `Booking ${code} is cancelled`,
      preview: "The slot has been released.",
      titleByClient: "Your booking is cancelled.",
      titleByCoach: "We have cancelled the booking.",
      bodyByClient:
        "We have received your cancellation. If you would like another time, the booking page is always open.",
      bodyByCoach:
        "We are sorry, but we have to cancel this lesson. Write to us or choose another time on the booking page; if you paid in advance, we will refund you.",
      reason: "Reason",
      bookAgain: "Choose another time",
    },
    reminder: {
      subject: (code: string) => `Tennis lesson tomorrow (${code})`,
      preview: "A short reminder.",
      title: "See you tomorrow.",
      body: "A short reminder about tomorrow's lesson. If it rains heavily, we will let you know in good time.",
    },
    review: {
      subject: "How was your first lesson?",
      preview: "Two minutes, if you feel like it.",
      title: "How was your first lesson?",
      body: "If you have two minutes, a few lines about your first lesson help others choose. The review appears on the site only with your consent.",
      button: "Leave a review",
      google: "Or tell others on Google",
    },
    giftRequest: {
      subject: "We have your gift card request",
      preview: "We will call you about payment, then send the card.",
      title: "We have your gift card request.",
      body: "We will call you about payment (at the club or by bank transfer). Once paid, you receive the card by email, ready to print or pass on.",
    },
    giftCard: {
      subject: (recipient: string) => `The gift card for ${recipient}`,
      preview: "The card is active: print it or pass it on.",
      title: "Your gift card is ready.",
      body: "Thank you! The card below is active. Print it or pass it on; whoever receives it books the lesson on the site with the code on the card, or by phone.",
      open: "View and print the card",
      book: "Book with this card",
      code: "Code",
      value: "Value",
      until: "Valid until",
    },
    player: {
      subject: "You are signed up: league and hitting partners",
      preview: "We will contact you once we have checked your sign-up.",
      title: "We have your sign-up.",
      body: "We will check your sign-up and contact you: for the league, with your group and first matches; for a hitting partner, with players of your level. Your name appears on the site only if you asked for it, and then only your first name and initial.",
    },
    newsletter: {
      subject: "Confirm your subscription",
      preview: "One click.",
      title: "Confirm your subscription.",
      body: "Press the button below to get an email when we have free places or news from the academy. If you did not ask to subscribe, ignore this message.",
      button: "Confirm subscription",
      unsubscribe: "Unsubscribe",
    },
    test: {
      subject: "Test email",
      title: "Email works.",
      body: "If you are reading this, the SMTP settings are correct and bookings will reach your clients.",
    },
  },
} as const;

/** Coach notifications are always in Romanian. */
export const coachStrings = {
  newBooking: {
    subject: (code: string, when: string) => `Rezervare nouă ${code}: ${when}`,
    title: "Rezervare nouă",
    requestNote:
      "Clientul așteaptă confirmarea. Apasă unul dintre butoane; pagina îți cere încă o confirmare.",
    instantNote: "Rezervarea e deja confirmată automat (modul instant).",
    confirm: "Confirmă rezervarea",
    decline: "Refuză rezervarea",
    whatsapp: "Scrie-i pe WhatsApp",
    open: "Deschide în admin",
  },
  cancelled: {
    subject: (code: string) => `Rezervarea ${code} a fost anulată de client`,
    title: "Rezervare anulată de client",
  },
  contact: {
    subject: (name: string) => `Mesaj nou de la ${name}`,
    title: "Mesaj nou din formularul de contact",
    open: "Deschide inboxul",
  },
  court: {
    subject: (name: string) => `Cerere de teren: ${name}`,
    title: "Cerere nouă de închiriere a unui teren",
    open: "Deschide inboxul",
  },
  waitlist: {
    subject: (name: string) => `Listă de așteptare: ${name}`,
    title: "Cerere nouă pe lista de așteptare",
    open: "Deschide lista",
  },
  evaluation: {
    subject: (name: string) => `Cerere de evaluare (academia de juniori): ${name}`,
    title: "Cerere nouă de evaluare pentru academia de juniori",
    open: "Deschide cererile",
  },
  review: {
    subject: (name: string) => `Recenzie nouă de la ${name}`,
    title: "Recenzie nouă, nepublicată",
    open: "Verifică și publică",
  },
  gift: {
    subject: (name: string) => `Cerere de card cadou: ${name}`,
    title: "Cerere nouă de card cadou",
    open: "Deschide cererea",
  },
  player: {
    subject: (name: string) => `Înscriere nouă (ligă / partener): ${name}`,
    title: "Înscriere nouă în liga amatorilor sau pentru partener de joc",
    open: "Verifică înscrierea",
  },
  partner: {
    subject: (name: string) => `Cerere de partener de joc: ${name}`,
    title: "Cineva vrea să joace cu un jucător de pe listă",
    open: "Deschide inboxul",
  },
};
