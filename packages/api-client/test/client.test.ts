import { test } from "node:test";
import assert from "node:assert/strict";
import { readCookie } from "../src/index.ts";

test("readCookie finds the CSRF token among other cookies", () => {
  assert.equal(readCookie("csrftoken", "a=1; csrftoken=abc%3D; sessionid=x"), "abc=");
  assert.equal(readCookie("csrftoken", "sessionid=x"), undefined);
});
