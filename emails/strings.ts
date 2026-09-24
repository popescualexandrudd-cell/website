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
      preview: "Îți confirm în cel mai scurt timp.",
      title: "Am primit cererea ta.",
      body: "Verific programul și îți confirm pe email, de obicei în aceeași zi. Până atunci, ora rămâne rezervată pentru tine.",
    },
    confirmed: {
      subject: (code: string) => `Lecția e confirmată (${code})`,
      preview: "Ne vedem pe teren.",
      title: "Lecția e confirmată.",
      body: "Am atașat fișierul pentru calendar. Adu pantofi de tenis, apă și haine în care te miști ușor; racheta o poți împrumuta.",
      cancelNote: (hours: number) =>
        `Poți anula gratuit din linkul de mai jos până cu ${hours} de ore înainte.`,
    },
    cancelledClient: {
      subject: (code: string) => `Rezervarea ${code} e anulată`,
      preview: "Ora a fost eliberată.",
      titleByClient: "Rezervarea e anulată.",
      titleByCoach: "Am anulat rezervarea.",
      bodyByClient:
        "Am primit anularea. Dacă vrei să alegi altă oră, pagina de rezervare e deschisă oricând.",
      bodyByCoach:
        "Îmi pare rău, dar trebuie să anulez această lecție. Scrie-mi sau alege altă oră din pagina de rezervare, iar dacă ai plătit în avans, îți returnez suma.",
      reason: "Motiv",
      bookAgain: "Alege altă oră",
    },
    reminder: {
      subject: (code: string) => `Mâine ai lecție de tenis (${code})`,
      preview: "Un memento scurt.",
      title: "Ne vedem mâine.",
      body: "Un memento scurt pentru lecția de mâine. Dacă plouă tare, te anunț eu din timp.",
    },
    review: {
      subject: "Cum a fost prima lecție?",
      preview: "Două minute, dacă ai chef.",
      title: "Cum a fost prima lecție?",
      body: "Dacă ai două minute, câteva rânduri despre prima lecție îi ajută pe alții să aleagă. Recenzia apare pe site doar dacă îți dai acordul.",
      button: "Lasă o recenzie",
    },
    newsletter: {
      subject: "Confirmă abonarea",
      preview: "Un singur clic.",
      title: "Confirmă abonarea.",
      body: "Apasă butonul de mai jos ca să primești un email când am locuri libere sau noutăți despre lecții. Dacă nu tu ai cerut abonarea, ignoră acest mesaj.",
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
      preview: "I will confirm shortly.",
      title: "I have your request.",
      body: "I will check the schedule and confirm by email, usually the same day. Until then, the slot is held for you.",
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
      titleByCoach: "I have cancelled the booking.",
      bodyByClient:
        "I have received your cancellation. If you would like another time, the booking page is always open.",
      bodyByCoach:
        "I am sorry, but I have to cancel this lesson. Write to me or choose another time on the booking page; if you paid in advance, I will refund you.",
      reason: "Reason",
      bookAgain: "Choose another time",
    },
    reminder: {
      subject: (code: string) => `Tennis lesson tomorrow (${code})`,
      preview: "A short reminder.",
      title: "See you tomorrow.",
      body: "A short reminder about tomorrow's lesson. If it rains heavily, I will let you know in good time.",
    },
    review: {
      subject: "How was your first lesson?",
      preview: "Two minutes, if you feel like it.",
      title: "How was your first lesson?",
      body: "If you have two minutes, a few lines about your first lesson help others choose. The review appears on the site only with your consent.",
      button: "Leave a review",
    },
    newsletter: {
      subject: "Confirm your subscription",
      preview: "One click.",
      title: "Confirm your subscription.",
      body: "Press the button below to get an email when I have free places or news about lessons. If you did not ask to subscribe, ignore this message.",
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
  waitlist: {
    subject: (name: string) => `Listă de așteptare: ${name}`,
    title: "Cerere nouă pe lista de așteptare",
    open: "Deschide lista",
  },
  review: {
    subject: (name: string) => `Recenzie nouă de la ${name}`,
    title: "Recenzie nouă, nepublicată",
    open: "Verifică și publică",
  },
};
