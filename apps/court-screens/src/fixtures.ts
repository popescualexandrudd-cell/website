/** Test data: the example of §8.5 (demo names), as the API sends it. */
import type { CourtState, ScreenState, Session } from "./api";

export const SERVER_TIME = "2027-04-05T11:43:00Z"; // 14:43 in Bucharest: 47 minutes left

export const match: Session = {
  booking_id: "b-1",
  starts_at: "2027-04-05T11:00:00Z",
  ends_at: "2027-04-05T12:30:00Z",
  minutes: 90,
  session_type: "official_match",
  match_of_the_day: true,
  teams: [
    [
      { name: "Popescu Alexandru Daniel", tier: "diamond", division: "II", lp: 67, level: 5.2, position: 1 },
      { name: "Moșteanu Rareș", tier: "diamond", division: "III", lp: 12, level: 5.0, position: 2 },
    ],
    [
      { name: "Jucător 3", tier: "platinum", division: "I", lp: 88, level: 4.8, position: 4 },
      { name: "Jucător 4", tier: "diamond", division: "IV", lp: 40, level: 4.9, position: 3 },
    ],
  ],
};

export const court: CourtState = {
  id: "c-4",
  name: "Teren 4",
  current: match,
  next: { starts_at: "2027-04-05T12:30:00Z", session_type: "training" },
};

const league: ScreenState["league"] = {
  doubles: [
    { position: 1, names: ["Popescu Alexandru Daniel"], tier: "diamond", division: "II", lp: 67, level: 5.2 },
    { position: 2, names: ["Moșteanu Rareș"], tier: "diamond", division: "III", lp: 12, level: 5.0 },
  ],
  singles: [],
  pairs: [
    { position: 1, names: ["Popescu Alexandru Daniel", "Moșteanu Rareș"], tier: "gold", division: "I", lp: 5, level: 5.1 },
  ],
  kings: [{ position: 1, names: ["Regele Junglei"], tier: "master", division: "", lp: 310, level: 6.4 }],
  match_of_the_day: match,
  match_of_the_day_court: "Teren 4",
};

export const QR = '<svg viewBox="0 0 10 10"><path stroke="currentColor" d="M0 0h1"/></svg>';

export const courtState: ScreenState = {
  kind: "court",
  location_name: "Jungle Padel",
  server_time: SERVER_TIME,
  league,
  events: [{ title: "Cupa Junglei", starts_at: "2027-04-10T07:00:00Z" }],
  announcements: [
    { ro: "Turneu sâmbătă", en: "Saturday tournament" },
    { ro: "Cafeaua zilei", en: "Coffee of the day" },
  ],
  court,
  courts: [],
  cafe_ready: [],
  qr_url: "https://junglepadel.ro/ro/liga",
  qr_svg: QR,
};

export const lobbyState: ScreenState = {
  ...courtState,
  kind: "lobby",
  court: null,
  courts: [{ id: "c-1", name: "Teren 1", current: null, next: null }, court],
  cafe_ready: [7, 9],
};
