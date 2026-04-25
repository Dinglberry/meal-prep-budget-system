import { describe, expect, it } from "vitest";
import { aggregateGroceries, capitalize, currency, recipes, sumMacros } from "./lib";

describe("lib helpers", () => {
  it("capitalizes labels", () => {
    expect(capitalize("breakfast")).toBe("Breakfast");
    expect(capitalize("")).toBe("");
  });

  it("formats currency", () => {
    expect(currency(54.9)).toBe("$54.90");
  });

  it("sums macros", () => {
    expect(sumMacros([recipes[0], recipes[2]])).toEqual({
      calories: 800,
      protein: 55,
      carbs: 80,
      fat: 28,
    });
  });

  it("aggregates duplicate grocery items", () => {
    const groceries = aggregateGroceries([recipes[0], recipes[0]]);
    const yogurt = groceries.find((item) => item.name === "Greek yogurt");
    expect(yogurt?.uses).toBe(2);
    expect(yogurt?.estimatedCost).toBe(1.9);
  });
});