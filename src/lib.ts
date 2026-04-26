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

export function aggregateGroceries(planRecipes: Recipe[]): Array<GroceryItem & { uses: number }> {
  const map = new Map<string, GroceryItem & { uses: number }>();

  for (const recipe of planRecipes) {
    for (const item of recipe.groceryItems) {
      const key = `${item.name}__${item.category}`;
      const current = map.get(key);
      if (!current) {
        map.set(key, { ...item, uses: 1 });
      } else {
        map.set(key, {
          ...current,
          uses: current.uses + 1,
          estimatedCost: Number((current.estimatedCost + item.estimatedCost).toFixed(2)),
        });
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
}

export const recipes: Recipe[] = [
  {
    id: "apple-blueberry-yogurt-bowl",
    name: "Apple Blueberry Yogurt Bowl",
    category: "Breakfast",
    source: "Farmer's Fridge style / customized",
    stomachSafe: true,
    lowSpice: true,
    noTomato: true,
    servings: 1,
    servingSize: "1 bowl",
    ingredients: [
      { item: "Greek yogurt", amount: "3/4 cup (170g)" },
      { item: "Blueberries", amount: "1/2 cup (75g)" },
      { item: "Apple, diced", amount: "1/2 small apple (75g)" },
      { item: "Almonds or walnuts", amount: "1 tbsp (10-12g)" },
      { item: "Honey", amount: "1 tsp (5g)" }
    ],
    instructions: [
      "Add the Greek yogurt to a bowl or 24 oz breakfast jar.",
      "Top with the diced apple and blueberries in separate sections so the texture stays clean.",
      "Sprinkle the nuts over the fruit.",
      "Drizzle the honey over the top.",
      "Serve immediately, or refrigerate for up to 24 hours if packed in a jar."
    ],
    macros: { calories: 300, protein: 20, carbs: 35, fat: 10 },
    tags: ["high protein", "breakfast", "stomach-safe", "portion-controlled"],
    container: "24 oz breakfast jar",
    groceryItems: [
      { name: "Greek yogurt", amount: "170g", category: "Protein", estimatedCost: 0.95 },
      { name: "Blueberries", amount: "75g", category: "Produce", estimatedCost: 0.75 },
      { name: "Apple", amount: "1/2 small", category: "Produce", estimatedCost: 0.35 },
      { name: "Almonds", amount: "10g", category: "Pantry", estimatedCost: 0.22 },
      { name: "Honey", amount: "5g", category: "Pantry", estimatedCost: 0.05 }
    ]
  },
  {
    id: "peanut-butter-banana-protein-oats",
    name: "Peanut Butter Banana Protein Oats",
    category: "Breakfast",
    source: "Glow Kitchen breakfast section",
    stomachSafe: true,
    lowSpice: true,
    noTomato: true,
    servings: 1,
    servingSize: "1 bowl",
    ingredients: [
      { item: "Rolled oats", amount: "1/2 cup (40g)" },
      { item: "Milk", amount: "1 cup (240ml)" },
      { item: "Banana, sliced", amount: "1/2 banana" },
      { item: "Peanut butter", amount: "1 tbsp (16g)" },
      { item: "Honey", amount: "1 tsp" },
      { item: "Cinnamon", amount: "Pinch" }
    ],
    instructions: [
      "Add oats and milk to a saucepan.",
      "Cook over medium heat for 5 to 7 minutes, stirring frequently, until thick.",
      "Remove from heat and stir in the peanut butter until melted.",
      "Top with the banana, honey, and cinnamon."
    ],
    macros: { calories: 420, protein: 18, carbs: 55, fat: 14 },
    tags: ["breakfast", "gym fuel", "warm breakfast"],
    groceryItems: [
      { name: "Oats", amount: "40g", category: "Carbs", estimatedCost: 0.18 },
      { name: "Milk", amount: "240ml", category: "Dairy", estimatedCost: 0.22 },
      { name: "Banana", amount: "1/2", category: "Produce", estimatedCost: 0.15 },
      { name: "Peanut butter", amount: "16g", category: "Pantry", estimatedCost: 0.12 },
      { name: "Honey", amount: "1 tsp", category: "Pantry", estimatedCost: 0.05 }
    ]
  },
  {
    id: "chicken-rice-bowl",
    name: "Chicken Rice Bowl",
    category: "Bowls",
    source: "DIG-style modified",
    stomachSafe: true,
    lowSpice: true,
    noTomato: true,
    servings: 1,
    servingSize: "1 meal bowl",
    ingredients: [
      { item: "Cooked rice", amount: "1 cup (200g)" },
      { item: "Cooked chicken thighs", amount: "4 oz (113g)" },
      { item: "Cooked zucchini or spinach", amount: "1/2 cup (75-100g)" },
      { item: "Olive oil", amount: "1 tsp (5g)" },
      { item: "Salt", amount: "Pinch" }
    ],
    instructions: [
      "Add the cooked rice to the bottom of a 24 oz meal container or bowl.",
      "Add the cooked zucchini or spinach as the middle layer.",
      "Top with the cooked chicken.",
      "Drizzle the olive oil over the top and season lightly with salt.",
      "Reheat until hot before serving if meal-prepped."
    ],
    macros: { calories: 500, protein: 35, carbs: 45, fat: 18 },
    tags: ["meal prep", "lunch", "budget", "stomach-safe"],
    container: "24 oz meal container",
    groceryItems: [
      { name: "Rice", amount: "200g cooked", category: "Carbs", estimatedCost: 0.3 },
      { name: "Chicken thighs", amount: "113g", category: "Protein", estimatedCost: 1.05 },
      { name: "Spinach or zucchini", amount: "75-100g", category: "Produce", estimatedCost: 0.55 },
      { name: "Olive oil", amount: "5g", category: "Pantry", estimatedCost: 0.08 }
    ]
  },
  {
    id: "green-goddess-chicken-bowl",
    name: "Green Goddess Chicken Bowl",
    category: "Bowls",
    source: "Sweetgreen-inspired modified",
    stomachSafe: true,
    lowSpice: true,
    noTomato: true,
    servings: 1,
    servingSize: "1 meal bowl",
    ingredients: [
      { item: "Mixed greens", amount: "2 cups (50g)" },
      { item: "Cooked chicken", amount: "4 oz (113g)" },
      { item: "Avocado", amount: "1/2 avocado (70g)" },
      { item: "Cucumber", amount: "1/2 cup (75g)" },
      { item: "Olive oil", amount: "1 tsp" },
      { item: "Salt", amount: "Pinch" }
    ],
    instructions: [
      "Add the mixed greens to a bowl.",
      "Top with the sliced cooked chicken.",
      "Add the avocado and cucumber in separate sections.",
      "Drizzle with olive oil and season lightly with salt."
    ],
    macros: { calories: 450, protein: 32, carbs: 12, fat: 28 },
    tags: ["greens", "low spice", "no tomato", "dinner"],
    groceryItems: [
      { name: "Greens", amount: "50g", category: "Produce", estimatedCost: 0.5 },
      { name: "Chicken", amount: "113g", category: "Protein", estimatedCost: 1.05 },
      { name: "Avocado", amount: "1/2", category: "Produce", estimatedCost: 0.8 },
      { name: "Cucumber", amount: "75g", category: "Produce", estimatedCost: 0.3 },
      { name: "Olive oil", amount: "1 tsp", category: "Pantry", estimatedCost: 0.08 }
    ]
  },
  {
    id: "simple-teriyaki-chicken-bowl",
    name: "Simple Teriyaki Chicken Bowl",
    category: "Bowls",
    source: "Fast-casual bowl section modified",
    stomachSafe: true,
    lowSpice: true,
    noTomato: true,
    servings: 1,
    servingSize: "1 bowl",
    ingredients: [
      { item: "Cooked rice", amount: "1 cup (200g)" },
      { item: "Cooked chicken", amount: "4 oz (113g)" },
      { item: "Steamed broccoli", amount: "1/2 cup" },
      { item: "Low-sodium soy sauce", amount: "1 tbsp" },
      { item: "Honey", amount: "1 tsp" }
    ],
    instructions: [
      "Heat the rice, chicken, and broccoli.",
      "Stir the soy sauce and honey together in a small bowl.",
      "Add rice to a bowl, then top with chicken and broccoli.",
      "Pour the mild teriyaki mixture over the chicken."
    ],
    macros: { calories: 520, protein: 38, carbs: 50, fat: 14 },
    tags: ["lunch", "high protein", "mild"],
    groceryItems: [
      { name: "Rice", amount: "200g cooked", category: "Carbs", estimatedCost: 0.3 },
      { name: "Chicken", amount: "113g", category: "Protein", estimatedCost: 1.05 },
      { name: "Broccoli", amount: "1/2 cup", category: "Produce", estimatedCost: 0.45 },
      { name: "Soy sauce", amount: "1 tbsp", category: "Pantry", estimatedCost: 0.06 },
      { name: "Honey", amount: "1 tsp", category: "Pantry", estimatedCost: 0.05 }
    ]
  },
  {
    id: "egg-avocado-breakfast-bowl",
    name: "Egg + Avocado Breakfast Bowl",
    category: "Breakfast",
    source: "Glow Kitchen / fitness breakfast",
    stomachSafe: true,
    lowSpice: true,
    noTomato: true,
    servings: 1,
    servingSize: "1 bowl",
    ingredients: [
      { item: "Eggs", amount: "2 large" },
      { item: "Avocado", amount: "1/2 avocado (70g)" },
      { item: "Spinach", amount: "1 cup" },
      { item: "Toast", amount: "1 slice (optional)" },
      { item: "Salt and pepper", amount: "To taste" }
    ],
    instructions: [
      "Cook the eggs to your preferred doneness.",
      "Lightly sauté the spinach for 1 to 2 minutes, or serve fresh if preferred.",
      "Slice the avocado.",
      "Assemble the bowl with spinach, eggs, and avocado.",
      "Serve with toast if using."
    ],
    macros: { calories: 400, protein: 22, carbs: 14, fat: 28 },
    tags: ["breakfast", "savory", "stomach-safe"],
    groceryItems: [
      { name: "Eggs", amount: "2", category: "Protein", estimatedCost: 0.5 },
      { name: "Avocado", amount: "1/2", category: "Produce", estimatedCost: 0.8 },
      { name: "Spinach", amount: "1 cup", category: "Produce", estimatedCost: 0.35 },
      { name: "Bread", amount: "1 slice", category: "Carbs", estimatedCost: 0.1 }
    ]
  },
  {
    id: "protein-yogurt-dessert",
    name: "Protein Yogurt Dessert",
    category: "Snacks",
    source: "Cafe / fitness hybrid",
    stomachSafe: true,
    lowSpice: true,
    noTomato: true,
    servings: 1,
    servingSize: "1 snack bowl",
    ingredients: [
      { item: "Greek yogurt", amount: "1/2 cup (120g)" },
      { item: "Protein powder", amount: "1 scoop (30g)" },
      { item: "Cocoa powder", amount: "1 tsp" }
    ],
    instructions: [
      "Add the yogurt, protein powder, and cocoa powder to a bowl.",
      "Whisk until smooth.",
      "Chill for 10 minutes for a thicker texture if desired."
    ],
    macros: { calories: 200, protein: 25, carbs: 8, fat: 3 },
    tags: ["snack", "high protein", "dessert"],
    groceryItems: [
      { name: "Greek yogurt", amount: "120g", category: "Protein", estimatedCost: 0.68 },
      { name: "Protein powder", amount: "30g", category: "Supplements", estimatedCost: 1.1 },
      { name: "Cocoa powder", amount: "1 tsp", category: "Pantry", estimatedCost: 0.05 }
    ]
  },
  {
    id: "almond-butter-banana-snack",
    name: "Almond Butter Banana Snack",
    category: "Snacks",
    source: "Snack system",
    stomachSafe: true,
    lowSpice: true,
    noTomato: true,
    servings: 1,
    servingSize: "1 snack",
    ingredients: [
      { item: "Banana", amount: "1 medium" },
      { item: "Almond butter", amount: "1 tbsp (16g)" }
    ],
    instructions: [
      "Slice the banana lengthwise or into coins.",
      "Measure exactly 1 tablespoon of almond butter.",
      "Serve the almond butter on the side or spread lightly over the banana."
    ],
    macros: { calories: 200, protein: 4, carbs: 28, fat: 9 },
    tags: ["snack", "portable", "stomach-safe"],
    groceryItems: [
      { name: "Banana", amount: "1", category: "Produce", estimatedCost: 0.3 },
      { name: "Almond butter", amount: "16g", category: "Pantry", estimatedCost: 0.28 }
    ]
  },
  {
    id: "daily-coffee",
    name: "Daily Coffee",
    category: "Drinks",
    source: "Coffee routine customized",
    stomachSafe: true,
    lowSpice: true,
    noTomato: true,
    servings: 1,
    servingSize: "1 mug",
    ingredients: [
      { item: "Coffee", amount: "1 cup" },
      { item: "Milk", amount: "2 tbsp" },
      { item: "Honey or maple syrup", amount: "1 tsp" }
    ],
    instructions: [
      "Brew 1 cup of coffee.",
      "Add 2 tablespoons of milk.",
      "Stir in 1 teaspoon of honey or maple syrup.",
      "Serve hot."
    ],
    macros: { calories: 40, protein: 1, carbs: 7, fat: 1 },
    tags: ["drink", "daily", "budget"],
    groceryItems: [
      { name: "Coffee", amount: "1 serving", category: "Pantry", estimatedCost: 0.25 },
      { name: "Milk", amount: "2 tbsp", category: "Dairy", estimatedCost: 0.05 },
      { name: "Honey", amount: "1 tsp", category: "Pantry", estimatedCost: 0.05 }
    ]
  }
];

export const defaultPlan: Record<string, Record<string, string>> = {
  Monday: { breakfast: "apple-blueberry-yogurt-bowl", lunch: "chicken-rice-bowl", snack: "almond-butter-banana-snack", dinner: "green-goddess-chicken-bowl", extra: "protein-yogurt-dessert" },
  Tuesday: { breakfast: "peanut-butter-banana-protein-oats", lunch: "simple-teriyaki-chicken-bowl", snack: "daily-coffee", dinner: "chicken-rice-bowl", extra: "protein-yogurt-dessert" },
  Wednesday: { breakfast: "apple-blueberry-yogurt-bowl", lunch: "green-goddess-chicken-bowl", snack: "almond-butter-banana-snack", dinner: "chicken-rice-bowl", extra: "daily-coffee" },
  Thursday: { breakfast: "egg-avocado-breakfast-bowl", lunch: "simple-teriyaki-chicken-bowl", snack: "daily-coffee", dinner: "green-goddess-chicken-bowl", extra: "protein-yogurt-dessert" },
  Friday: { breakfast: "apple-blueberry-yogurt-bowl", lunch: "chicken-rice-bowl", snack: "almond-butter-banana-snack", dinner: "simple-teriyaki-chicken-bowl", extra: "daily-coffee" },
  Saturday: { breakfast: "peanut-butter-banana-protein-oats", lunch: "green-goddess-chicken-bowl", snack: "protein-yogurt-dessert", dinner: "chicken-rice-bowl", extra: "daily-coffee" },
  Sunday: { breakfast: "egg-avocado-breakfast-bowl", lunch: "chicken-rice-bowl", snack: "almond-butter-banana-snack", dinner: "green-goddess-chicken-bowl", extra: "daily-coffee" }
};