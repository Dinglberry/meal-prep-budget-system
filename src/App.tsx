import React, { useMemo, useState } from "react";
import {
  ALL_CATEGORIES,
  aggregateGroceries,
  capitalize,
  currency,
  sumMacros,
  type Recipe,
  type SlotKey,
  type WeekPlan,
} from "./lib";
import { recipes as initialRecipes } from "./data/recipes";
import { defaultPlan } from "./data/plan";

const WEEKLY_BUDGET_DEFAULT = 50;
const MAX_RECIPES = 50;
type DayKey = keyof WeekPlan;
type Screen = "home" | "recipes" | "planner" | "budget" | "insights";
type GroceryTab = "All" | "Pantry" | "Fridge" | "Frozen" | "List";

const HERO_SINGLES = [
  "collage1_character_2_4.png","collage1_character_3_2.png","collage1_character_3_4.png",
  "collage1_character_4_1.png","collage1_character_4_2.png","collage1_character_4_5.png",
  "collage2_character_1_1.png","collage2_character_1_4.png","collage2_character_3_1.png",
  "collage2_character_3_2.png","collage2_character_3_3.png","collage2_character_4_3.png",
  "collage3_character_1_2.png","collage3_character_1_3.png","collage3_character_1_4.png",
  "collage3_character_1_5.png","collage3_character_2_1.png","collage3_character_2_2.png",
  "collage3_character_2_3.png","collage3_character_2_4.png","collage3_character_2_5.png",
  "collage3_character_3_1.png","collage3_character_3_2.png","collage3_character_3_3.png",
  "collage3_character_3_4.png","collage3_character_3_5.png","collage3_character_4_1.png",
  "collage3_character_4_2.png","collage3_character_4_3.png","collage3_character_4_4.png",
  "collage3_character_4_5.png","collage9_character_4_3.png",
];

// Pick a random hero image once on load
const HERO_IMG = HERO_SINGLES[Math.floor(Math.random() * HERO_SINGLES.length)];

const GROCERY_CATEGORIES = [
  { id: "Fruits & Vegetables", emoji: "🥬", storage: ["Fridge","Pantry"], color: "#f0f5ec" },
  { id: "Proteins",            emoji: "🥩", storage: ["Fridge","Frozen"], color: "#fdf0ec" },
  { id: "Grains & Pasta",      emoji: "🌾", storage: ["Pantry"],          color: "#fdf8ec" },
  { id: "Dairy & Eggs",        emoji: "🥛", storage: ["Fridge"],          color: "#ecf3fd" },
  { id: "Snacks & Treats",     emoji: "🍫", storage: ["Pantry"],          color: "#fdf0f8" },
  { id: "Beverages",           emoji: "🫙", storage: ["Pantry","Fridge"], color: "#ecfdf5" },
  { id: "Pantry Essentials",   emoji: "🫒", storage: ["Pantry"],          color: "#fdf8ec" },
  { id: "Custom",              emoji: "📦", storage: ["All"],             color: "#f5f0fd" },
];

const INGREDIENT_CATEGORY_MAP: Record<string, string> = {
  "greek yogurt": "Dairy & Eggs", "milk": "Dairy & Eggs", "cheese": "Dairy & Eggs",
  "egg": "Dairy & Eggs", "butter": "Dairy & Eggs",
  "chicken": "Proteins", "tuna": "Proteins", "salmon": "Proteins",
  "turkey": "Proteins", "beef": "Proteins", "tofu": "Proteins",
  "rice": "Grains & Pasta", "oats": "Grains & Pasta", "bread": "Grains & Pasta",
  "pasta": "Grains & Pasta", "quinoa": "Grains & Pasta", "flour": "Grains & Pasta",
  "apple": "Fruits & Vegetables", "banana": "Fruits & Vegetables", "blueberr": "Fruits & Vegetables",
  "spinach": "Fruits & Vegetables", "broccoli": "Fruits & Vegetables", "zucchini": "Fruits & Vegetables",
  "avocado": "Fruits & Vegetables", "cucumber": "Fruits & Vegetables", "tomato": "Fruits & Vegetables",
  "almond": "Snacks & Treats", "walnut": "Snacks & Treats", "peanut": "Snacks & Treats",
  "honey": "Pantry Essentials", "olive oil": "Pantry Essentials", "soy sauce": "Pantry Essentials",
  "coffee": "Beverages", "tea": "Beverages",
};

function getIngredientCategory(item: string): string {
  const lower = item.toLowerCase();
  for (const [key, cat] of Object.entries(INGREDIENT_CATEGORY_MAP)) {
    if (lower.includes(key)) return cat;
  }
  return "Custom";
}

function getRecipeById(id: string, recipeList: Recipe[]) {
  return recipeList.find((r) => r.id === id) ?? null;
}

const EMPTY_RECIPE: Omit<Recipe, "id"> = {
  name: "", category: "Bowls", source: "", stomachSafe: true, lowSpice: true, noTomato: true,
  servings: 1, servingSize: "1 serving",
  ingredients: [{ item: "", amount: "" }],
  instructions: [""],
  macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  tags: [], groceryItems: [],
};

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
}

