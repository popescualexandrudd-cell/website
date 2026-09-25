import { describe, expect, it } from "vitest";
import { localAnswer, words, type LocalClub } from "@/lib/assistant/local";

const club: LocalClub = {
  locale: "ro",
  clubName: "Clubul Tenis Elite",
  phone: "0722 501 748",
  whatsapp: true,
  email: "club@example.com",
  address: "Bulevardul Biruinței 19/21, Pantelimon",
  hours: "07:00 – 22:00",
  rentalRates: "Iarna, 60 de lei pe oră.",
  firstSessions: "2 ședințe gratuite pentru copiii care se înscriu la grupele de inițiere",
  groups: [
    { name: "Minitenis · minge roșie", ages: "4–7 ani" },
    { name: "Juniori și seniori · minge galbenă", ages: "de la 11 ani" },
  ],
  coaches: [
    { name: "Vlad Moșteanu", role: "Antrenor principal" },
    { name: "Godniac Ana", role: "Antrenoare" },
  ],
  programs: [{ name: "Inițiere", path: "/programe/initiere" }],
  tournaments: [],
  faqs: [
    {
      question: "Cât costă închirierea unui teren?",
      answer: "Iarna, 60 de lei pe oră pentru orice teren de zgură.",
    },
  ],
  paths: {
    booking: "/rezervare",
    rental: "/inchiriere-teren",
    programs: "/programe",
    signup: "/programe#inscriere",
    pricing: "/preturi",
    team: "/echipa",
    tournaments: "/turnee",
    contact: "/contact",
    giftCard: "/card-cadou",
    league: "/liga-amatori",
    partner: "/partener-de-joc",
    schools: "/scoli-gradinite",
    facilities: "/facilitati",
  },
};

describe("the assistant's local answers", () => {
  it("drops case, diacritics and punctuation", () => {
    expect(words("Câți ani are Ștefan?")).toEqual(["cati", "ani", "are", "stefan"]);
  });

  it("answers from the club's FAQ when the question matches it, without repeating itself", () => {
    const answer = localAnswer("Cât costă închirierea unui teren?", club);
    expect(answer).toBe("Iarna, 60 de lei pe oră pentru orice teren de zgură.");
  });

  it("answers the children's questions with the groups and the two free sessions", () => {
    const answer = localAnswer("De la ce vârstă poate începe fiica mea?", club);
    expect(answer).toContain("Minitenis · minge roșie");
    expect(answer).toContain("2 ședințe gratuite");
    expect(answer).toContain("/programe#inscriere");
  });

  it("recognises camps, the hours, the address and the coaches", () => {
    expect(localAnswer("Aveți tabere de vară?", club)).toContain("tabere de tenis");
    expect(localAnswer("Până la ce oră sunteți deschiși?", club)).toContain("07:00 – 22:00");
    expect(localAnswer("Unde vă găsesc?", club)).toContain("Bulevardul Biruinței 19/21");
    expect(localAnswer("Cine sunt antrenorii?", club)).toContain("**Godniac Ana**, antrenoare");
  });

  it("sends an unknown question to reception, with the phone number", () => {
    const answer = localAnswer("Qwerty xyz?", club);
    expect(answer).toContain("tel:0722501748");
    expect(answer).toContain("recepție");
  });

  it("answers in English on the English site", () => {
    const answer = localAnswer("Where are you?", { ...club, locale: "en" });
    expect(answer).toContain("You will find us at");
  });
});
