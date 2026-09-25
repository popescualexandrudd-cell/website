import { describe, expect, it } from "vitest";
import { formatKnowledge, known, type KnowledgeInput } from "@/lib/assistant/knowledge";
import { assistantInstructions, parseAssistantRequest } from "@/lib/assistant/prompt";
import { parseAnswer, parseInline, safeLink } from "@/lib/assistant/render";

const PATHS = {
  home: "/",
  programs: "/programe",
  academy: "/academie",
  evaluation: "/academie#evaluare",
  waitlist: "/lista-asteptare",
  team: "/echipa",
  pricing: "/preturi",
  booking: "/rezervare",
  facilities: "/facilitati",
  gallery: "/galerie",
  faq: "/intrebari",
  contact: "/contact",
  tips: "/sfaturi",
  privacy: "/confidentialitate",
  rental: "/inchiriere-teren",
  tournaments: "/turnee",
  schools: "/scoli-gradinite",
};

function input(overrides: Partial<KnowledgeInput> = {}): KnowledgeInput {
  return {
    locale: "ro",
    settings: {
      brandName: "Elite Tenis Club",
      tagline: "Academie de tenis",
      seoDescription: "Lecții de tenis pentru copii și adulți.",
      phone: "0722 000 000",
      whatsapp: "",
      email: "[DE COMPLETAT]",
      instagramUrl: "https://www.instagram.com/club/",
      facebookUrl: null,
      tiktokUrl: null,
      bookingMode: "CERERE",
      freeCancelHours: 24,
      firstLessonText: "Vino cu 10 minute mai devreme.",
      paymentMethods: ["Numerar", "Card"],
      workingHours: [{ label: "Luni–Vineri", hours: "08:00–22:00" }],
      currency: "RON",
      minNoticeHours: 12,
      horizonDays: 60,
    },
    locations: [],
    facilities: [],
    programs: [],
    lessons: [
      {
        id: "l1",
        slug: "individuala",
        name: "Lecție individuală",
        summary: "Doar tu și antrenorul.",
        minParticipants: 1,
        maxParticipants: 1,
        durations: [60, 90],
        hourlyRate: "200",
        priceUnit: "LECTIE",
        bookableOnline: true,
      },
      {
        id: "l2",
        slug: "grup",
        name: "Lecție în grup",
        summary: "[DE COMPLETAT]",
        minParticipants: 3,
        maxParticipants: 6,
        durations: [60],
        hourlyRate: null,
        priceUnit: "PERSOANA",
        bookableOnline: false,
      },
    ],
    packages: [],
    groups: [
      {
        id: "g1",
        slug: "minge-rosie",
        name: "Grupa minge roșie",
        stage: "ROSU",
        ageMin: 4,
        ageMax: 7,
        level: "INCEPATOR",
        summary: "Primii pași.",
        focusPoints: ["coordonare", "[DE COMPLETAT]"],
        sessionsPerWeek: 2,
        sessionMinutes: 60,
        schedule: "[DE COMPLETAT]",
        monthlyFee: null,
        maxPlayers: 8,
        image: null,
        imageAlt: "",
        program: null,
      },
    ],
    coaches: [],
    faqs: [
      {
        id: "f1",
        question: "Ce echipament îmi trebuie?",
        answer: "Doar pantofi de tenis.",
        category: "ECHIPAMENT",
        programId: null,
      },
    ],
    posts: [],
    paths: PATHS,
    ...overrides,
  };
}

describe("assistant knowledge", () => {
  it("treats empty and [DE COMPLETAT] values as unknown", () => {
    expect(known("  ")).toBeNull();
    expect(known("Taxa: [DE COMPLETAT]")).toBeNull();
    expect(known(" 350 lei ")).toBe("350 lei");
  });

  it("lists prices per length, groups, rules and FAQ from the club's content", () => {
    const text = formatKnowledge(input());
    expect(text).toContain("# Elite Tenis Club");
    expect(text).toContain("Tarif: 200 lei pe oră");
    expect(text).toContain("60 min: 200 lei · 1 h 30 min: 300 lei");
    expect(text).toContain("Rezervare: /rezervare?tip=individuala");
    expect(text).toContain("Etapa: minge roșie; vârste: 4–7 ani");
    expect(text).toContain("Antrenamente: 2 pe săptămână × 60 de minute");
    expect(text).toContain("Anulare fără cost cu cel puțin 24 de ore înainte");
    expect(text).toContain("cu cel puțin 12 ore înainte și cel mult 60 de zile în avans");
    expect(text).toContain("Întrebare: Ce echipament îmi trebuie?");
    expect(text).toContain("Cerere de evaluare pentru copii: /academie#evaluare");
  });

  it("marks what the club has not filled in instead of inventing it", () => {
    const text = formatKnowledge(input());
    expect(text).toContain("Email: (nepublicat încă)");
    expect(text).toContain("Taxa lunară: (nepublicat încă)");
    expect(text).toContain("Program: la cerere");
    expect(text).toContain("Tarif: (nepublicat încă)");
    expect(text).not.toContain("[DE COMPLETAT]");
  });

  it("writes the labels in English on the English site", () => {
    const text = formatKnowledge(
      input({ locale: "en", paths: { ...PATHS, booking: "/en/booking" } }),
    );
    expect(text).toContain("Rate: RON 200 per hour");
    expect(text).toContain("Stage: red ball; ages: 4–7 years");
    expect(text).toContain("Online booking: /en/booking");
  });
});