type EditableGrocery = {
  name: string; category: string; storage: string;
  estimatedCost: number; priceText?: string;
  fromRecipe?: string; checked?: boolean;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [recipePasteText, setRecipePasteText] = useState("");
  const [query, setQuery] = useState("");
  const [recipeCategory, setRecipeCategory] = useState<string>(ALL_CATEGORIES);
  const [stomachSafeOnly, setStomachSafeOnly] = useState(false);
  const [plan, setPlan] = useState<WeekPlan>(defaultPlan);
  const [selectedDay, setSelectedDay] = useState<DayKey>("Monday");
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("breakfast");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<(Recipe & { isNew?: boolean }) | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [groceryTab, setGroceryTab] = useState<GroceryTab>("All");
  const [selectedGroceryCategory, setSelectedGroceryCategory] = useState<string | null>(null);
  const [budgetTarget, setBudgetTarget] = useState(WEEKLY_BUDGET_DEFAULT);
  const [monthlyPicks, setMonthlyPicks] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState({ age: "", height: "", weight: "", gender: "female" });
  const [macroGoals, setMacroGoals] = useState({ calories: 1600, protein: 110, carbs: 160, fat: 55 });

  const weeklyRecipes = useMemo(() => {
    return Object.values(plan).flatMap((day) => Object.values(day))
      .map((id) => getRecipeById(id, recipes))
      .filter((r): r is Recipe => Boolean(r));
  }, [plan, recipes]);

  // Build smart grocery list from planned recipes
  const smartGroceries = useMemo((): EditableGrocery[] => {
    const seen = new Map<string, EditableGrocery>();
    for (const recipe of weeklyRecipes) {
      for (const ing of recipe.ingredients) {
        if (!ing.item.trim()) continue;
        const key = ing.item.toLowerCase().trim();
        const cat = getIngredientCategory(ing.item);
        const gcatObj = GROCERY_CATEGORIES.find(g => g.id === cat);
        const storage = gcatObj?.storage[0] || "Pantry";
        if (!seen.has(key)) {
          seen.set(key, { name: ing.item, category: cat, storage, estimatedCost: 0, fromRecipe: recipe.name });
        }
      }
    }
    return Array.from(seen.values());
  }, [weeklyRecipes]);

  const [customGroceries, setCustomGroceries] = useState<EditableGrocery[]>([]);
  const allGroceries = useMemo(() => [...smartGroceries, ...customGroceries], [smartGroceries, customGroceries]);

  const baseGroceries = useMemo(() => aggregateGroceries(weeklyRecipes), [weeklyRecipes]);
  const groceryTotal = useMemo(() => allGroceries.reduce((s, i) => s + i.estimatedCost, 0), [allGroceries]);
  const budgetRemaining = Number((budgetTarget - groceryTotal).toFixed(2));
  const budgetPercent = Math.min(100, Math.round((groceryTotal / budgetTarget) * 100));

  const weeklyMacros = useMemo(() => sumMacros(weeklyRecipes), [weeklyRecipes]);
  const averageDailyMacros = useMemo(() => ({
    calories: Math.round(weeklyMacros.calories / 7),
    protein: Math.round(weeklyMacros.protein / 7),
    carbs: Math.round(weeklyMacros.carbs / 7),
    fat: Math.round(weeklyMacros.fat / 7),
  }), [weeklyMacros]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const needle = query.trim().toLowerCase();
      const matchesQuery = needle.length === 0 || recipe.name.toLowerCase().includes(needle) || recipe.tags.some((t) => t.toLowerCase().includes(needle));
      const matchesCategory = recipeCategory === ALL_CATEGORIES || recipe.category === recipeCategory;
      const matchesStomach = !stomachSafeOnly || recipe.stomachSafe;
      return matchesQuery && matchesCategory && matchesStomach;
    });
  }, [query, recipeCategory, stomachSafeOnly, recipes]);

  const currentDayRecipes = useMemo(() => {
    const day = plan[selectedDay];
    return Object.entries(day).map(([slot, id]) => ({ slot: slot as SlotKey, recipe: getRecipeById(id, recipes) }));
  }, [plan, selectedDay, recipes]);

  const dayMacroTotal = useMemo(() =>
    sumMacros(currentDayRecipes.map(({ recipe }) => recipe).filter((r): r is Recipe => Boolean(r))),
    [currentDayRecipes]
  );

  const todaySlots = currentDayRecipes.filter(({ recipe }) => recipe);

  const macroGaps = {
    calories: macroGoals.calories - averageDailyMacros.calories,
    protein: macroGoals.protein - averageDailyMacros.protein,
    carbs: macroGoals.carbs - averageDailyMacros.carbs,
    fat: macroGoals.fat - averageDailyMacros.fat,
  };

  const macroSuggestions = [
    macroGaps.calories > 150 && `~${macroGaps.calories} cal under goal. Add oats, rice, or avocado.`,
    macroGaps.calories < -150 && `~${Math.abs(macroGaps.calories)} cal over goal. Reduce oils or nut butter.`,
    macroGaps.protein > 10 && `Need ~${macroGaps.protein}g more protein. Add yogurt, chicken, or eggs.`,
    macroGaps.carbs > 20 && `Need ~${macroGaps.carbs}g more carbs. Add rice, oats, or bananas.`,
    macroGaps.fat > 10 && `Need ~${macroGaps.fat}g more fat. Add avocado, nuts, or olive oil.`,
  ].filter(Boolean) as string[];

  function assignRecipe(recipeId: string) {
    setPlan((prev) => ({ ...prev, [selectedDay]: { ...prev[selectedDay], [selectedSlot]: recipeId } }));
    setMonthlyPicks((prev) => ({ ...prev, [recipeId]: (prev[recipeId] || 0) + 1 }));
    setAddedId(recipeId);
    setTimeout(() => setAddedId(null), 1500);
  }

  function clearSlot(day: DayKey, slot: string) {
    setPlan((prev) => ({ ...prev, [day]: { ...prev[day], [slot]: "" } }));
  }

  function handleDayChange(day: DayKey) {
    setSelectedDay(day);
    setSelectedSlot(Object.keys(plan[day])[0] as SlotKey);
  }

  function openNewRecipe() {
    if (recipes.length >= MAX_RECIPES) { alert(`Max ${MAX_RECIPES} recipes.`); return; }
    setEditingRecipe({ ...EMPTY_RECIPE, id: "", isNew: true });
  }

  function openEditRecipe(recipe: Recipe) {
    setEditingRecipe({ ...recipe, isNew: false });
    setExpandedRecipe(null);
  }

  function saveRecipe() {
    if (!editingRecipe || !editingRecipe.name.trim()) return;
    if (editingRecipe.isNew) {
      setRecipes((prev) => [...prev, { ...editingRecipe, id: slugify(editingRecipe.name) }]);
    } else {
      setRecipes((prev) => prev.map((r) => r.id === editingRecipe.id ? editingRecipe : r));
    }
    setEditingRecipe(null);
  }

  function deleteRecipe(id: string) {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
    setExpandedRecipe(null);
    setPlan((prev) => {
      const next = { ...prev };
      for (const day of Object.keys(next)) {
        for (const slot of Object.keys(next[day])) {
          if (next[day][slot as SlotKey] === id) next[day] = { ...next[day], [slot]: "" };
        }
      }
      return next;
    });
  }

  function updateField<K extends keyof Recipe>(key: K, value: Recipe[K]) {
    setEditingRecipe((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function updateIngredient(i: number, field: "item" | "amount", value: string) {
    setEditingRecipe((prev) => prev ? { ...prev, ingredients: prev.ingredients.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing) } : prev);
  }

  function updateInstruction(i: number, value: string) {
    setEditingRecipe((prev) => prev ? { ...prev, instructions: prev.instructions.map((st, idx) => idx === i ? value : st) } : prev);
  }

  function importRecipeFromText() {
    const text = recipePasteText.trim();
    if (!text) { alert("Paste a recipe first."); return; }
    if (recipes.length >= MAX_RECIPES) { alert(`Max ${MAX_RECIPES} recipes.`); return; }
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const name = lines[0] || "Untitled Recipe";
    const ingIdx = lines.findIndex((l) => /^ingredients?$/i.test(l));
    const instIdx = lines.findIndex((l) => /^(instructions?|directions?|method|steps?)$/i.test(l));
    const ingredientLines = ingIdx !== -1 && instIdx !== -1 ? lines.slice(ingIdx + 1, instIdx) : ingIdx !== -1 ? lines.slice(ingIdx + 1) : lines.slice(1, 8);
    const instructionLines = instIdx !== -1 ? lines.slice(instIdx + 1) : ["Edit to add instructions."];
    const newRecipe: Recipe = {
      id: slugify(name), name, category: "Imported", source: "Imported",
      stomachSafe: true, lowSpice: true, noTomato: false, servings: 1, servingSize: "1 serving",
      ingredients: ingredientLines.map((line) => ({ item: line, amount: "" })),
      instructions: instructionLines,
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      tags: ["imported"],
      groceryItems: ingredientLines.map((line) => ({ name: line, amount: "", category: "Custom", estimatedCost: 0 })),
    };
    setRecipes((prev) => [...prev, newRecipe]);
    setEditingRecipe({ ...newRecipe, isNew: false });
    setRecipePasteText("");
  }

  // Filter groceries by tab
  const filteredGroceries = useMemo(() => {
    if (groceryTab === "All") return allGroceries;
    if (groceryTab === "List") return allGroceries.filter(g => g.checked);
    return allGroceries.filter(g => g.storage === groceryTab);
  }, [allGroceries, groceryTab]);

  // Grouped by category for the category view
  const groceriesByCategory = useMemo(() => {
    const map = new Map<string, EditableGrocery[]>();
    for (const item of filteredGroceries) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [filteredGroceries]);

  const categoriesWithItems = useMemo(() =>
    GROCERY_CATEGORIES.filter(c => groceriesByCategory.has(c.id)),
    [groceriesByCategory]
  );

  // RECIPE EDITOR
  if (editingRecipe) {
    return (
      <div style={s.shell}>
        <div style={s.editorTopBar}>
          <button style={s.backBtn} onClick={() => setEditingRecipe(null)}>‹ Back</button>
          <div style={s.editorTopTitle}>{editingRecipe.isNew ? "New Recipe" : "Edit Recipe"}</div>
          <button style={s.saveTopBtn} onClick={saveRecipe}>Save</button>
        </div>
        <div style={s.screenWrap}>
          <div style={s.screen}>
            <div style={s.fieldGroup}>
              <div style={s.fieldLabel}>Recipe Name *</div>
              <input style={s.fieldInput} value={editingRecipe.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Chicken Rice Bowl" />
            </div>
            <div style={s.fieldRow}>
              <div style={{ flex: 1 }}>
                <div style={s.fieldLabel}>Category</div>
                <select style={s.fieldSelect} value={editingRecipe.category} onChange={(e) => updateField("category", e.target.value)}>
                  {["Breakfast","Bowls","Snacks","Drinks","Imported"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={s.fieldLabel}>Servings</div>
                <input style={s.fieldInput} type="number" value={editingRecipe.servings} onChange={(e) => updateField("servings", Number(e.target.value))} />
              </div>
            </div>
            <div style={s.fieldLabel}>Macros per serving</div>
            <div style={s.macroInputRow}>
              {(["calories","protein","carbs","fat"] as const).map((key) => (
                <div key={key} style={s.macroInputBox}>
                  <div style={s.macroInputLabel}>{key}</div>
                  <input style={s.macroInput} type="number" value={editingRecipe.macros[key]} onChange={(e) => updateField("macros", { ...editingRecipe.macros, [key]: Number(e.target.value) })} />
                </div>
              ))}
            </div>
            <div style={s.fieldGroup}>
              <div style={s.fieldLabelRow}>
                <div style={s.fieldLabel}>Ingredients</div>
                <button style={s.addRowBtn} onClick={() => setEditingRecipe((prev) => prev ? { ...prev, ingredients: [...prev.ingredients, { item: "", amount: "" }] } : prev)}>+ Add</button>
              </div>
              {editingRecipe.ingredients.map((ing, i) => (
                <div key={i} style={s.ingredientRow}>
                  <input style={{ ...s.fieldInput, flex: 1 }} value={ing.amount} onChange={(e) => updateIngredient(i, "amount", e.target.value)} placeholder="Amount" />
                  <input style={{ ...s.fieldInput, flex: 2 }} value={ing.item} onChange={(e) => updateIngredient(i, "item", e.target.value)} placeholder="Ingredient" />
                  <button style={s.removeRowBtn} onClick={() => setEditingRecipe((prev) => prev ? { ...prev, ingredients: prev.ingredients.filter((_, idx) => idx !== i) } : prev)}>✕</button>
                </div>
              ))}
            </div>
            <div style={s.fieldGroup}>
              <div style={s.fieldLabelRow}>
                <div style={s.fieldLabel}>Instructions</div>
                <button style={s.addRowBtn} onClick={() => setEditingRecipe((prev) => prev ? { ...prev, instructions: [...prev.instructions, ""] } : prev)}>+ Add</button>
              </div>
              {editingRecipe.instructions.map((step, i) => (
                <div key={i} style={s.ingredientRow}>
                  <span style={s.stepNum}>{i + 1}</span>
                  <input style={{ ...s.fieldInput, flex: 1 }} value={step} onChange={(e) => updateInstruction(i, e.target.value)} placeholder={`Step ${i + 1}`} />
                  <button style={s.removeRowBtn} onClick={() => setEditingRecipe((prev) => prev ? { ...prev, instructions: prev.instructions.filter((_, idx) => idx !== i) } : prev)}>✕</button>
                </div>
              ))}
            </div>
            <div style={s.fieldGroup}>
              <div style={s.fieldLabel}>Tags (comma separated)</div>
              <input style={s.fieldInput} value={editingRecipe.tags.join(", ")} onChange={(e) => updateField("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} placeholder="e.g. high protein, meal prep" />
            </div>
            <div style={s.toggleRow}>
              {([["stomachSafe","Stomach-safe"],["lowSpice","Low spice"],["noTomato","No tomato"]] as const).map(([key, label]) => (
                <button key={key} style={{ ...s.toggleChip, ...(editingRecipe[key] ? s.toggleChipOn : {}) }} onClick={() => updateField(key, !editingRecipe[key])}>
                  {editingRecipe[key] ? "✓ " : ""}{label}
                </button>
              ))}
            </div>
            <div style={{ height: 40 }} />
          </div>
        </div>
      </div>
    );
  }

  // GROCERY CATEGORY DETAIL VIEW
  if (selectedGroceryCategory) {
    const catObj = GROCERY_CATEGORIES.find(c => c.id === selectedGroceryCategory);
    const items = groceriesByCategory.get(selectedGroceryCategory) || [];
    return (
      <div style={s.shell}>
        <div style={s.pageTopBar}>
          <button style={s.backBtn} onClick={() => setSelectedGroceryCategory(null)}>‹</button>
          <div style={s.pageTopTitle}>{selectedGroceryCategory}</div>
          <button style={s.menuBtn}>···</button>
        </div>
        <div style={s.screenWrap}>
          {/* Category hero banner */}
          <div style={{ ...s.catHeroBanner, background: catObj?.color || "#f5f5f5" }}>
            <span style={s.catHeroEmoji}>{catObj?.emoji || "🛒"}</span>
          </div>
          <div style={s.screen}>
            <div style={s.fromRecipesRow}>
              <span style={s.fromRecipesLabel}>From your recipes</span>
              <span style={s.fromRecipesCount}>{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={s.groceryDetailList}>
              {items.map((item, i) => (
                <div key={i} style={s.groceryDetailRow}>
                  <div style={s.groceryDetailIcon}>
                    <span style={{ fontSize: 22 }}>{catObj?.emoji || "🛒"}</span>
                  </div>
                  <div style={s.groceryDetailInfo}>
                    <div style={s.groceryDetailName}>{item.name}</div>
                    {item.fromRecipe && <div style={s.groceryDetailMeta}>from {item.fromRecipe} · {item.storage}</div>}
                  </div>
                  <button
                    style={{ ...s.checkCircle, ...(item.checked ? s.checkCircleOn : {}) }}
                    onClick={() => setCustomGroceries((prev) => {
                      // toggle checked on smart groceries via a parallel state
                      return prev;
                    })}
                  >
                    {item.checked ? "✓" : ""}
                  </button>
                </div>
              ))}
            </div>
            <button style={s.viewListBtn} onClick={() => setSelectedGroceryCategory(null)}>+ View list</button>
          </div>
        </div>
        <nav style={s.bottomNav}>
          {([["home","🏠","Home"],["planner","📅","Plan"],["budget","🛒","Groceries"],["insights","👤","Profile"]] as [Screen, string, string][]).map(([sc, emoji, label]) => (
            <button key={sc} style={s.navBtn} onClick={() => { setSelectedGroceryCategory(null); setScreen(sc); }}>
              <span style={{ fontSize: 22 }}>{emoji}</span>
              <span style={{ ...s.navLabel, ...(screen === sc ? { color: "#8b6914", fontWeight: 700 } : {}) }}>{label}</span>
              {screen === sc && <div style={s.navDot} />}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div style={s.shell}>
      {/* TOP BAR */}
      <div style={s.topBar}>
        <div>
          <div style={s.topBarEyebrow}>Good morning,</div>
          <div style={s.topBarTitle}>Glow Kitchen 🌿</div>
        </div>
        <button style={s.bellBtn}>🔔</button>
      </div>

      {/* BOTTOM NAV */}
      <nav style={s.bottomNav}>
        {([["home","🏠","Home"],["planner","📅","Plan"],["budget","🛒","Groceries"],["insights","👤","Profile"]] as [Screen, string, string][]).map(([sc, emoji, label]) => (
          <button key={sc} style={s.navBtn} onClick={() => setScreen(sc)}>
            <span style={{ fontSize: 22, filter: screen === sc ? "none" : "grayscale(1)" }}>{emoji}</span>
            <span style={{ ...s.navLabel, ...(screen === sc ? { color: "#8b6914", fontWeight: 700 } : {}) }}>{label}</span>
            {screen === sc && <div style={s.navDot} />}
          </button>
        ))}
      </nav>

      <div style={s.screenWrap}>

        {/* ── HOME ── */}
        {screen === "home" && (
          <div style={{ paddingBottom: 0 }}>
            {/* Hero image */}
            <div style={s.heroBox}>
              <img
                src={`/meal-prep-budget-system/heroes/single/${HERO_IMG}`}
                alt="Glow Kitchen"
                style={s.heroImg}
              />
              {/* Dot indicators */}
              <div style={s.heroDots}>
                {[0,1,2].map(i => <div key={i} style={{ ...s.heroDot, ...(i===0 ? s.heroDotActive : {}) }} />)}
              </div>
            </div>

            <div style={s.screen}>
              {/* Quick Actions */}
              <div style={s.sectionTitle}>Quick Actions</div>
              <div style={s.quickGrid}>
                {([
                  ["planner","🗓","Meal Plan"],
                  ["budget","🛒","Groceries"],
                  ["recipes","🍽","Recipes"],
                  ["insights","🐷","Budget"],
                ] as [Screen, string, string][]).map(([sc, emoji, label]) => (
                  <button key={sc} style={s.quickBtn} onClick={() => setScreen(sc)}>
                    <div style={s.quickIcon}><span style={{ fontSize: 26 }}>{emoji}</span></div>
                    <div style={s.quickLabel}>{label}</div>
                  </button>
                ))}
              </div>
              

              {/* Today's Plan */}
              <div style={s.sectionTitle}>Today's Plan</div>
              <div style={s.todayCard}>
                {todaySlots.length === 0 ? (
                  <div style={s.emptyState}>No meals planned yet 🌱</div>
                ) : (
                  todaySlots.map(({ slot, recipe }) => recipe && (
                    <div key={slot} style={s.todayRow}>
                      <div style={s.todayImg}><span style={{ fontSize: 28 }}>🍽</span></div>
                      <div style={s.todayInfo}>
                        <div style={s.todayName}>{recipe.name}</div>
                        <div style={s.todayMeta}>with {recipe.ingredients.slice(0,2).map(i => i.item).filter(Boolean).join(", ") || "fresh ingredients"}</div>
                      </div>
                      <button style={s.heartBtn}>🤍</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── RECIPES ── */}
        {screen === "recipes" && (
          <div style={s.screen}>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Recipes</div>
              <button style={s.pillBtn} onClick={openNewRecipe}>+ New</button>
            </div>

            {/* Paste importer */}
            <details style={s.importDetails}>
              <summary style={s.importSummary}>📋 Paste from Google Docs</summary>
              <div style={{ marginTop: 10 }}>
                <textarea style={s.importTextarea} value={recipePasteText} onChange={(e) => setRecipePasteText(e.target.value)} placeholder={"Recipe Name\n\nIngredients\nItem 1\n\nInstructions\nStep 1"} />
                <button style={s.importBtn} onClick={importRecipeFromText}>Import Recipe</button>
              </div>
            </details>

            {/* Search */}
            <div style={s.searchWrap}>
              <span>🔍</span>
              <input style={s.searchInput} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipes…" />
            </div>

            {/* Category pills */}
            <div style={s.catPillRow}>
              {[ALL_CATEGORIES,"Breakfast","Bowls","Snacks","Drinks","Imported"].map((f) => (
                <button key={f} style={{ ...s.catPill, ...(recipeCategory === f ? s.catPillActive : {}) }} onClick={() => setRecipeCategory(f)}>
                  {f === ALL_CATEGORIES ? "All" : f}
                </button>
              ))}
            </div>

            {/* Add to plan strip */}
            <div style={s.planStrip}>
              <span style={s.planStripLabel}>Adding to →</span>
              <select style={s.miniSelect} value={selectedDay} onChange={(e) => handleDayChange(e.target.value as DayKey)}>
                {Object.keys(plan).map((d) => <option key={d}>{d}</option>)}
              </select>
              <select style={s.miniSelect} value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value as SlotKey)}>
                {Object.keys(plan[selectedDay]).map((sl) => <option key={sl} value={sl}>{capitalize(sl)}</option>)}
              </select>
            </div>

            {/* Recipe list */}
            <div style={s.recipeList}>
              {filteredRecipes.map((recipe) => {
                const isExpanded = expandedRecipe === recipe.id;
                const isAdded = addedId === recipe.id;
                const confirmingDelete = deleteConfirm === recipe.id;
                return (
                  <div key={recipe.id} style={s.recipeCard}>
                    <button style={s.recipeRow} onClick={() => setExpandedRecipe(isExpanded ? null : recipe.id)}>
                      <div style={s.recipeImgBox}><span style={{ fontSize: 32 }}>🍽</span></div>
                      <div style={s.recipeInfo}>
                        <div style={s.recipeName}>{recipe.name}</div>
                        <div style={s.recipeMeta}>{recipe.macros.calories} cal · {recipe.macros.protein}g protein · {recipe.category}</div>
                      </div>
                      <span style={s.recipeChevron}>{isExpanded ? "▾" : "›"}</span>
                    </button>
                    {isExpanded && (
                      <div style={s.recipeExpanded}>
                        <div style={s.macroRow}>
                          {[{l:"Cal",v:recipe.macros.calories},{l:"Protein",v:`${recipe.macros.protein}g`},{l:"Carbs",v:`${recipe.macros.carbs}g`},{l:"Fat",v:`${recipe.macros.fat}g`}].map((m) => (
                            <div key={m.l} style={s.macroBox}><div style={s.macroVal}>{m.v}</div><div style={s.macroLbl}>{m.l}</div></div>
                          ))}
                        </div>
                        {recipe.ingredients.length > 0 && (
                          <div style={s.expandSection}>
                            <div style={s.expandTitle}>Ingredients</div>
                            {recipe.ingredients.map((ing, i) => <div key={i} style={s.expandRow}><span style={s.expandDot}>·</span><span>{ing.amount} {ing.item}</span></div>)}
                          </div>
                        )}
                        {recipe.instructions.length > 0 && (
                          <div style={s.expandSection}>
                            <div style={s.expandTitle}>Instructions</div>
                            {recipe.instructions.map((step, i) => <div key={i} style={s.expandRow}><span style={s.expandNum}>{i+1}</span><span>{step}</span></div>)}
                          </div>
                        )}
                        <button style={{ ...s.addBtn, background: isAdded ? "#7c8a64" : "#e8f0e0", color: isAdded ? "#fff" : "#4d5a3d" }} onClick={() => assignRecipe(recipe.id)}>
                          {isAdded ? "✓ Added!" : `+ Add to ${selectedDay} ${capitalize(selectedSlot)}`}
                        </button>
                        <div style={s.recipeActions}>
                          <button style={s.editBtn} onClick={() => openEditRecipe(recipe)}>✏️ Edit</button>
                          {confirmingDelete ? (
                            <div style={s.confirmRow}>
                              <span style={{ fontSize: 12, color: "#c97b5a" }}>Delete?</span>
                              <button style={s.confirmYes} onClick={() => deleteRecipe(recipe.id)}>Yes</button>
                              <button style={s.confirmNo} onClick={() => setDeleteConfirm(null)}>No</button>
                            </div>
                          ) : (
                            <button style={s.deleteBtn} onClick={() => setDeleteConfirm(recipe.id)}>🗑 Delete</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredRecipes.length === 0 && <div style={s.emptyState}>No recipes found 🌱</div>}
            </div>
            <div style={s.recipeCount}>{recipes.length} / {MAX_RECIPES} recipes</div>
          </div>
        )}

        {/* ── PLANNER ── */}
        {screen === "planner" && (
          <div style={s.screen}>
            <div style={s.pageHeader}><div style={s.pageTitle}>Meal Plan 📅</div></div>
            <div style={s.dayScroll}>
              {Object.keys(plan).map((day) => (
                <button key={day} style={{ ...s.dayChip, ...(selectedDay === day ? s.dayChipActive : {}) }} onClick={() => handleDayChange(day as DayKey)}>
                  {day.slice(0,3)}
                </button>
              ))}
            </div>
            <div style={s.dayMacroBar}>
              <span style={s.dayMacroItem}>🔥 {dayMacroTotal.calories} cal</span>
              <span style={s.dayMacroItem}>💪 {dayMacroTotal.protein}g</span>
              <span style={s.dayMacroItem}>🍚 {dayMacroTotal.carbs}g</span>
            </div>
            <div style={s.slotTabRow}>
              {Object.keys(plan[selectedDay]).map((sl) => (
                <button key={sl} style={{ ...s.slotTab, ...(selectedSlot === sl ? s.slotTabActive : {}) }} onClick={() => setSelectedSlot(sl as SlotKey)}>{capitalize(sl)}</button>
              ))}
            </div>
            <div style={s.slotList}>
              {currentDayRecipes.map(({ slot, recipe }) => (
                <div key={slot} style={{ ...s.slotCard, ...(selectedSlot === slot ? s.slotCardActive : {}) }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={s.slotImg}><span style={{ fontSize: 26 }}>🍽</span></div>
                    <div>
                      <div style={s.slotBadge}>{capitalize(slot)}</div>
                      <div style={s.slotName}>{recipe ? recipe.name : "— empty —"}</div>
                      {recipe && <div style={s.slotMeta}>{recipe.macros.calories} cal · {recipe.macros.protein}g protein</div>}
                    </div>
                  </div>
                  {recipe && <button style={s.clearBtn} onClick={() => clearSlot(selectedDay, slot)}>✕</button>}
                </div>
              ))}
            </div>
            <button style={s.goRecipesBtn} onClick={() => setScreen("recipes")}>+ Browse Recipes</button>
          </div>
        )}

        {/* ── GROCERIES / BUDGET ── */}
        {screen === "budget" && (
          <div style={{ ...s.screen, padding: 0 }}>
            <div style={s.pageTopBar}>
              <button style={s.backBtn} onClick={() => setScreen("home")}>‹</button>
              <div style={s.pageTopTitle}>Groceries</div>
              <button style={s.menuBtn}>···</button>
            </div>

            {/* Tab bar */}
            <div style={s.groceryTabRow}>
              {(["All","Pantry","Fridge","Frozen","List"] as GroceryTab[]).map((tab) => (
                <button key={tab} style={{ ...s.groceryTab, ...(groceryTab === tab ? s.groceryTabActive : {}) }} onClick={() => setGroceryTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Category cards */}
            <div style={{ padding: "0 16px" }}>
              {categoriesWithItems.length === 0 ? (
                <div style={{ ...s.emptyState, padding: "40px 0" }}>
                  No items yet — add recipes to your planner to populate your grocery list!
                </div>
              ) : (
                <div style={s.groceryCatList}>
                  {categoriesWithItems.map((cat) => {
                    const items = groceriesByCategory.get(cat.id) || [];
                    return (
                      <button key={cat.id} style={s.groceryCatCard} onClick={() => setSelectedGroceryCategory(cat.id)}>
                        <div style={{ ...s.groceryCatImg, background: cat.color }}>
                          <span style={{ fontSize: 36 }}>{cat.emoji}</span>
                        </div>
                        <div style={s.groceryCatInfo}>
                          <div style={s.groceryCatName}>{cat.id}</div>
                          <div style={s.groceryCatCount}>{items.length} item{items.length !== 1 ? "s" : ""} from recipes</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <button style={s.addItemBtn} onClick={() => setCustomGroceries((prev) => [...prev, { name: "New item", category: "Custom", storage: "Pantry", estimatedCost: 0 }])}>
                + Add Item
              </button>
            </div>
          </div>
        )}

        {/* ── INSIGHTS / PROFILE ── */}
        {screen === "insights" && (
          <div style={s.screen}>
            <div style={s.pageHeader}><div style={s.pageTitle}>Profile & Insights</div></div>

            {/* Budget summary */}
            <div style={s.insightCard}>
              <div style={s.insightCardTitle}>Weekly Budget</div>
              <div style={s.budgetRow}>
                <div>
                  <div style={s.budgetBig}>{currency(groceryTotal)}</div>
                  <div style={{ fontSize: 12, color: "#8b7d6b" }}>of {currency(budgetTarget)}</div>
                </div>
                <div style={s.budgetTrack}>
                  <div style={{ ...s.budgetFill, width: `${budgetPercent}%` }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 13, color: "#8b7d6b" }}>Target: $</span>
                <input type="number" style={{ ...s.fieldInput, flex: 1, padding: "6px 10px" }} value={budgetTarget} onChange={(e) => setBudgetTarget(Number(e.target.value) || 0)} />
              </div>
            </div>

            {/* Profile */}
            <div style={s.insightCard}>
              <div style={s.insightCardTitle}>Your Profile</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([["age","Age","number"],["height","Height","text"],["weight","lbs","number"]] as [keyof typeof profile, string, string][]).map(([field, label, type]) => (
                  <div key={field} style={s.profileBox}>
                    <div style={s.profileBoxLabel}>{label}</div>
                    <input style={s.profileBoxInput} type={type} value={profile[field]} onChange={(e) => setProfile((prev) => ({ ...prev, [field]: e.target.value }))} />
                  </div>
                ))}
                <div style={s.profileBox}>
                  <div style={s.profileBoxLabel}>Gender</div>
                  <select style={s.profileBoxInput} value={profile.gender} onChange={(e) => setProfile((prev) => ({ ...prev, gender: e.target.value }))}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Macro goals */}
            <div style={s.insightCard}>
              <div style={s.insightCardTitle}>Macro Goals</div>
              {(["calories","protein","carbs","fat"] as const).map((key) => {
                const current = averageDailyMacros[key];
                const goal = macroGoals[key];
                const pct = Math.min(100, Math.round((current / goal) * 100));
                const ok = pct >= 80 && pct <= 120;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#8b7d6b", width: 54, flexShrink: 0 }}>{capitalize(key)}</div>
                    <div style={{ flex: 1, height: 6, background: "#f4efe3", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: ok ? "#7c8a64" : "#e8a598", transition: "width 0.4s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 3, alignItems: "center", fontSize: 12 }}>
                      <span style={{ color: ok ? "#7c8a64" : "#c97b5a", fontWeight: 700 }}>{current}</span>
                      <span style={{ color: "#c9b99a" }}>/</span>
                      <input type="number" style={{ width: 48, background: "#f4efe3", border: "1px solid #e8e0d0", borderRadius: 6, padding: "2px 4px", fontSize: 12, textAlign: "right" }} value={goal} onChange={(e) => setMacroGoals((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))} />
                    </div>
                  </div>
                );
              })}
            </div>

            {macroSuggestions.length > 0 && (
              <div style={s.insightCard}>
                <div style={s.insightCardTitle}>Suggestions</div>
                {macroSuggestions.map((tip) => <div key={tip} style={{ fontSize: 13, color: "#3a3228", marginBottom: 6, display: "flex", gap: 8 }}><span style={{ color: "#7c8a64" }}>→</span><span>{tip}</span></div>)}
              </div>
            )}
            <div style={{ height: 16 }} />
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f5f0e8", color: "#3a3228", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', -apple-system, sans-serif", position: "relative" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 10px", background: "#f5f0e8", flexShrink: 0, zIndex: 10 },
  topBarEyebrow: { fontSize: 13, color: "#8b7d6b" },
  topBarTitle: { fontSize: 22, fontWeight: 800, color: "#3a3228" },
  bellBtn: { fontSize: 20, background: "#fff", border: "1px solid #e8e0d0", borderRadius: 14, padding: "8px 10px", cursor: "pointer" },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fffffff0", backdropFilter: "blur(12px)", borderTop: "1px solid #e8e0d0", display: "flex", padding: "8px 0 14px", zIndex: 100 },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "transparent", border: "none", cursor: "pointer", padding: "4px 0", position: "relative" },
  navLabel: { fontSize: 11, color: "#8b7d6b" },
  navDot: { width: 5, height: 5, borderRadius: 99, background: "#8b6914", position: "absolute", bottom: -3 },
  screenWrap: { flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 90 },
  screen: { padding: "8px 16px 0" },

  // Hero
  heroBox: { width: "100%", height: 340, position: "relative", overflow: "hidden", background: "#e8e0d0", borderRadius: "0 0 24px 24px" },
  heroImg: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" },
  heroDots: { position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 },
  heroDot: { width: 6, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.5)" },
  heroDotActive: { background: "#fff", width: 18 },

  // Home
  sectionTitle: {
  fontSize: 14,
  fontWeight: 900,
  color: "#5A3827",
  marginBottom: 12,
  marginTop: 20,
},
todayFoodArt: {
  width: 60,
  height: 60,
  borderRadius: 18,
  objectFit: "cover",
  border: "1.5px solid #E8CFA3",
  background: "#FFF6DF",
  flexShrink: 0,
},
  quickGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 8 },
quickActionBtn: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 22,
  padding: "14px 8px",
  minHeight: 118,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(90,56,39,0.08)",
},
  quickIcon: { fontSize: 28, marginBottom: 6, height: 36, display: "flex", alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 11, fontWeight: 600, color: "#3a3228" },
  todayCard: { background: "#fff", borderRadius: 18, padding: "6px 0", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: 16 },
  todayRow: { display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: "1px solid #f5f0e8" },
  todayImg: { width: 52, height: 52, borderRadius: 12, background: "#f5f0e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  todayInfo: { flex: 1 },
  todayName: { fontSize: 15, fontWeight: 600, color: "#3a3228" },
  todayMeta: { fontSize: 12, color: "#8b7d6b", marginTop: 2 },
  heartBtn: { fontSize: 18, background: "transparent", border: "none", cursor: "pointer" },
  emptyState: { textAlign: "center", color: "#8b7d6b", padding: "20px 0", fontSize: 13 },

  // Page headers
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingTop: 4 },
  pageTitle: { fontSize: 22, fontWeight: 800, color: "#3a3228" },
  pillBtn: { background: "#7c8a64", border: "none", borderRadius: 20, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  pageTopBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", background: "#f5f0e8" },
  pageTopTitle: { fontSize: 18, fontWeight: 700, color: "#3a3228" },
  backBtn: { fontSize: 22, background: "transparent", border: "none", color: "#3a3228", cursor: "pointer", padding: "4px 8px", fontWeight: 300 },
  menuBtn: { fontSize: 18, background: "transparent", border: "none", color: "#8b7d6b", cursor: "pointer" },

  // Recipes
  importDetails: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 14, padding: "12px 14px", marginBottom: 12 },
  importSummary: { fontSize: 13, fontWeight: 600, color: "#3a3228", cursor: "pointer", listStyle: "none" },
  importTextarea: { width: "100%", minHeight: 90, padding: "10px 12px", borderRadius: 10, border: "1px solid #e8e0d0", background: "#f9f7f3", color: "#3a3228", fontSize: 12, boxSizing: "border-box", resize: "vertical" },
  importBtn: { marginTop: 8, padding: "9px 16px", borderRadius: 20, border: "none", background: "#7c8a64", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e8e0d0", borderRadius: 14, padding: "10px 14px", marginBottom: 12 },
  searchInput: { flex: 1, background: "transparent", border: "none", color: "#3a3228", fontSize: 14, outline: "none" },
  catPillRow: { display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 },
  catPill: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 99, padding: "6px 14px", fontSize: 12, color: "#8b7d6b", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
  catPillActive: { background: "#7c8a64", border: "1px solid #7c8a64", color: "#fff", fontWeight: 700 },
  planStrip: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: "10px 14px", marginBottom: 14, flexWrap: "wrap" },
  planStripLabel: { fontSize: 12, color: "#8b7d6b" },
  miniSelect: { background: "#f9f7f3", border: "1px solid #e8e0d0", borderRadius: 8, padding: "5px 10px", color: "#3a3228", fontSize: 12, cursor: "pointer" },
  recipeList: { display: "flex", flexDirection: "column", gap: 10 },
  recipeCard: { background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  recipeRow: { display: "flex", alignItems: "center", padding: "14px 16px", width: "100%", background: "transparent", border: "none", color: "#3a3228", cursor: "pointer", textAlign: "left", gap: 12 },
  recipeImgBox: { width: 64, height: 64, borderRadius: 14, background: "#f5f0e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: 15, fontWeight: 700, color: "#3a3228" },
  recipeMeta: { fontSize: 12, color: "#8b7d6b", marginTop: 2 },
  recipeChevron: { fontSize: 20, color: "#c9b99a" },
  recipeExpanded: { padding: "0 16px 16px", borderTop: "1px solid #f5f0e8" },
  macroRow: { display: "flex", gap: 8, paddingTop: 12, marginBottom: 12 },
  macroBox: { flex: 1, background: "#f9f7f3", borderRadius: 12, padding: "8px 6px", textAlign: "center" },
  macroVal: { fontSize: 14, fontWeight: 700, color: "#3a3228" },
  macroLbl: { fontSize: 10, color: "#8b7d6b", marginTop: 2 },
  expandSection: { marginBottom: 10 },
  expandTitle: { fontSize: 11, fontWeight: 700, color: "#7c8a64", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 },
  expandRow: { display: "flex", gap: 8, fontSize: 13, color: "#3a3228", marginBottom: 4, lineHeight: 1.5 },
  expandDot: { color: "#e8a598", flexShrink: 0 },
  expandNum: { color: "#e8a598", fontWeight: 700, flexShrink: 0, minWidth: 16 },
  addBtn: { width: "100%", border: "none", borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 10, marginTop: 4 },
  recipeActions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  editBtn: { background: "#f9f7f3", border: "1px solid #e8e0d0", borderRadius: 10, padding: "7px 14px", color: "#3a3228", fontSize: 12, cursor: "pointer" },
  deleteBtn: { background: "#fdeee8", border: "1px solid #e8a598", borderRadius: 10, padding: "7px 14px", color: "#b06040", fontSize: 12, cursor: "pointer" },
  confirmRow: { display: "flex", gap: 6, alignItems: "center" },
  confirmYes: { background: "#c97b5a", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  confirmNo: { background: "#f9f7f3", border: "none", borderRadius: 8, padding: "6px 12px", color: "#8b7d6b", fontSize: 12, cursor: "pointer" },
  recipeCount: { textAlign: "center", fontSize: 11, color: "#c9b99a", padding: "12px 0" },

  // Planner
  dayScroll: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", paddingTop: 4 },
  dayChip: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#8b7d6b", cursor: "pointer" },
  dayChipActive: { background: "#7c8a64", color: "#fff", border: "1px solid #7c8a64" },
  dayMacroBar: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 14, padding: "10px 16px", display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" },
  dayMacroItem: { fontSize: 13, color: "#3a3228" },
  slotTabRow: { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  slotTab: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 99, padding: "6px 14px", fontSize: 12, color: "#8b7d6b", cursor: "pointer" },
  slotTabActive: { background: "#e8f0e0", border: "1px solid #7c8a64", color: "#4d5a3d", fontWeight: 700 },
  slotList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  slotCard: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  slotCardActive: { border: "1px solid #7c8a64" },
  slotImg: { width: 44, height: 44, borderRadius: 10, background: "#f5f0e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  slotBadge: { fontSize: 10, fontWeight: 700, color: "#7c8a64", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 },
  slotName: { fontSize: 14, fontWeight: 600, color: "#3a3228" },
  slotMeta: { fontSize: 11, color: "#8b7d6b", marginTop: 2 },
  clearBtn: { background: "transparent", border: "none", color: "#c9b99a", fontSize: 14, cursor: "pointer" },
  goRecipesBtn: { width: "100%", background: "#7c8a64", border: "none", borderRadius: 14, padding: "14px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 16 },

  // Groceries
  groceryTabRow: { display: "flex", gap: 0, padding: "0 16px 14px", borderBottom: "1px solid #e8e0d0", marginBottom: 16 },
  groceryTab: { flex: 1, background: "transparent", border: "none", borderRadius: 99, padding: "7px 4px", fontSize: 13, color: "#8b7d6b", cursor: "pointer", textAlign: "center" },
  groceryTabActive: { background: "#7c8a64", color: "#fff", fontWeight: 700, borderRadius: 99 },
  groceryCatList: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  groceryCatCard: { background: "#fff", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, border: "none", cursor: "pointer", textAlign: "left", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  groceryCatImg: { width: 72, height: 72, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  groceryCatInfo: { flex: 1 },
  groceryCatName: { fontSize: 16, fontWeight: 700, color: "#3a3228" },
  groceryCatCount: { fontSize: 12, color: "#8b7d6b", marginTop: 3 },
  addItemBtn: { width: "100%", background: "#7c8a64", border: "none", borderRadius: 14, padding: "15px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 16, boxShadow: "0 4px 12px rgba(124,138,100,0.25)" },

  // Grocery detail
  catHeroBanner: { width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  catHeroEmoji: { fontSize: 80 },
  fromRecipesRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingTop: 4 },
  fromRecipesLabel: { fontSize: 15, fontWeight: 700, color: "#3a3228" },
  fromRecipesCount: { fontSize: 13, color: "#8b7d6b" },
  groceryDetailList: { background: "#fff", borderRadius: 18, overflow: "hidden", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  groceryDetailRow: { display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: "1px solid #f5f0e8" },
  groceryDetailIcon: { width: 44, height: 44, borderRadius: 99, background: "#f5f0e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  groceryDetailInfo: { flex: 1 },
  groceryDetailName: { fontSize: 15, fontWeight: 600, color: "#3a3228" },
  groceryDetailMeta: { fontSize: 12, color: "#8b7d6b", marginTop: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 99, border: "2px solid #e8e0d0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", flexShrink: 0 },
  checkCircleOn: { background: "#7c8a64", border: "2px solid #7c8a64" },
  viewListBtn: { width: "100%", background: "#7c8a64", border: "none", borderRadius: 14, padding: "15px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 16 },

  // Insights
  insightCard: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 16, padding: "14px 16px", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  insightCardTitle: { fontSize: 14, fontWeight: 700, color: "#3a3228", marginBottom: 12 },
  budgetRow: { display: "flex", alignItems: "center", gap: 16 },
  budgetBig: { fontSize: 28, fontWeight: 800, color: "#3a3228" },
  budgetTrack: { flex: 1, height: 8, background: "#f4efe3", borderRadius: 99, overflow: "hidden" },
  budgetFill: { height: "100%", background: "#7c8a64", borderRadius: 99, transition: "width 0.5s" },
  profileBox: { background: "#f9f7f3", borderRadius: 12, padding: "10px 12px" },
  profileBoxLabel: { fontSize: 10, color: "#8b7d6b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 },
  profileBoxInput: { width: "100%", background: "transparent", border: "none", color: "#3a3228", fontSize: 15, fontWeight: 700, outline: "none" },

  // Editor
  editorTopBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 12px", background: "#f5f0e8", flexShrink: 0 },
  editorTopTitle: { fontSize: 17, fontWeight: 700, color: "#3a3228" },
  saveTopBtn: { background: "#7c8a64", border: "none", borderRadius: 20, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  fieldGroup: { marginBottom: 16 },
  fieldRow: { display: "flex", gap: 10, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "#7c8a64", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 },
  fieldLabelRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  fieldInput: { width: "100%", background: "#f9f7f3", border: "1px solid #e8e0d0", borderRadius: 10, padding: "11px 13px", color: "#3a3228", fontSize: 13, boxSizing: "border-box" },
  fieldSelect: { width: "100%", background: "#f9f7f3", border: "1px solid #e8e0d0", borderRadius: 10, padding: "11px 13px", color: "#3a3228", fontSize: 13 },
  macroInputRow: { display: "flex", gap: 8, marginBottom: 16 },
  macroInputBox: { flex: 1, background: "#f9f7f3", border: "1px solid #e8e0d0", borderRadius: 10, padding: "10px 6px", textAlign: "center" },
  macroInputLabel: { fontSize: 9, color: "#8b7d6b", marginBottom: 5, textTransform: "uppercase" },
  macroInput: { width: "100%", background: "transparent", border: "none", color: "#3a3228", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" },
  ingredientRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 },
  stepNum: { color: "#e8a598", fontWeight: 700, fontSize: 13, flexShrink: 0, minWidth: 18 },
  addRowBtn: { background: "#e8f0e0", border: "1px solid #7c8a6466", borderRadius: 8, padding: "4px 10px", color: "#4d5a3d", fontSize: 12, cursor: "pointer" },
  removeRowBtn: { background: "transparent", border: "none", color: "#c9b99a", fontSize: 14, cursor: "pointer", padding: "4px 6px", flexShrink: 0 },
  toggleRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  toggleChip: { background: "#f9f7f3", border: "1px solid #e8e0d0", borderRadius: 99, padding: "7px 14px", color: "#8b7d6b", fontSize: 12, cursor: "pointer" },
  toggleChipOn: { background: "#e8f0e0", border: "1px solid #7c8a64", color: "#4d5a3d", fontWeight: 700 },
};
