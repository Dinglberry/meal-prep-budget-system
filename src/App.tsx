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

const FOOD_CATEGORY_EMOJI: Record<string, string> = {
  Breakfast: "🥣", Bowls: "🥙", Snacks: "🍎", Drinks: "🧃", Imported: "📋",
};

const CATEGORY_ICONS: { label: string; emoji: string; filter: string }[] = [
  { label: "All", emoji: "🌿", filter: ALL_CATEGORIES },
  { label: "Breakfast", emoji: "🥣", filter: "Breakfast" },
  { label: "Bowls", emoji: "🥙", filter: "Bowls" },
  { label: "Snacks", emoji: "🍎", filter: "Snacks" },
  { label: "Drinks", emoji: "🧃", filter: "Drinks" },
  { label: "Imported", emoji: "📋", filter: "Imported" },
];

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

type EditableGrocery = { name: string; category: string; uses: number; estimatedCost: number; priceText?: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [recipePasteText, setRecipePasteText] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [stomachSafeOnly, setStomachSafeOnly] = useState(false);
  const [plan, setPlan] = useState<WeekPlan>(defaultPlan);
  const [selectedDay, setSelectedDay] = useState<DayKey>("Monday");
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("breakfast");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<(Recipe & { isNew?: boolean }) | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [budgetTarget, setBudgetTarget] = useState(WEEKLY_BUDGET_DEFAULT);
  const weeklyRecipes = useMemo(() => {
    return Object.values(plan).flatMap((day) => Object.values(day))
      .map((id) => getRecipeById(id, recipes))
      .filter((r): r is Recipe => Boolean(r));
  }, [plan, recipes]);
  const baseGroceries = useMemo(() => aggregateGroceries(weeklyRecipes), [weeklyRecipes]);
  const [editableGroceries, setEditableGroceries] = useState<EditableGrocery[]>(() =>
    aggregateGroceries(initialRecipes).map((item) => ({
      name: item.name, category: item.category, uses: item.uses, estimatedCost: item.estimatedCost,
    }))
  );
  const editableTotal = Number(editableGroceries.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2));
  const budgetRemaining = Number((budgetTarget - editableTotal).toFixed(2));
  const budgetPercent = Math.min(100, Math.round((editableTotal / budgetTarget) * 100));

  const [monthlyPicks, setMonthlyPicks] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState({ age: "", height: "", weight: "", gender: "female" });
  const [macroGoals, setMacroGoals] = useState({ calories: 1600, protein: 110, carbs: 160, fat: 55 });

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
      const matchesQuery = needle.length === 0 || recipe.name.toLowerCase().includes(needle) || recipe.tags.some((tag) => tag.toLowerCase().includes(needle));
      const matchesCategory = category === ALL_CATEGORIES || recipe.category === category;
      const matchesStomach = !stomachSafeOnly || recipe.stomachSafe;
      return matchesQuery && matchesCategory && matchesStomach;
    });
  }, [query, category, stomachSafeOnly, recipes]);

  const currentDayRecipes = useMemo(() => {
    const day = plan[selectedDay];
    return Object.entries(day).map(([slot, id]) => ({ slot: slot as SlotKey, recipe: getRecipeById(id, recipes) }));
  }, [plan, selectedDay, recipes]);

  const dayMacroTotal = useMemo(() =>
    sumMacros(currentDayRecipes.map(({ recipe }) => recipe).filter((r): r is Recipe => Boolean(r))),
    [currentDayRecipes]
  );

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
    macroGaps.carbs < -20 && `~${Math.abs(macroGaps.carbs)}g over carbs. Reduce rice or bread.`,
    macroGaps.fat > 10 && `Need ~${macroGaps.fat}g more fat. Add avocado, nuts, or olive oil.`,
  ].filter(Boolean) as string[];

  const nutritionPatterns = {
    protein: weeklyRecipes.some((r) => r.macros.protein >= 20),
    vegetables: weeklyRecipes.some((r) => r.tags.some((t) => ["greens", "vegetables", "spinach", "broccoli"].includes(t.toLowerCase()))),
    fruit: weeklyRecipes.some((r) => r.ingredients.some((i) => ["apple", "banana", "blueberr"].some((f) => i.item.toLowerCase().includes(f)))),
    calcium: weeklyRecipes.some((r) => r.ingredients.some((i) => ["yogurt", "milk", "cheese"].some((f) => i.item.toLowerCase().includes(f)))),
  };

  const nutritionGaps = [
    !nutritionPatterns.protein && "Protein may be low — add Greek yogurt, chicken, or eggs.",
    !nutritionPatterns.vegetables && "Vegetables may be low — add spinach, broccoli, or greens.",
    !nutritionPatterns.fruit && "Fruit may be low — add apples, bananas, or berries.",
    !nutritionPatterns.calcium && "Calcium may be low — add yogurt, milk, or cheese.",
  ].filter(Boolean) as string[];

  const ageNum = Number(profile.age);
  const weightNum = Number(profile.weight);
  const personalizedNotes = [
    profile.gender === "female" && ageNum >= 19 && "For adult women: iron, calcium, vitamin D, and omega-3s are common nutrients to monitor.",
    profile.gender === "male" && ageNum >= 19 && "For adult men: fiber, magnesium, potassium, and vitamin D are common nutrients to monitor.",
    ageNum >= 50 && "After 50: vitamin D, calcium, B12, and protein become especially important.",
    weightNum > 0 && weightNum < 120 && "Ensure you're getting enough calories, protein, iron, and healthy fats.",
    weightNum >= 180 && "Protein, fiber, and balanced blood-sugar meals may be especially helpful.",
  ].filter(Boolean) as string[];

  const mostPicked = Object.entries(monthlyPicks)
    .map(([id, count]) => ({ recipe: recipes.find((r) => r.id === id), count }))
    .filter((x) => x.recipe)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const todaySlots = currentDayRecipes.filter(({ recipe }) => recipe);

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

  function updateGrocery(i: number, field: keyof EditableGrocery, value: string) {
    setEditableGroceries((prev) => prev.map((item, idx) => {
      if (idx !== i) return item;
      if (field === "estimatedCost") return { ...item, priceText: value };
      return { ...item, [field]: value };
    }));
  }

  function commitPrice(i: number) {
    setEditableGroceries((prev) => prev.map((item, idx) => {
      if (idx !== i) return item;
      const parsed = parseFloat(item.priceText ?? String(item.estimatedCost));
      return { ...item, estimatedCost: isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100, priceText: undefined };
    }));
  }

  function addGroceryItem() {
    setEditableGroceries((prev) => [...prev, { name: "New item", category: "Custom", uses: 1, estimatedCost: 0 }]);
  }

  function deleteGroceryItem(i: number) {
    setEditableGroceries((prev) => prev.filter((_, idx) => idx !== i));
  }

  function resetBudget() {
    setBudgetTarget(WEEKLY_BUDGET_DEFAULT);
    setEditableGroceries(baseGroceries.map((item) => ({ name: item.name, category: item.category, uses: item.uses, estimatedCost: item.estimatedCost })));
  }

  function importRecipeFromText() {
    const text = recipePasteText.trim();
    if (!text) { alert("Paste a recipe first."); return; }
    if (recipes.length >= MAX_RECIPES) { alert(`Max ${MAX_RECIPES} recipes.`); return; }
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const name = lines[0] || "Untitled Recipe";
    const ingredientIdx = lines.findIndex((l) => /^ingredients?$/i.test(l));
    const instructionIdx = lines.findIndex((l) => /^(instructions?|directions?|method|steps?)$/i.test(l));
    let ingredientLines: string[] = [];
    let instructionLines: string[] = [];
    if (ingredientIdx !== -1 && instructionIdx !== -1) {
      ingredientLines = lines.slice(ingredientIdx + 1, instructionIdx);
      instructionLines = lines.slice(instructionIdx + 1);
    } else if (ingredientIdx !== -1) {
      ingredientLines = lines.slice(ingredientIdx + 1);
    } else {
      ingredientLines = lines.slice(1, 8);
    }
    const newRecipe: Recipe = {
      id: slugify(name), name, category: "Imported", source: "Imported",
      stomachSafe: true, lowSpice: true, noTomato: false, servings: 1, servingSize: "1 serving",
      ingredients: ingredientLines.map((line) => ({ item: line, amount: "" })),
      instructions: instructionLines.length > 0 ? instructionLines : ["Edit this recipe to add instructions."],
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      tags: ["imported"],
      groceryItems: ingredientLines.map((line) => ({ name: line, amount: "", category: "Custom", estimatedCost: 0 })),
    };
    setRecipes((prev) => [...prev, newRecipe]);
    setEditingRecipe({ ...newRecipe, isNew: false });
    setRecipePasteText("");
  }

  // ── RECIPE EDITOR ──
  if (editingRecipe) {
    return (
      <div style={s.shell}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => setEditingRecipe(null)}>← Back</button>
          <div style={s.topBarTitle}>{editingRecipe.isNew ? "New Recipe" : "Edit Recipe"}</div>
          <button style={s.pillBtn} onClick={saveRecipe}>Save</button>
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
                  {["Breakfast", "Bowls", "Snacks", "Drinks", "Imported"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={s.fieldLabel}>Servings</div>
                <input style={s.fieldInput} type="number" value={editingRecipe.servings} onChange={(e) => updateField("servings", Number(e.target.value))} />
              </div>
            </div>
            <div style={s.fieldLabel}>Macros per serving</div>
            <div style={s.macroInputRow}>
              {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
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
              {([["stomachSafe", "Stomach-safe"], ["lowSpice", "Low spice"], ["noTomato", "No tomato"]] as const).map(([key, label]) => (
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

  return (
    <div style={s.shell}>
      {/* ── TOP BAR ── */}
      {screen === "home" && (
        <div style={s.topBarHome}>
          <div>
            <div style={s.topBarEyebrow}>Good morning,</div>
            <div style={s.topBarTitle}>Glow Kitchen 🌿</div>
          </div>
          <div style={s.bellBtn}>🔔</div>
        </div>
      )}
      {screen !== "home" && (
        <div style={s.topBar}>
          <div>
            <div style={s.topBarEyebrow}>Good morning,</div>
            <div style={s.topBarTitle}>Glow Kitchen 🌿</div>
          </div>
          <div style={s.bellBtn}>🔔</div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <nav style={s.bottomNav}>
        {([["home", "🏠", "Home"], ["planner", "📅", "Plan"], ["recipes", "🍽", "Recipes"], ["budget", "🛒", "Groceries"], ["insights", "📊", "Profile"]] as [Screen, string, string][]).map(([sc, emoji, label]) => (
          <button key={sc} style={{ ...s.navBtn, ...(screen === sc ? s.navBtnActive : {}) }} onClick={() => setScreen(sc)}>
            <span style={s.navEmoji}>{emoji}</span>
            <span style={{ ...s.navLabel, ...(screen === sc ? { color: "#7c8a64", fontWeight: 700 } : {}) }}>{label}</span>
            {screen === sc && <div style={s.navDot} />}
          </button>
        ))}
      </nav>

      <div style={s.screenWrap}>

       {/* ── HOME ── */}
{screen === "home" && (
  <div style={{ ...s.screen, padding: 0 }}>
    <div style={s.heroHeader}>
      <div>
        <p style={s.heroGreeting}>Good morning,</p>
        <h1 style={s.heroTitle}>
          Glow Kitchen <span style={s.heroLeaf}>🌿</span>
        </h1>
      </div>
      <button style={s.heroBellButton}>♡</button>
    </div>

    <div style={s.heroImageFrame}>
      <img
        src="https://media.base44.com/images/public/69f2c6fa21f32c9cfaebac4e/40dec8fb1_generated_image.png"
        alt="Glow Kitchen hero"
        style={s.heroImage}
      />
    </div>

    <div style={s.homeContent}>
      <div style={s.sectionTitle}>Quick Actions</div>

      <div style={s.quickActionGrid}>
        {([
          ["planner", "https://media.base44.com/images/public/69f2c6fa21f32c9cfaebac4e/78235ac15_generated_image.png", "Meal Plan"],
          ["budget", "https://media.base44.com/images/public/69f2c6fa21f32c9cfaebac4e/927aa8639_generated_image.png", "Groceries"],
          ["recipes", "https://media.base44.com/images/public/69f2c6fa21f32c9cfaebac4e/adba70ce8_generated_image.png", "Recipes"],
          ["insights", "https://media.base44.com/images/public/69f2c6fa21f32c9cfaebac4e/b300fa93d_generated_image.png", "Budget"],
        ] as [Screen, string, string][]).map(([sc, img, label]) => (
          <button key={sc} style={s.quickActionBtn} onClick={() => setScreen(sc)}>
            <img src={img} alt={label} style={s.quickActionImg} />
            <div style={s.quickActionLabel}>{label}</div>
          </button>
        ))}
      </div>

      <div style={s.sectionTitle}>Today&apos;s Plan</div>
      <div style={s.todayCard}>
        {todaySlots.length === 0 ? (
          <div style={s.emptyState}>No meals planned yet — go to Plan! 🌱</div>
        ) : (
          todaySlots.slice(0, 3).map(({ slot, recipe }) => recipe && (
            <div key={slot} style={s.todayRow}>
              <div style={s.todayFoodImg}>{FOOD_CATEGORY_EMOJI[recipe.category] || "🍽"}</div>
              <div style={s.todayInfo}>
                <div style={s.todayName}>{recipe.name}</div>
                <div style={s.todayMeta}>
                  with {recipe.ingredients.slice(0, 2).map((i) => i.item).join(", ") || "fresh ingredients"}
                </div>
              </div>
              <button style={s.heartBtn}>♡</button>
            </div>
          ))
        )}
      </div>

      <div style={s.sectionTitle}>Weekly Budget</div>
      <div style={s.budgetMiniCard}>
        <div style={s.budgetMiniLeft}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#F0EBE0" strokeWidth="7" />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="#7C8A64"
              strokeWidth="7"
              strokeDasharray={`${budgetPercent * 1.634} 163.4`}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
            />
          </svg>

          <div style={s.budgetMiniText}>
            <div style={s.budgetMiniAmount}>{currency(editableTotal)}</div>
            <div style={s.budgetMiniSub}>of {currency(budgetTarget)}</div>
            <div style={s.budgetMiniPct}>{budgetPercent}% of weekly budget</div>
          </div>
        </div>

        <div style={s.budgetMiniItems}>
          <div style={s.budgetMiniRow}>
            <span style={{ ...s.budgetDot, background: "#7C8A64" }} />
            <span>Groceries</span>
            <span style={s.budgetMiniVal}>{currency(editableTotal)}</span>
          </div>
          <div style={s.budgetMiniRow}>
            <span style={{ ...s.budgetDot, background: "#E8C9A0" }} />
            <span>Left</span>
            <span style={s.budgetMiniVal}>{currency(Math.max(0, budgetRemaining))}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
        {/* ── RECIPES ── */}
        {screen === "recipes" && (
          <div style={s.screen}>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Recipes 🍽</div>
              <button style={s.pillBtn} onClick={openNewRecipe}>+ New</button>
            </div>

            {/* Paste importer */}
            <div style={s.importCard}>
              <div style={s.importTitle}>📋 Paste from Google Docs</div>
              <textarea style={s.importTextarea} value={recipePasteText} onChange={(e) => setRecipePasteText(e.target.value)}
                placeholder={"Recipe Name\n\nIngredients\nItem 1\nItem 2\n\nInstructions\nStep 1\nStep 2"} />
              <button style={s.importBtn} onClick={importRecipeFromText}>Import Recipe</button>
            </div>

            {/* Search */}
            <div style={s.searchWrap}>
              <span style={s.searchIcon}>🔍</span>
              <input style={s.searchBar} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipes or tags…" />
            </div>

            {/* Category pills */}
            <div style={s.categoryScroll}>
              {CATEGORY_ICONS.map(({ label, emoji, filter }) => (
                <button key={filter} style={{ ...s.categoryPill, ...(category === filter ? s.categoryPillActive : {}) }} onClick={() => setCategory(filter)}>
                  {emoji} {label}
                </button>
              ))}
            </div>

            {/* Stomach safe toggle */}
            <button style={{ ...s.stomachBtn, ...(stomachSafeOnly ? s.stomachBtnOn : {}) }} onClick={() => setStomachSafeOnly(!stomachSafeOnly)}>
              {stomachSafeOnly ? "✓ " : ""}Stomach-safe only
            </button>

            {/* Add to plan strip */}
            <div style={s.planStrip}>
              <span style={s.planStripLabel}>Adding to →</span>
              <select style={s.miniSelect} value={selectedDay} onChange={(e) => { setSelectedDay(e.target.value as DayKey); setSelectedSlot(Object.keys(plan[e.target.value as DayKey])[0] as SlotKey); }}>
                {Object.keys(plan).map((d) => <option key={d}>{d}</option>)}
              </select>
              <select style={s.miniSelect} value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value as SlotKey)}>
                {Object.keys(plan[selectedDay]).map((sl) => <option key={sl} value={sl}>{capitalize(sl)}</option>)}
              </select>
            </div>

            {/* Recipe cards */}
            <div style={s.recipeGrid}>
              {filteredRecipes.map((recipe) => {
                const isExpanded = expandedRecipe === recipe.id;
                const isAdded = addedId === recipe.id;
                const confirmingDelete = deleteConfirm === recipe.id;
                return (
                  <div key={recipe.id} style={s.recipeCard}>
                    <button style={s.recipeCardHeader} onClick={() => setExpandedRecipe(isExpanded ? null : recipe.id)}>
                      <div style={s.recipeEmojiBig}>{FOOD_CATEGORY_EMOJI[recipe.category] || "🍽"}</div>
                      <div style={s.recipeCardBody}>
                        <div style={s.recipeCardName}>{recipe.name}</div>
                        <div style={s.recipeCardMeta}>{recipe.macros.calories} cal · {recipe.macros.protein}g protein</div>
                        <div style={s.recipeTagRow}>
                          <span style={s.recipeTag}>{recipe.category}</span>
                          {recipe.stomachSafe && <span style={s.recipeTagGreen}>stomach-safe</span>}
                        </div>
                      </div>
                      <div style={s.recipeChevron}>{isExpanded ? "▲" : "▼"}</div>
                    </button>

                    {isExpanded && (
                      <div style={s.recipeExpanded}>
                        <div style={s.macroRow}>
                          {[{ l: "Cal", v: recipe.macros.calories }, { l: "Protein", v: `${recipe.macros.protein}g` }, { l: "Carbs", v: `${recipe.macros.carbs}g` }, { l: "Fat", v: `${recipe.macros.fat}g` }].map((m) => (
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
                            {recipe.instructions.map((step, i) => <div key={i} style={s.expandRow}><span style={s.expandNum}>{i + 1}</span><span>{step}</span></div>)}
                          </div>
                        )}
                        <button style={{ ...s.addBtn, background: isAdded ? "#7c8a64" : "#e8f0e0", color: isAdded ? "#fff" : "#4d5a3d" }} onClick={() => assignRecipe(recipe.id)}>
                          {isAdded ? "✓ Added to plan!" : `+ Add to ${selectedDay} ${capitalize(selectedSlot)}`}
                        </button>
                        <div style={s.recipeActions}>
                          <button style={s.editBtn} onClick={() => openEditRecipe(recipe)}>✏️ Edit</button>
                          {confirmingDelete ? (
                            <div style={s.confirmRow}>
                              <span style={s.confirmText}>Delete?</span>
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
                  <div style={s.dayChipShort}>{day.slice(0, 3)}</div>
                </button>
              ))}
            </div>
            <div style={s.dayMacroCard}>
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
                  <div style={s.slotCardLeft}>
                    <div style={s.slotEmoji}>{recipe ? (FOOD_CATEGORY_EMOJI[recipe.category] || "🍽") : "+"}</div>
                    <div>
                      <div style={s.slotBadge}>{capitalize(slot)}</div>
                      <div style={s.slotCardName}>{recipe ? recipe.name : "— empty —"}</div>
                      {recipe && <div style={s.slotCardMeta}>{recipe.macros.calories} cal · {recipe.macros.protein}g protein</div>}
                    </div>
                  </div>
                  {recipe && <button style={s.clearBtn} onClick={() => clearSlot(selectedDay, slot)}>✕</button>}
                </div>
              ))}
            </div>
            <button style={s.goRecipesBtn} onClick={() => setScreen("recipes")}>+ Browse Recipes</button>
          </div>
        )}

        {/* ── BUDGET / GROCERIES ── */}
        {screen === "budget" && (
          <div style={s.screen}>
            <div style={s.pageHeader}><div style={s.pageTitle}>Groceries 🛒</div></div>

            {/* Budget card */}
            <div style={s.budgetSummaryCard}>
              <div style={s.budgetSummaryRow}>
                <div>
                  <div style={s.budgetLabel}>Weekly</div>
                  <div style={s.budgetBig}>{currency(editableTotal)}</div>
                </div>
                <div style={s.budgetDivider} />
                <div>
                  <div style={s.budgetLabel}>Monthly est.</div>
                  <div style={s.budgetBig}>{currency(Number((editableTotal * 4.33).toFixed(2)))}</div>
                </div>
                <div style={s.budgetDivider} />
                <div>
                  <div style={s.budgetLabel}>Remaining</div>
                  <div style={{ ...s.budgetBig, color: budgetRemaining >= 0 ? "#7c8a64" : "#c97b5a" }}>{currency(Math.abs(budgetRemaining))}</div>
                </div>
              </div>
              <div style={s.budgetTrack}>
                <div style={{ ...s.budgetFill, width: `${budgetPercent}%` }} />
              </div>
            </div>

            {/* Budget target */}
            <div style={s.budgetTargetRow}>
              <span style={s.budgetTargetLabel}>Weekly target: $</span>
              <input type="number" style={s.budgetTargetInput} value={budgetTarget} onChange={(e) => setBudgetTarget(Number(e.target.value) || 0)} />
              <button style={s.resetChip} onClick={resetBudget}>↺ Reset</button>
            </div>

            {/* Grocery category filter */}
            <div style={s.groceryCatRow}>
              {["All", "Pantry", "Fridge", "Frozen", "Custom"].map((cat) => (
                <button key={cat} style={s.groceryCatChip}>{cat}</button>
              ))}
            </div>

            {/* Grocery list */}
            <div style={s.groceryList}>
              {editableGroceries.map((item, i) => (
                <div key={`${item.name}-${i}`} style={s.groceryRow}>
                  <div style={s.groceryEmoji}>{["🥬", "🥩", "🧀", "🌾", "🫙"][i % 5]}</div>
                  <div style={s.groceryInfo}>
                    <input style={s.groceryNameInput} value={item.name} onChange={(e) => updateGrocery(i, "name", e.target.value)} placeholder="Item name" />
                    <input style={s.groceryCatInput} value={item.category} onChange={(e) => updateGrocery(i, "category", e.target.value)} placeholder="Category" />
                  </div>
                  <div style={s.groceryPriceWrap}>
                    <span style={s.groceryDollar}>$</span>
                    <input type="text" inputMode="decimal" style={s.groceryCostInput}
                      value={item.priceText !== undefined ? item.priceText : (item.estimatedCost === 0 ? "" : String(item.estimatedCost))}
                      onChange={(e) => updateGrocery(i, "estimatedCost", e.target.value)}
                      onBlur={() => commitPrice(i)} placeholder="0.00" />
                  </div>
                  <button style={s.groceryDeleteBtn} onClick={() => deleteGroceryItem(i)}>✕</button>
                </div>
              ))}
            </div>
            <button style={s.addGroceryBtn} onClick={addGroceryItem}>+ Add Item</button>
          </div>
        )}

        {/* ── INSIGHTS / PROFILE ── */}
        {screen === "insights" && (
          <div style={s.screen}>
            <div style={s.pageHeader}><div style={s.pageTitle}>Profile & Insights 📊</div></div>

            {/* Profile */}
            <div style={s.insightSection}>
              <div style={s.insightSectionTitle}>Your Profile</div>
              <div style={s.profileGrid}>
                {([["age", "Age", "number", ""], ["height", "Height", "text", "5'4\""], ["weight", "lbs", "number", ""]] as [keyof typeof profile, string, string, string][]).map(([field, label, type, ph]) => (
                  <div key={field} style={s.profileBox}>
                    <div style={s.profileBoxLabel}>{label}</div>
                    <input style={s.profileBoxInput} type={type} value={profile[field]} onChange={(e) => setProfile((prev) => ({ ...prev, [field]: e.target.value }))} placeholder={ph} />
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
            <div style={s.insightSection}>
              <div style={s.insightSectionTitle}>Macro Goals</div>
              {(["calories", "protein", "carbs", "fat"] as const).map((key) => {
                const current = averageDailyMacros[key];
                const goal = macroGoals[key];
                const pct = Math.min(100, Math.round((current / goal) * 100));
                const ok = pct >= 80 && pct <= 120;
                return (
                  <div key={key} style={s.macroGoalRow}>
                    <div style={s.macroGoalLabel}>{capitalize(key)}</div>
                    <div style={s.macroGoalBar}><div style={{ ...s.macroGoalFill, width: `${pct}%`, background: ok ? "#7c8a64" : "#e8a598" }} /></div>
                    <div style={s.macroGoalNums}>
                      <span style={{ color: ok ? "#7c8a64" : "#c97b5a", fontSize: 12, fontWeight: 700 }}>{current}</span>
                      <span style={{ color: "#c9b99a", fontSize: 11 }}>/</span>
                      <input type="number" style={s.macroGoalInput} value={goal} onChange={(e) => setMacroGoals((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Suggestions */}
            {macroSuggestions.length > 0 && (
              <div style={s.insightSection}>
                <div style={s.insightSectionTitle}>Recipe Suggestions</div>
                {macroSuggestions.map((tip) => <div key={tip} style={s.insightRow}><span style={s.insightDot}>→</span><span>{tip}</span></div>)}
              </div>
            )}

            {/* Nutrition gaps */}
            <div style={s.insightSection}>
              <div style={s.insightSectionTitle}>Nutrition Check</div>
              {nutritionGaps.length === 0
                ? <div style={{ color: "#7c8a64", fontWeight: 600, fontSize: 13 }}>✓ Looking balanced!</div>
                : nutritionGaps.map((gap) => <div key={gap} style={s.insightRow}><span style={s.insightDot}>⚠</span><span>{gap}</span></div>)
              }
              {personalizedNotes.map((note) => <div key={note} style={s.insightRow}><span style={s.insightDot}>ℹ</span><span>{note}</span></div>)}
              <div style={s.disclaimer}>Food-pattern check only, not medical advice.</div>
            </div>

            {/* Meals eaten most */}
            <div style={s.insightSection}>
              <div style={s.insightSectionTitle}>Meals You Eat Most</div>
              {(() => {
                const mealCount: Record<string, number> = {};
                Object.values(plan).forEach((day) => { Object.values(day).forEach((id) => { if (id) mealCount[id] = (mealCount[id] || 0) + 1; }); });
                const sorted = Object.entries(mealCount).map(([id, count]) => ({ recipe: recipes.find((r) => r.id === id), count })).filter((x) => x.recipe).sort((a, b) => b.count - a.count);
                return sorted.length === 0
                  ? <div style={{ color: "#8b7d6b", fontSize: 13, fontStyle: "italic" }}>Plan meals to see patterns.</div>
                  : sorted.map(({ recipe, count }, i) => recipe && (
                    <div key={recipe.id} style={s.insightRow}>
                      <span style={{ ...s.insightDot, color: "#c9b99a", minWidth: 18, textAlign: "right" }}>{i + 1}</span>
                      <span style={{ flex: 1 }}>{recipe.name}</span>
                      <span style={{ color: "#7c8a64", fontWeight: 700, fontSize: 12 }}>{count}x</span>
                    </div>
                  ));
              })()}
            </div>
            <div style={{ height: 16 }} />
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  // Home hero
  heroWrap: { width: "100%", position: "relative" as const, overflow: "hidden" },
  heroIllustration: {
    width: "100%", height: 280, background: "linear-gradient(160deg, #fdefc8 0%, #fae0d0 40%, #e8d8f0 100%)",
    position: "relative" as const, overflow: "hidden", display: "flex", alignItems: "flex-end",
  },
  heroBgCircle1: { position: "absolute" as const, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.3)", top: -60, right: -40 },
  heroBgCircle2: { position: "absolute" as const, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,240,200,0.4)", bottom: 20, left: -30 },
  heroFlowers: { position: "absolute" as const, top: 20, right: 20, fontSize: 28, letterSpacing: 4 },
  heroFigure: { position: "absolute" as const, bottom: 0, right: 30, display: "flex", alignItems: "flex-end", gap: 8 },
  heroCharacter: { textAlign: "center" as const },
  heroCharHead: { fontSize: 120, lineHeight: 1, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" },
  heroCat: { fontSize: 48, marginBottom: 8 },
  speechBubble: {
    position: "absolute" as const, top: 40, left: 20,
    background: "rgba(255,255,255,0.92)", borderRadius: 18, padding: "14px 18px",
    maxWidth: 180, boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    border: "1px solid rgba(255,255,255,0.8)",
  },
  speechBubbleText: { fontSize: 14, fontWeight: 600, color: "#3a3228", lineHeight: 1.4 },
  speechBubbleTail: {
    position: "absolute" as const, bottom: -10, left: 24,
    width: 0, height: 0,
    borderLeft: "10px solid transparent",
    borderRight: "10px solid transparent",
    borderTop: "10px solid rgba(255,255,255,0.92)",
  },
  homeContent: { padding: "16px 16px 0" },
  topBarHome: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 12px", position: "absolute" as const, top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 10, background: "transparent" },
  quickActionIcon: { width: 52, height: 52, borderRadius: 16, background: "#faf6ee", border: "1px solid #e8e0d0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.06)" },
  todayFoodImg: { width: 52, height: 52, borderRadius: 12, background: "#f4efe3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 },
  homeContent2: {},
  shell: { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#faf6ee", color: "#3a3228", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', -apple-system, sans-serif", position: "relative" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 12px", background: "#faf6ee", flexShrink: 0 },
  topBarEyebrow: { fontSize: 12, color: "#8b7d6b" },
  topBarTitle: { fontSize: 20, fontWeight: 800, color: "#3a3228" },
  bellBtn: { fontSize: 20, background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: "8px 10px", cursor: "pointer" },
  backBtn: { background: "transparent", border: "none", color: "#7c8a64", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "6px 0" },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#ffffffee", backdropFilter: "blur(12px)", borderTop: "1px solid #e8e0d0", display: "flex", padding: "8px 0 14px", zIndex: 100 },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "transparent", border: "none", cursor: "pointer", padding: "4px 0", position: "relative" },
  navBtnActive: {},
  navEmoji: { fontSize: 20, lineHeight: 1 },
  navLabel: { fontSize: 10, color: "#8b7d6b", fontWeight: 500 },
  navDot: { width: 4, height: 4, borderRadius: 99, background: "#7c8a64", position: "absolute", bottom: -4 },
  screenWrap: { flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 90 },
  screen: { padding: "8px 16px 0" },

  // Home
  heroCard: { background: "linear-gradient(135deg, #e8f0e0 0%, #fdeee8 100%)", borderRadius: 20, padding: "20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e0d4c0" },
  heroText: {},
  heroSub: { fontSize: 13, color: "#8b7d6b", marginBottom: 4 },
  heroMain: { fontSize: 16, fontWeight: 700, color: "#3a3228", maxWidth: 200, lineHeight: 1.4 },
  heroEmoji: { fontSize: 48 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#3a3228", marginBottom: 12, marginTop: 4 },
  quickActionGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 },
  quickActionBtn: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 16, padding: "14px 8px", textAlign: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  quickActionEmoji: { fontSize: 24, marginBottom: 6 },
  quickActionLabel: { fontSize: 11, fontWeight: 600, color: "#3a3228" },
  todayCard: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 16, padding: "14px 16px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  todayRow: { display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid #f4efe3", marginBottom: 12 },
  todayEmoji: { fontSize: 28, flexShrink: 0 },
  todayInfo: { flex: 1 },
  todayName: { fontSize: 14, fontWeight: 600, color: "#3a3228" },
  todayMeta: { fontSize: 12, color: "#8b7d6b", marginTop: 2 },
  heartBtn: { fontSize: 16, background: "transparent", border: "none", cursor: "pointer" },
  budgetMiniCard: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 16, padding: "14px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  budgetMiniLeft: { display: "flex", alignItems: "center", gap: 10 },
  budgetMiniText: {},
  budgetMiniAmount: { fontSize: 18, fontWeight: 800, color: "#3a3228" },
  budgetMiniSub: { fontSize: 11, color: "#8b7d6b" },
  budgetMiniPct: { fontSize: 11, color: "#7c8a64", fontWeight: 600 },
  budgetMiniItems: { flex: 1 },
  budgetMiniRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#3a3228", marginBottom: 6 },
  budgetMiniVal: { marginLeft: "auto", fontWeight: 700 },
  budgetDot: { width: 8, height: 8, borderRadius: 99, flexShrink: 0 },

  // Recipes
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingTop: 4 },
  pageTitle: { fontSize: 22, fontWeight: 800, color: "#3a3228" },
  pillBtn: { background: "#7c8a64", border: "none", borderRadius: 20, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  importCard: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 16, padding: 14, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  importTitle: { fontSize: 13, fontWeight: 700, color: "#3a3228", marginBottom: 8 },
  importTextarea: { width: "100%", minHeight: 90, padding: "10px 12px", borderRadius: 10, border: "1px solid #e8e0d0", background: "#faf6ee", color: "#3a3228", fontSize: 12, boxSizing: "border-box", resize: "vertical" },
  importBtn: { marginTop: 8, padding: "9px 16px", borderRadius: 20, border: "none", background: "#7c8a64", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  searchWrap: { display: "flex", alignItems: "center", background: "#fff", border: "1px solid #e8e0d0", borderRadius: 14, padding: "10px 14px", marginBottom: 12, gap: 8 },
  searchIcon: { fontSize: 14 },
  searchBar: { flex: 1, background: "transparent", border: "none", color: "#3a3228", fontSize: 14, outline: "none" },
  categoryScroll: { display: "flex", gap: 8, overflowX: "auto", marginBottom: 10, paddingBottom: 4 },
  categoryPill: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 99, padding: "6px 14px", fontSize: 12, color: "#8b7d6b", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
  categoryPillActive: { background: "#7c8a64", border: "1px solid #7c8a64", color: "#fff", fontWeight: 700 },
  stomachBtn: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 99, padding: "5px 12px", fontSize: 11, color: "#8b7d6b", cursor: "pointer", marginBottom: 12 },
  stomachBtnOn: { background: "#e8f0e0", border: "1px solid #7c8a64", color: "#4d5a3d", fontWeight: 700 },
  planStrip: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: "10px 14px", marginBottom: 14, flexWrap: "wrap" },
  planStripLabel: { fontSize: 12, color: "#8b7d6b", flexShrink: 0 },
  miniSelect: { background: "#faf6ee", border: "1px solid #e8e0d0", borderRadius: 8, padding: "5px 10px", color: "#3a3228", fontSize: 12, cursor: "pointer" },
  recipeGrid: { display: "flex", flexDirection: "column", gap: 10 },
  recipeCard: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  recipeCardHeader: { display: "flex", alignItems: "center", padding: "14px 16px", width: "100%", background: "transparent", border: "none", color: "#3a3228", cursor: "pointer", textAlign: "left", gap: 12 },
  recipeEmojiBig: { fontSize: 32, flexShrink: 0 },
  recipeCardBody: { flex: 1 },
  recipeCardName: { fontSize: 15, fontWeight: 700, color: "#3a3228" },
  recipeCardMeta: { fontSize: 12, color: "#8b7d6b", marginTop: 2 },
  recipeTagRow: { display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" },
  recipeTag: { background: "#f4efe3", borderRadius: 99, padding: "2px 8px", fontSize: 10, color: "#8b7d6b" },
  recipeTagGreen: { background: "#e8f0e0", borderRadius: 99, padding: "2px 8px", fontSize: 10, color: "#4d5a3d" },
  recipeChevron: { fontSize: 10, color: "#c9b99a", flexShrink: 0 },
  recipeExpanded: { padding: "0 16px 16px", borderTop: "1px solid #f4efe3" },
  macroRow: { display: "flex", gap: 8, paddingTop: 12, marginBottom: 12 },
  macroBox: { flex: 1, background: "#faf6ee", borderRadius: 12, padding: "8px 6px", textAlign: "center" },
  macroVal: { fontSize: 14, fontWeight: 700, color: "#3a3228" },
  macroLbl: { fontSize: 10, color: "#8b7d6b", marginTop: 2 },
  expandSection: { marginBottom: 10 },
  expandTitle: { fontSize: 11, fontWeight: 700, color: "#7c8a64", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 },
  expandRow: { display: "flex", gap: 8, fontSize: 13, color: "#3a3228", marginBottom: 4, lineHeight: 1.5 },
  expandDot: { color: "#e8a598", flexShrink: 0 },
  expandNum: { color: "#e8a598", fontWeight: 700, flexShrink: 0, minWidth: 16 },
  addBtn: { width: "100%", border: "none", borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 10, marginTop: 4 },
  recipeActions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  editBtn: { background: "#faf6ee", border: "1px solid #e8e0d0", borderRadius: 10, padding: "7px 14px", color: "#3a3228", fontSize: 12, cursor: "pointer" },
  deleteBtn: { background: "#fdeee8", border: "1px solid #e8a598", borderRadius: 10, padding: "7px 14px", color: "#b06040", fontSize: 12, cursor: "pointer" },
  confirmRow: { display: "flex", gap: 6, alignItems: "center" },
  confirmText: { fontSize: 12, color: "#c97b5a" },
  confirmYes: { background: "#c97b5a", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  confirmNo: { background: "#faf6ee", border: "none", borderRadius: 8, padding: "6px 12px", color: "#8b7d6b", fontSize: 12, cursor: "pointer" },
  recipeCount: { textAlign: "center", fontSize: 11, color: "#c9b99a", padding: "12px 0 4px" },
  emptyState: { textAlign: "center", color: "#8b7d6b", padding: "20px 0", fontSize: 13 },

  // Planner
  dayScroll: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  dayChip: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: "8px 14px", cursor: "pointer", textAlign: "center" },
  dayChipActive: { background: "#7c8a64", border: "1px solid #7c8a64" },
  dayChipShort: { fontSize: 13, fontWeight: 700, color: "inherit" },
  dayMacroCard: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 14, padding: "10px 16px", display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" },
  dayMacroItem: { fontSize: 13, color: "#3a3228" },
  slotTabRow: { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  slotTab: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 99, padding: "6px 14px", fontSize: 12, color: "#8b7d6b", cursor: "pointer" },
  slotTabActive: { background: "#e8f0e0", border: "1px solid #7c8a64", color: "#4d5a3d", fontWeight: 700 },
  slotList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  slotCard: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  slotCardActive: { border: "1px solid #7c8a64", background: "#f8fbf6" },
  slotCardLeft: { display: "flex", alignItems: "center", gap: 12 },
  slotEmoji: { fontSize: 28 },
  slotBadge: { fontSize: 10, fontWeight: 700, color: "#7c8a64", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 },
  slotCardName: { fontSize: 14, fontWeight: 600, color: "#3a3228" },
  slotCardMeta: { fontSize: 11, color: "#8b7d6b", marginTop: 2 },
  clearBtn: { background: "transparent", border: "none", color: "#c9b99a", fontSize: 14, cursor: "pointer" },
  goRecipesBtn: { width: "100%", background: "#7c8a64", border: "none", borderRadius: 14, padding: "14px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 16 },

  // Budget
  budgetSummaryCard: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 18, padding: 18, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  budgetSummaryRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  budgetLabel: { fontSize: 10, color: "#8b7d6b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 },
  budgetBig: { fontSize: 20, fontWeight: 800, color: "#3a3228" },
  budgetDivider: { width: 1, background: "#e8e0d0", alignSelf: "stretch", margin: "0 4px" },
  budgetTrack: { height: 8, background: "#f4efe3", borderRadius: 99, overflow: "hidden" },
  budgetFill: { height: "100%", background: "#7c8a64", borderRadius: 99, transition: "width 0.5s ease" },
  budgetTargetRow: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: "10px 14px", marginBottom: 14 },
  budgetTargetLabel: { fontSize: 13, color: "#8b7d6b" },
  budgetTargetInput: { flex: 1, background: "transparent", border: "none", color: "#3a3228", fontSize: 16, fontWeight: 800, outline: "none" },
  resetChip: { background: "#faf6ee", border: "1px solid #e8e0d0", borderRadius: 99, padding: "5px 10px", color: "#8b7d6b", fontSize: 11, cursor: "pointer" },
  groceryCatRow: { display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" },
  groceryCatChip: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 99, padding: "5px 12px", fontSize: 12, color: "#8b7d6b", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
  groceryList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  groceryRow: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  groceryEmoji: { fontSize: 24, flexShrink: 0 },
  groceryInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  groceryNameInput: { background: "transparent", border: "none", color: "#3a3228", fontSize: 14, fontWeight: 600, outline: "none", width: "100%" },
  groceryCatInput: { background: "transparent", border: "none", color: "#8b7d6b", fontSize: 11, outline: "none", width: "100%" },
  groceryPriceWrap: { display: "flex", alignItems: "center", gap: 2, background: "#f8fbf6", border: "1.5px solid #7c8a64", borderRadius: 10, padding: "8px 10px", minWidth: 80 },
  groceryDollar: { fontSize: 14, fontWeight: 700, color: "#7c8a64" },
  groceryCostInput: { width: 54, background: "transparent", border: "none", color: "#3a3228", fontSize: 16, fontWeight: 700, textAlign: "right" as const, outline: "none" },
  groceryDeleteBtn: { background: "transparent", border: "none", color: "#c9b99a", fontSize: 14, cursor: "pointer", padding: "2px 4px" },
  addGroceryBtn: { width: "100%", background: "#7c8a64", border: "none", borderRadius: 14, padding: "13px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16 },

  // Insights
  insightSection: { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 16, padding: "14px 16px", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  insightSectionTitle: { fontSize: 14, fontWeight: 700, color: "#3a3228", marginBottom: 12 },
  profileGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  profileBox: { background: "#faf6ee", borderRadius: 12, padding: "10px 12px" },
  profileBoxLabel: { fontSize: 10, color: "#8b7d6b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 },
  profileBoxInput: { width: "100%", background: "transparent", border: "none", color: "#3a3228", fontSize: 15, fontWeight: 700, outline: "none" },
  macroGoalRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  macroGoalLabel: { fontSize: 12, fontWeight: 600, color: "#8b7d6b", width: 54, flexShrink: 0 },
  macroGoalBar: { flex: 1, height: 6, background: "#faf6ee", borderRadius: 99, overflow: "hidden" },
  macroGoalFill: { height: "100%", borderRadius: 99, transition: "width 0.4s ease" },
  macroGoalNums: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  macroGoalInput: { width: 50, background: "#faf6ee", border: "1px solid #e8e0d0", borderRadius: 8, padding: "3px 6px", color: "#3a3228", fontSize: 12, textAlign: "right" },
  insightRow: { display: "flex", gap: 10, fontSize: 13, color: "#3a3228", lineHeight: 1.5, marginBottom: 6 },
  insightDot: { color: "#7c8a64", flexShrink: 0, fontSize: 12 },
  disclaimer: { fontSize: 11, color: "#c9b99a", marginTop: 8, fontStyle: "italic" },

  // Editor
  fieldGroup: { marginBottom: 16 },
  fieldRow: { display: "flex", gap: 10, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "#7c8a64", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 },
  fieldLabelRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  fieldInput: { width: "100%", background: "#faf6ee", border: "1px solid #e8e0d0", borderRadius: 10, padding: "11px 13px", color: "#3a3228", fontSize: 13, boxSizing: "border-box" },
  fieldSelect: { width: "100%", background: "#faf6ee", border: "1px solid #e8e0d0", borderRadius: 10, padding: "11px 13px", color: "#3a3228", fontSize: 13 },
  macroInputRow: { display: "flex", gap: 8, marginBottom: 16 },
  macroInputBox: { flex: 1, background: "#faf6ee", border: "1px solid #e8e0d0", borderRadius: 10, padding: "10px 6px", textAlign: "center" },
  macroInputLabel: { fontSize: 9, color: "#8b7d6b", marginBottom: 5, textTransform: "uppercase" },
  macroInput: { width: "100%", background: "transparent", border: "none", color: "#3a3228", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" },
  ingredientRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 },
  stepNum: { color: "#e8a598", fontWeight: 700, fontSize: 13, flexShrink: 0, minWidth: 18 },
  addRowBtn: { background: "#e8f0e0", border: "1px solid #7c8a6466", borderRadius: 8, padding: "4px 10px", color: "#4d5a3d", fontSize: 12, cursor: "pointer" },
  removeRowBtn: { background: "transparent", border: "none", color: "#c9b99a", fontSize: 14, cursor: "pointer", padding: "4px 6px", flexShrink: 0 },
  toggleRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  toggleChip: { background: "#faf6ee", border: "1px solid #e8e0d0", borderRadius: 99, padding: "7px 14px", color: "#8b7d6b", fontSize: 12, cursor: "pointer" },
  toggleChipOn: { background: "#e8f0e0", border: "1px solid #7c8a64", color: "#4d5a3d", fontWeight: 700 },
};
