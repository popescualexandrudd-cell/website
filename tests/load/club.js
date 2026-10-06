// The club's busiest evening, simulated (§13.3, ADR-0021, Stage 15): visitors on the website
// (pages and the API they call: the league, the free courts, the classes) and the screens and
// kiosks that refresh what they show. Run against the whole stack started as on the server:
//   k6 run tests/load/club.js                                   # 500 visitors, 2 minutes
//   VISITORS=50 HOLD=30s k6 run tests/load/club.js              # the short run of CI
//   DOMAIN=<domain> RESOLVE=<server IP> k6 run tests/load/club.js
// Thresholds (the test fails above them): under 1% failed requests, 95% of API answers under
// 800 ms and 95% of pages under 1.5 s.
import http from "k6/http";
import { check, sleep } from "k6";

const DOMAIN = __ENV.DOMAIN || "club.test";
const RESOLVE = __ENV.RESOLVE || "127.0.0.1";
const VISITORS = Number(__ENV.VISITORS || 500);
const SCREENS = Number(__ENV.SCREENS || 12);
const HOLD = __ENV.HOLD || "2m";
const LOCATION = __ENV.LOCATION_SLUG || "jungle-padel";
const SITE = `https://www.${DOMAIN}`;
const API = `https://api.${DOMAIN}/api/v1`;

export const options = {
  insecureSkipTLSVerify: true, // the test certificates; never on the real domain's own check
  hosts: { [`www.${DOMAIN}`]: RESOLVE, [`api.${DOMAIN}`]: RESOLVE },
  scenarios: {
    visitors: {
      executor: "ramping-vus",
      exec: "visitor",
      stages: [
        { duration: "30s", target: VISITORS },
        { duration: HOLD, target: VISITORS },
        { duration: "10s", target: 0 },
      ],
    },
    screens: { executor: "constant-vus", exec: "screen", vus: SCREENS, duration: HOLD },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:api}": ["p(95)<800"],
    "http_req_duration{kind:page}": ["p(95)<1500"],
  },
};

const PAGES = ["/ro", "/en", "/ro/liga", "/ro/padel", "/ro/rezervari", "/ro/pilates", "/ro/evenimente", "/ro/cafenea"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function api(path) {
  const response = http.get(`${API}${path}`, { tags: { kind: "api" } });
  check(response, { "api 200": (r) => r.status === 200 });
}

export function visitor() {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const response = http.get(`${SITE}${page}`, { tags: { kind: "page" } });
  check(response, { "page 200": (r) => r.status === 200 });
  api(`/league/standings?location=${LOCATION}`);
  api(`/bookings/availability?location=${LOCATION}&day=${today()}`);
  if (Math.random() < 0.3) api(`/classes?location=${LOCATION}`);
  if (Math.random() < 0.3) api(`/events/calendar?location=${LOCATION}`);
  sleep(1 + Math.random() * 2);
}

// A screen or a kiosk refreshes its data about every 10 seconds (the real ones do it on
// "changed" and every minute; this is the heavier case).
export function screen() {
  api(`/league/results?location=${LOCATION}`);
  api(`/bookings/availability?location=${LOCATION}&day=${today()}`);
  sleep(10);
}
