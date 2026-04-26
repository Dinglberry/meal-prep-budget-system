import { describe, expect, it } from "vitest";
import { aggregateGroceries, capitalize, currency, ALL_CATEGORIES, sumMacros } from "./lib";
import { recipes } from "./data/recipes";

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

  it("ALL_CATEGORIES sentinel does not match any real recipe category", () => {
    const realCategories = Array.from(new Set(recipes.map((r) => r.category)));
    expect(realCategories).not.toContain(ALL_CATEGORIES);
  });

  it("grocery cost aggregation avoids floating-point drift", () => {
    // Use a recipe with a cost that would drift with naive addition
    const groceries = aggregateGroceries([recipes[0], recipes[0], recipes[0]]);
    const yogurt = groceries.find((item) => item.name === "Greek yogurt");
    // 0.95 * 3 — floating point naive would give 2.8499999... 
    expect(yogurt?.estimatedCost).toBe(2.85);
  });
});