describe("assistant requests", () => {
  const question = (content: string) => ({ role: "user", content });

  it("accepts a conversation that ends with the visitor's question", () => {
    const parsed = parseAssistantRequest({
      locale: "ro",
      messages: [question("Salut"), { role: "assistant", content: "Bună!" }, question("Preț?")],
    });
    expect(parsed?.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("rejects empty, too long or badly formed questions", () => {
    expect(parseAssistantRequest({ locale: "ro", messages: [question("   ")] })).toBeNull();
    expect(
      parseAssistantRequest({ locale: "ro", messages: [question("x".repeat(601))] }),
    ).toBeNull();
    expect(
      parseAssistantRequest({ locale: "ro", messages: [{ role: "assistant", content: "Hi" }] }),
    ).toBeNull();
    expect(parseAssistantRequest({ locale: "fr", messages: [question("Salut")] })).toBeNull();
    expect(
      parseAssistantRequest({ locale: "ro", messages: [{ role: "system", content: "x" }] }),
    ).toBeNull();
  });

  it("keeps only the recent history, starting with a question, with roles alternating", () => {
    const long = Array.from({ length: 30 }, (_, i) =>
      i % 2 === 0 ? question(`q${i}`) : { role: "assistant", content: `a${i}` },
    );
    long.push(question("again"));
    const parsed = parseAssistantRequest({ locale: "ro", messages: long });
    expect(parsed?.messages.length).toBeLessThanOrEqual(12);
    expect(parsed?.messages[0]?.role).toBe("user");
    const merged = parseAssistantRequest({
      locale: "ro",
      messages: [question("unu"), question("doi")],
    });
    expect(merged?.messages).toEqual([{ role: "user", content: "unu\n\ndoi" }]);
  });

  it("tells the model to answer only from the club's information and where to send people", () => {
    const text = assistantInstructions({
      clubName: "Elite Tenis Club",
      locale: "ro",
      evaluationPath: "/academie#evaluare",
      bookingPath: "/rezervare",
      contactPath: "/contact",
    });
    expect(text).toContain("Answer only from the club information");
    expect(text).toContain("/academie#evaluare");
    expect(text).toContain("Write in Romanian");
    expect(text).toContain("comma below");
  });
});

describe("assistant answers", () => {
  it("renders paragraphs, lists, bold and safe links only", () => {
    const blocks = parseAnswer(
      "Avem **4 grupe**.\nVezi [academia](/academie).\n\n- roșie\n- verde\n\n[rău](javascript:void)",
    );
    expect(blocks[0]).toEqual({
      kind: "p",
      lines: [
        [
          { kind: "text", text: "Avem " },
          { kind: "bold", text: "4 grupe" },
          { kind: "text", text: "." },
        ],
        [
          { kind: "text", text: "Vezi " },
          { kind: "link", text: "academia", href: "/academie", internal: true },
          { kind: "text", text: "." },
        ],
      ],
    });
    expect(blocks[1]).toEqual({
      kind: "ul",
      items: [[{ kind: "text", text: "roșie" }], [{ kind: "text", text: "verde" }]],
    });
    expect(blocks[2]).toEqual({ kind: "p", lines: [[{ kind: "text", text: "rău" }]] });
  });

  it("allows site paths, phone, email and https links", () => {
    expect(safeLink("/rezervare?tip=individuala")).toEqual({
      href: "/rezervare?tip=individuala",
      internal: true,
    });
    expect(safeLink("//evil.example")).toBeNull();
    expect(safeLink("tel:+40722000000")?.internal).toBe(false);
    expect(safeLink("https://www.instagram.com/club/")?.internal).toBe(false);
    expect(safeLink("http://example.com")).toBeNull();
    expect(parseInline("Sună la 0722 000 000")).toEqual([
      { kind: "text", text: "Sună la 0722 000 000" },
    ]);
  });
});
