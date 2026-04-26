export type GroceryItem = {
  name: string;
  amount: string;
  category: string;
  estimatedCost: number;
};

export type Recipe = {
  id: string;
  name: string;
  category: string;
  source: string;
  stomachSafe: boolean;
  lowSpice: boolean;
  noTomato: boolean;
  servings: number;
  servingSize: string;
  ingredients: { item: string; amount: string }[];
  instructions: string[];
  macros: { calories: number; protein: number; carbs: number; fat: number };
  tags: string[];
  container?: string;
  groceryItems: GroceryItem[];
};

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

// Fix: explicit slot literal union so TypeScript catches mismatches
export type SlotKey = "breakfast" | "lunch" | "snack" | "dinner" | "extra";

export type DayPlan = Record<SlotKey, string>;
export type WeekPlan = Record<string, DayPlan>;

// Fix: typed sentinel so "all-categories" can never clash with a real category name
export const ALL_CATEGORIES = "all-categories" as const;
export type CategoryFilter = typeof ALL_CATEGORIES | string;

export function capitalize(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function sumMacros(recipeList: Recipe[]): MacroTotals {
  return recipeList.reduce<MacroTotals>(
    (acc, recipe) => ({
      calories: acc.calories + recipe.macros.calories,
      protein: acc.protein + recipe.macros.protein,
      carbs: acc.carbs + recipe.macros.carbs,
      fat: acc.fat + recipe.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function aggregateGroceries(
  planRecipes: Recipe[]
): Array<GroceryItem & { uses: number }> {
  // Fix: accumulate costs as integer cents to avoid floating-point drift,
  // then convert back to dollars only at the end.
  const map = new Map<
    string,
    GroceryItem & { uses: number; costCents: number }
  >();

  for (const recipe of planRecipes) {
    for (const item of recipe.groceryItems) {
      const key = `${item.name}__${item.category}`;
      const current = map.get(key);
      const itemCents = Math.round(item.estimatedCost * 100);
      if (!current) {
        map.set(key, { ...item, uses: 1, costCents: itemCents });
      } else {
        map.set(key, {
          ...current,
          uses: current.uses + 1,
          costCents: current.costCents + itemCents,
        });
      }
    }
  }

  return Array.from(map.values())
    .map(({ costCents, ...rest }) => ({
      ...rest,
      estimatedCost: costCents / 100,
    }))
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );
}
