import { describe, expect, it } from "vitest";
import { type CafeCategory, cafeMenu, hasIndicativePrices, nameOf } from "./cafe";

const answer = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

const coffee: CafeCategory = {
  id: "c1",
  name_ro: "Cafea",
  name_en: "Coffee",
  products: [{ id: "p1", name_ro: "Espresso", name_en: "Espresso", price: 1200, marker: "confirmed" }],
};

describe("the café menu (§9.2.13, R-112)", () => {
  it("reads the menu from the API, or says it could not", async () => {
    expect(await cafeMenu(answer([coffee]))).toEqual([coffee]);
    expect(await cafeMenu(answer([]))).toEqual([]);
    expect(await cafeMenu(answer({ error: {} }))).toBeNull();
    expect(await cafeMenu(answer([], false))).toBeNull();
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await cafeMenu(down)).toBeNull();
  });

  it("names things in the page's language (R-140)", () => {
    expect(nameOf(coffee, "ro")).toBe("Cafea");
    expect(nameOf(coffee, "en")).toBe("Coffee");
    expect(nameOf({ name_ro: "Covrig", name_en: "" }, "en")).toBe("Covrig");
  });

  it("marks the prices as indicative while any is still to be set (Q21)", () => {
    expect(hasIndicativePrices([coffee])).toBe(false);
    const water = { id: "p2", name_ro: "Apă", name_en: "Water", price: 800, marker: "to_set" };
    expect(hasIndicativePrices([{ ...coffee, products: [...coffee.products, water] }])).toBe(true);
    expect(hasIndicativePrices([])).toBe(false);
  });
});
