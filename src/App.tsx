
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
function FoodIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Breakfast: "#F7C873",
    Bowls: "#A9B17A",
    Drinks: "#F2A07F",
    Snacks: "#C58BD3",
    Imported: "#8EC5D6",
    Proteins: "#E98973",
    "Fruits & Vegetables": "#93C47D",
    "Grains & Pasta": "#E6B86A",
    "Dairy & Eggs": "#F4DFA3",
  };

  const color = colors[type] ?? "#F7C873";

  return (
    <svg width="46" height="46" viewBox="0 0 46 46">
      <circle cx="23" cy="23" r="20" fill={color} opacity="0.95" />
      <circle cx="17" cy="19" r="2.2" fill="#5A3827" />
      <circle cx="29" cy="19" r="2.2" fill="#5A3827" />
      <path
        d="M17 28c3 3 9 3 12 0"
        stroke="#5A3827"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M14 12c4-5 14-5 18 0"
        stroke="#FFF6DF"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [recipePasteText, setRecipePasteText] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [stomachSafeOnly, setStomachSafeOnly] = useState(true);
  const [plan, setPlan] = useState<WeekPlan>(defaultPlan);
  const [selectedDay, setSelectedDay] = useState<DayKey>("Monday");
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("breakfast");
  const [addedId, setAddedId] = useState<string | null>(null);
  const categoryArt: Record<string, string> = {
  Breakfast: "🥣",
  Bowls: "🍚",
  Snacks: "🍫",
  Drinks: "🧋",
  Imported: "📋",
  "Fruits & Vegetables": "🥕",
  Proteins: "🍗",
  "Grains & Pasta": "🍝",
  "Dairy & Eggs": "🥛",
};
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<(Recipe & { isNew?: boolean }) | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [budgetTarget, setBudgetTarget] = useState(WEEKLY_BUDGET_DEFAULT);
  const [incomeType, setIncomeType] = useState<"hourly" | "salary">("hourly");
const [hourlyRate, setHourlyRate] = useState(16);
const [hoursPerWeek, setHoursPerWeek] = useState(32);
const [annualSalary, setAnnualSalary] = useState(35000);

const [householdMembers, setHouseholdMembers] = useState([
  { age: 25, gender: "female", activity: "active", menstrualPhase: "none" },
]);
  const weeklyRecipes = useMemo(() => {
    return Object.values(plan).flatMap((day) => Object.values(day))
      .map((id) => getRecipeById(id, recipes))
      .filter((r): r is Recipe => Boolean(r));
  }, [plan, recipes]);
  function getBaseWeeklyFoodCost(age: number, gender: string) {
  if (age <= 5) return 38;
  if (age <= 11) return 52;
  if (age <= 18) return gender === "male" ? 76 : 66;
  if (age <= 50) return gender === "male" ? 82 : 72;
  return gender === "male" ? 76 : 68;
}

const estimatedWeeklyIncome =
  incomeType === "hourly" ? hourlyRate * hoursPerWeek : annualSalary / 52;

const householdFoodBase = householdMembers.reduce((sum, member) => {
  const base = getBaseWeeklyFoodCost(Number(member.age), member.gender);
  const activityMultiplier = member.activity === "active" ? 1.08 : 1;
  const cycleMultiplier =
    member.gender === "female" &&
    (member.menstrualPhase === "period" || member.menstrualPhase === "pms")
      ? 1.05
      : 1;

  return sum + base * activityMultiplier * cycleMultiplier;
}, 0);

const incomeBasedGroceryBudget = estimatedWeeklyIncome * 0.049;
const recommendedGroceryBudget = Math.max(
  incomeBasedGroceryBudget,
  householdFoodBase
);

function updateHouseholdMember(index: number, field: string, value: string | number) {
  setHouseholdMembers((current) =>
    current.map((member, i) =>
      i === index ? { ...member, [field]: value } : member
    )
  );
}

function addHouseholdMember() {
  setHouseholdMembers((current) => [
    ...current,
    { age: 25, gender: "female", activity: "sedentary", menstrualPhase: "none" },
  ]);
}

function removeHouseholdMember(index: number) {
  setHouseholdMembers((current) => current.filter((_, i) => i !== index));
}

function applyRecommendedBudget() {
  setBudgetTarget(Number(recommendedGroceryBudget.toFixed(2)));
}
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

  const categories = useMemo(
    () => [ALL_CATEGORIES, ...Array.from(new Set(recipes.map((r) => r.category)))],
    [recipes]
  );

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
    macroGaps.calories > 150 && `You're ~${macroGaps.calories} cal under your goal. Add oats, rice, avocado, or almond butter.`,
    macroGaps.calories < -150 && `You're ~${Math.abs(macroGaps.calories)} cal over your goal. Reduce oils, nut butter, or rice portions.`,
    macroGaps.protein > 10 && `You need ~${macroGaps.protein}g more protein. Add Greek yogurt, chicken, eggs, or protein powder.`,
    macroGaps.protein < -10 && `You're ~${Math.abs(macroGaps.protein)}g over protein. Extra protein is generally fine.`,
    macroGaps.carbs > 20 && `You need ~${macroGaps.carbs}g more carbs. Add rice, oats, bananas, or whole grain toast.`,
    macroGaps.carbs < -20 && `You're ~${Math.abs(macroGaps.carbs)}g over carbs. Reduce rice, bread, or honey portions.`,
    macroGaps.fat > 10 && `You need ~${macroGaps.fat}g more fat. Add avocado, olive oil, nuts, or eggs.`,
    macroGaps.fat < -10 && `You're ~${Math.abs(macroGaps.fat)}g over fat. Reduce oils or nut butter.`,
  ].filter(Boolean) as string[];

  const nutritionPatterns = {
    protein: weeklyRecipes.some((r) => r.macros.protein >= 20),
    vegetables: weeklyRecipes.some((r) => r.tags.some((t) => ["greens", "vegetables", "spinach", "broccoli", "zucchini"].includes(t.toLowerCase()))),
    fruit: weeklyRecipes.some((r) => r.ingredients.some((i) => ["apple", "banana", "blueberr"].some((f) => i.item.toLowerCase().includes(f)))),
    omega3: weeklyRecipes.some((r) => r.ingredients.some((i) => ["salmon", "tuna", "chia", "flax", "walnut"].some((f) => i.item.toLowerCase().includes(f)))),
    calcium: weeklyRecipes.some((r) => r.ingredients.some((i) => ["yogurt", "milk", "cheese"].some((f) => i.item.toLowerCase().includes(f)))),
  };

  const nutritionGaps = [
    !nutritionPatterns.protein && "Protein may be low — add Greek yogurt, chicken, eggs, or protein powder.",
    !nutritionPatterns.vegetables && "Vegetables may be low — add spinach, broccoli, zucchini, or greens.",
    !nutritionPatterns.fruit && "Fruit may be low — add apples, bananas, or blueberries.",
    !nutritionPatterns.omega3 && "Omega-3 foods may be low — consider walnuts, chia seeds, or fatty fish.",
    !nutritionPatterns.calcium && "Calcium may be low — add Greek yogurt, milk, or cheese.",
  ].filter(Boolean) as string[];

  const ageNum = Number(profile.age);
  const weightNum = Number(profile.weight);
  const personalizedNotes = [
    profile.gender === "female" && ageNum >= 19 && "For adult women: iron, calcium, vitamin D, magnesium, and omega-3s are common nutrients to monitor.",
    profile.gender === "male" && ageNum >= 19 && "For adult men: fiber, magnesium, potassium, vitamin D, and protein are common nutrients to monitor.",
    ageNum >= 50 && "After 50: vitamin D, calcium, B12, protein, and hydration become especially important.",
    weightNum > 0 && weightNum < 120 && "Your entered weight is lower — make sure you're getting enough calories, protein, iron, and healthy fats.",
    weightNum >= 180 && "At your entered weight, protein, fiber, potassium-rich foods, and balanced blood-sugar meals may be especially helpful.",
  ].filter(Boolean) as string[];

  const mostPicked = Object.entries(monthlyPicks)
    .map(([id, count]) => ({ recipe: recipes.find((r) => r.id === id), count }))
    .filter((x) => x.recipe)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
    if (recipes.length >= MAX_RECIPES) { alert(`You can save up to ${MAX_RECIPES} recipes.`); return; }
    setEditingRecipe({ ...EMPTY_RECIPE, id: "", isNew: true });
  }

  function openEditRecipe(recipe: Recipe) {
    setEditingRecipe({ ...recipe, isNew: false });
    setExpandedRecipe(null);
  }

  function saveRecipe() {
    if (!editingRecipe || !editingRecipe.name.trim()) return;
    if (editingRecipe.isNew) {
      if (recipes.length >= MAX_RECIPES) { alert(`Max ${MAX_RECIPES} recipes.`); return; }
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
    setEditingRecipe((prev) => prev ? { ...prev, instructions: prev.instructions.map((s, idx) => idx === i ? value : s) } : prev);
  }

  function updateGrocery(i: number, field: keyof EditableGrocery, value: string) {
    setEditableGroceries((prev) => prev.map((item, idx) => {
      if (idx !== i) return item;
      if (field === "estimatedCost") return { ...item, priceText: value, estimatedCost: item.estimatedCost };
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
    if (recipes.length >= MAX_RECIPES) { alert(`You can only save up to ${MAX_RECIPES} recipes.`); return; }

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const name = lines[0] || "Untitled Recipe";

    // Smart parse: find Ingredients and Instructions sections
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
      // fallback: lines 1-7 as ingredients
      ingredientLines = lines.slice(1, 8);
    }

    const newRecipe: Recipe = {
      id: slugify(name),
      name,
      category: "Imported",
      source: "Imported",
      stomachSafe: true,
      lowSpice: true,
      noTomato: false,
      servings: 1,
      servingSize: "1 serving",
      ingredients: ingredientLines.map((line) => {
  const cleaned = line
    .replace(/^[-•\d.)\s]+/, "") // remove bullets/numbers
    .trim();

  const match = cleaned.match(/^([\d/.\s\w]+)\s+(.*)$/);

  return match
    ? { amount: match[1], item: match[2] }
    : { amount: "", item: cleaned };
}),
      instructions: instructionLines.length > 0 ? instructionLines : ["Edit this recipe to add instructions."],
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      tags: ["imported"],
      groceryItems: ingredientLines.map((line) => ({ name: line, amount: "", category: "Custom", estimatedCost: 0 })),
    };

    setRecipes((prev) => [...prev, newRecipe]);
    setEditingRecipe({ ...newRecipe, isNew: false });
    setRecipePasteText("");
  }

  const todaySlots = currentDayRecipes.filter(({ recipe }) => recipe);

  // ── RECIPE EDITOR ──
  if (editingRecipe) {
    return (
      <div style={s.shell}>
        <div style={s.statusBar} />
        <div style={s.screenWrap}>
          <div style={s.screen}>
            <div style={s.editorHeader}>
              <button style={s.backBtn} onClick={() => setEditingRecipe(null)}>← Back</button>
              <div style={s.editorTitle}>{editingRecipe.isNew ? "New Recipe" : "Edit Recipe"}</div>
              <button style={s.saveBtn} onClick={saveRecipe}>Save</button>
            </div>

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

            <div style={s.fieldLabel}>Macros</div>
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
                <button
                  style={s.addRowBtn}
                  onClick={() =>
                    setEditingRecipe((prev) =>
                      prev
                        ? {
                            ...prev,
                            ingredients: [...prev.ingredients, { item: "", amount: "" }],
                          }
                        : prev
                    )
                  }
                >
                  + Add
                </button>
              </div>

              {editingRecipe.ingredients.map((ing, i) => (
                <div key={i} style={s.ingredientRow}>
                  <input
                    style={{ ...s.fieldInput, flex: 1 }}
                    value={ing.amount}
                    onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                    placeholder="Amount"
                  />
                  <input
                    style={{ ...s.fieldInput, flex: 2 }}
                    value={ing.item}
                    onChange={(e) => updateIngredient(i, "item", e.target.value)}
                    placeholder="Ingredient"
                  />
                  <button
                    style={s.removeRowBtn}
                    onClick={() =>
                      setEditingRecipe((prev) =>
                        prev
                          ? {
                              ...prev,
                              ingredients: prev.ingredients.filter((_, idx) => idx !== i),
                            }
                          : prev
                      )
                    }
                  >
                    ✕
                  </button>
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
      <div style={s.statusBar} />
      <nav style={s.topNav}>
        {(["home", "recipes", "planner", "budget", "insights"] as Screen[]).map((sc) => (
          <button key={sc} style={{ ...s.topNavBtn, ...(screen === sc ? s.topNavBtnActive : {}) }} onClick={() => setScreen(sc)}>
            {sc.charAt(0).toUpperCase() + sc.slice(1)}
          </button>
        ))}
      </nav>
      <div style={s.screenWrap}>

        {/* ── HOME ── */}
{screen === "home" && (
  <div style={s.screen}>
    <div style={s.homeHeroCard}>
      <div style={s.homeTopRow}>
        <div>
          <div style={s.homeEyebrow}>Good morning,</div>
          <div style={s.homeLogo}>Glow Kitchen🌿</div>
        </div>
        <button style={s.bellButton}>♡</button>
      </div>

      <div style={s.heroImageBox}>
        <div style={s.heroSpeech}>Let’s plan something healthy and delicious!</div>
        <div style={s.heroGirl}>👩🏻‍🍳</div>
        <div style={s.heroCat}>🐱</div>
      </div>
    </div>

    

    <div style={s.sectionLabel}>Quick Actions</div>
    <div style={s.quickActionGrid}>
      <button style={s.quickActionCard} onClick={() => setScreen("planner")}>
        <div style={s.quickActionIcon}>📅</div>
        <div style={s.quickActionText}>Meal Plan</div>
      </button>

      <button style={s.quickActionCard} onClick={() => setScreen("budget")}>
        <div style={s.quickActionIcon}>🧺</div>
        <div style={s.quickActionText}>Groceries</div>
      </button>

      <button style={s.quickActionCard} onClick={() => setScreen("recipes")}>
        <div style={s.quickActionIcon}>👩🏻‍🍳</div>
        <div style={s.quickActionText}>Recipes</div>
      </button>

      <button style={s.quickActionCard} onClick={() => setScreen("budget")}>
        <div style={s.quickActionIcon}>🐷</div>
        <div style={s.quickActionText}>Budget</div>
      </button>
    </div>

    <div style={s.sectionLabel}>Food Categories</div>
    <div style={s.homeCategoryGrid}>
      {[
        ["Fruits & Vegetables", "🥕"],
        ["Proteins", "🍗"],
        ["Grains & Pasta", "🍝"],
        ["Dairy & Eggs", "🥛"],
        ["Snacks & Treats", "🍫"],
        ["Beverages", "🧋"],
      ].map(([label, icon]) => (
        <button key={label} style={s.homeCategoryCard} onClick={() => setScreen("recipes")}>
          <div style={s.homeCategoryIcon}>
  <FoodIcon type={label} />
</div>
          <div style={s.homeCategoryLabel}>{label}</div>
        </button>
      ))}
    </div>

    

    <div style={s.sectionLabel}>Today’s Plan</div>
    <div style={s.todayPlanCard}>
      {todaySlots.length === 0 ? (
        <div style={s.emptyState}>No meals planned yet</div>
      ) : (
        todaySlots.slice(0, 1).map(({ slot, recipe }) => recipe && (
          <div key={slot} style={s.todayFeaturedMeal}>
            <div style={s.todayMealImage}>🍽️</div>
            <div>
              <div style={s.todayMealName}>{recipe.name}</div>
              <div style={s.todayMealMeta}>
                {recipe.macros.calories} cal · {recipe.macros.protein}g protein
              </div>
            </div>
            <div style={s.heartIcon}>♥</div>
          </div>
        ))
      )}
    </div>

    <div style={s.homeBottomGrid}>
      <div style={s.weeklyBudgetMiniCard}>
        <div style={s.cardMiniTitle}>Weekly Budget</div>
        <div style={s.budgetCircle}>
          <div style={s.budgetCircleText}>{currency(editableTotal)}</div>
          <div style={s.budgetCircleSub}>of {currency(budgetTarget)}</div>
        </div>
        <div style={s.budgetMiniText}>
          {budgetRemaining >= 0
            ? `${currency(budgetRemaining)} left`
            : `${currency(Math.abs(budgetRemaining))} over`}
        </div>
      </div>

      <div style={s.recommendCard}>
        <div style={s.cardMiniTitle}>Recommended for you</div>
        <div style={s.recommendFoodIcon}>🥗</div>
        <div style={s.recommendTitle}>Build your meal plan</div>
        <button style={s.viewRecipeButton} onClick={() => setScreen("recipes")}>
          View Recipes
        </button>
      </div>
    </div>

    <div style={{ height: 24 }} />
  </div>
)}
        {/* ── RECIPES ── */}
        {screen === "recipes" && (
          <div style={s.screen}>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Recipes</div>
              <button style={s.newRecipeBtn} onClick={openNewRecipe}>+ New</button>
            </div>

            {/* Paste importer */}
            <div style={s.importCard}>
              <div style={s.importTitle}>📋 Paste from Google Docs</div>
              <textarea
                style={s.importTextarea}
                value={recipePasteText}
                onChange={(e) => setRecipePasteText(e.target.value)}
                placeholder={"Paste recipe here. Format it like:\n\nGreek Yogurt Parfait\n\nIngredients\nYogurt\nBerries\nGranola\n\nInstructions\nLayer ingredients."}
              />
              <button style={s.importBtn} onClick={importRecipeFromText}>Import Recipe</button>
            </div>

            <input style={s.searchBar} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍  Search recipes or tags…" />
            <div style={s.categoryCardRow}>
  {categories.map((cat) => {
    const label = cat === ALL_CATEGORIES ? "All" : cat;
    const icon = categoryArt[label] ?? "🍽️";

    return (
      <button
        key={cat}
        style={{
          ...s.categoryCard,
          ...(category === cat ? s.categoryCardActive : {}),
        }}
        onClick={() => setCategory(cat)}
      >
       <div style={s.categoryIconBubble}>
  <FoodIcon type={label} />
</div>
        <div style={s.categoryCardLabel}>{label}</div>
      </button>
    );
  })}
</div>

<div style={s.chipRow}>
             
              <button style={{ ...s.chip, ...(stomachSafeOnly ? s.chipGreen : {}) }} onClick={() => setStomachSafeOnly(!stomachSafeOnly)}>
                {stomachSafeOnly ? "✓ " : ""}Stomach-safe
              </button>
            </div>
       
            <div style={s.planStrip}>
              <span style={s.planStripLabel}>Adding to →</span>
              <select style={s.miniSelect} value={selectedDay} onChange={(e) => handleDayChange(e.target.value as DayKey)}>
                {Object.keys(plan).map((d) => <option key={d}>{d}</option>)}
              </select>
              <select style={s.miniSelect} value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value as SlotKey)}>
                {Object.keys(plan[selectedDay]).map((sl) => <option key={sl} value={sl}>{capitalize(sl)}</option>)}
              </select>
            </div>
            <div style={s.recipeList}>
              {filteredRecipes.map((recipe) => {
                const isExpanded = expandedRecipe === recipe.id;
                const isAdded = addedId === recipe.id;
                const confirmingDelete = deleteConfirm === recipe.id;
                return (
                  <div key={recipe.id} style={s.recipeCard}>
                    <button style={s.recipeCardHeader} onClick={() => setExpandedRecipe(isExpanded ? null : recipe.id)}>
                      <div style={s.recipeCardLeft}>
                        <div style={s.recipeCardName}>
  <span style={s.foodIcon}>
    {categoryArt[recipe.category] ?? "🍽️"}
  </span>
  {recipe.name}
</div>
                        <div style={s.recipeCardMeta}>{recipe.category} · {recipe.macros.calories} cal · {recipe.macros.protein}g protein</div>
                      </div>
                      <div style={s.recipeChevron}>{isExpanded ? "▲" : "▼"}</div>
                    </button>
                    {isExpanded && (
                      <div style={s.recipeExpanded}>
                        <div style={s.miniMacroRow}>
                          {[{ l: "Cal", v: recipe.macros.calories }, { l: "Protein", v: `${recipe.macros.protein}g` }, { l: "Carbs", v: `${recipe.macros.carbs}g` }, { l: "Fat", v: `${recipe.macros.fat}g` }].map((m) => (
                            <div key={m.l} style={s.miniMacroBox}><div style={s.miniMacroVal}>{m.v}</div><div style={s.miniMacroLbl}>{m.l}</div></div>
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
                        {recipe.tags.length > 0 && <div style={s.tagRow}>{recipe.tags.map((tag) => <span key={tag} style={s.tag}>{tag}</span>)}</div>}
                        <button style={{ ...s.addBtn, background: isAdded ? "#7c8a64" : "#7c8a6422", color: isAdded ? "#fff8ea" : "#4d5a3d", border: isAdded ? "none" : "1.5px solid #7c8a6466" }} onClick={() => assignRecipe(recipe.id)}>
                          {isAdded ? "✓ Added!" : `+ Add to ${selectedDay} ${capitalize(selectedSlot)}`}
                        </button>
                        <div style={s.recipeActions}>
                          <button style={s.editBtn} onClick={() => openEditRecipe(recipe)}>✏️ Edit</button>
                          {confirmingDelete ? (
                            <div style={s.confirmRow}>
                              <span style={s.confirmText}>Delete?</span>
                              <button style={s.confirmYes} onClick={() => deleteRecipe(recipe.id)}>Yes</button>
                              <button style={s.confirmNo} onClick={() => setDeleteConfirm(null)}>Cancel</button>
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
              {filteredRecipes.length === 0 && <div style={s.emptyState}>No recipes found — adjust filters or add a new one!</div>}
            </div>
            <div style={s.recipeCount}>{recipes.length} / {MAX_RECIPES} recipes saved</div>
          </div>
        )}

        {/* ── PLANNER ── */}
        {screen === "planner" && (
          <div style={s.screen}>
            <div style={s.pageHeader}><div style={s.pageTitle}>Meal Planner</div></div>
            <div style={s.dayScroll}>
              {Object.keys(plan).map((day) => (
                <button key={day} style={{ ...s.dayChip, ...(selectedDay === day ? s.dayChipActive : {}) }} onClick={() => handleDayChange(day as DayKey)}>{day.slice(0, 3)}</button>
              ))}
            </div>
            <div style={s.dayMacroBar}>
              <span style={s.dayMacroItem}>🔥 {dayMacroTotal.calories} cal</span>
              <span style={s.dayMacroItem}>💪 {dayMacroTotal.protein}g protein</span>
              <span style={s.dayMacroItem}>🍚 {dayMacroTotal.carbs}g carbs</span>
            </div>
            <div style={s.slotTabRow}>
              {Object.keys(plan[selectedDay]).map((sl) => (
                <button key={sl} style={{ ...s.slotTab, ...(selectedSlot === sl ? s.slotTabActive : {}) }} onClick={() => setSelectedSlot(sl as SlotKey)}>{capitalize(sl)}</button>
              ))}
            </div>
            <div style={s.slotList}>
              {currentDayRecipes.map(({ slot, recipe }) => (
                <div key={slot} style={{ ...s.slotCard, ...(selectedSlot === slot ? s.slotCardActive : {}) }}>
                  <div style={s.slotCardTop}>
                    <div style={s.slotBadge}>{capitalize(slot)}</div>
                    {recipe && <button style={s.clearBtn} onClick={() => clearSlot(selectedDay, slot)}>✕</button>}
                  </div>
                  <div style={s.slotCardName}>{recipe ? recipe.name : "— empty —"}</div>
                  {recipe && <div style={s.slotCardMeta}>{recipe.macros.calories} cal · {recipe.macros.protein}g protein</div>}
                </div>
              ))}
            </div>
            <button style={s.goRecipesBtn} onClick={() => setScreen("recipes")}>+ Browse Recipes to Fill Slots</button>
          </div>
        )}

        {/* ── BUDGET ── */}
        {screen === "budget" && (
          <div style={s.screen}>
            <div style={s.pageHeader}><div style={s.pageTitle}>Budget & Groceries</div></div>
            
            <div style={s.budgetCard}>
  <div style={s.budgetSectionTitle}>Grocery Budget Calculator</div>

  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
    <button
      style={incomeType === "hourly" ? s.chipActive : s.chip}
      onClick={() => setIncomeType("hourly")}
    >
      Hourly
    </button>
    <button
      style={incomeType === "salary" ? s.chipActive : s.chip}
      onClick={() => setIncomeType("salary")}
    >
      Salary
    </button>
  </div>

  {incomeType === "hourly" ? (
    <div style={s.profileCard}>
      <div>
        <div style={s.profileFieldLabel}>Hourly Rate</div>
        <input
          type="number"
          style={s.profileInput}
          value={hourlyRate}
          onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
        />
      </div>
      <div>
        <div style={s.profileFieldLabel}>Hours / Week</div>
        <input
          type="number"
          style={s.profileInput}
          value={hoursPerWeek}
          onChange={(e) => setHoursPerWeek(Number(e.target.value) || 0)}
        />
      </div>
    </div>
  ) : (
    <div style={s.profileCard}>
      <div>
        <div style={s.profileFieldLabel}>Annual Salary</div>
        <input
          type="number"
          style={s.profileInput}
          value={annualSalary}
          onChange={(e) => setAnnualSalary(Number(e.target.value) || 0)}
        />
      </div>
    </div>
  )}

  <div style={s.sectionLabel}>Household Members</div>

  {householdMembers.map((member, index) => (
    <div key={index} style={s.groceryEditRow}>
      <div style={{ flex: 1 }}>
        <input
          type="number"
          style={s.profileInput}
          value={member.age}
          onChange={(e) => updateHouseholdMember(index, "age", Number(e.target.value) || 0)}
          placeholder="Age"
        />

        <select
          style={s.profileInput}
          value={member.gender}
          onChange={(e) => updateHouseholdMember(index, "gender", e.target.value)}
        >
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>

        <select
          style={s.profileInput}
          value={member.activity}
          onChange={(e) => updateHouseholdMember(index, "activity", e.target.value)}
        >
          <option value="sedentary">Sedentary</option>
          <option value="active">Physically active</option>
        </select>

        <select
          style={s.profileInput}
          value={member.menstrualPhase}
          onChange={(e) => updateHouseholdMember(index, "menstrualPhase", e.target.value)}
        >
          <option value="none">No period/PMS adjustment</option>
          <option value="pms">PMS / luteal phase</option>
          <option value="period">On period</option>
        </select>
      </div>

      <button style={s.groceryDeleteBtn} onClick={() => removeHouseholdMember(index)}>
        ✕
      </button>
    </div>
  ))}

  <button style={s.addGroceryBtn} onClick={addHouseholdMember}>
    + Add Household Member
  </button>

  <div style={s.budgetSub}>
    Estimated weekly income: {currency(estimatedWeeklyIncome)}
  </div>
  <div style={s.budgetSub}>
    Income-based grocery target: {currency(incomeBasedGroceryBudget)}
  </div>
  <div style={s.budgetBigMonthly}>
    Recommended weekly grocery budget: {currency(recommendedGroceryBudget)}
  </div>

  <button style={s.importBtn} onClick={applyRecommendedBudget}>
    Use This as Weekly Budget
  </button>

  <div style={s.disclaimer}>
    This is an estimate. Period/PMS mode adds a small food buffer for appetite/cravings, especially around the luteal or pre-period phase.
  </div>
</div>
            <div style={s.budgetCard}>
              <div style={s.budgetCardRow}>
                <div>
                  <div style={s.budgetSectionTitle}>Weekly</div>
                  <div style={s.budgetBig}>{currency(editableTotal)}</div>
                  <div style={s.budgetSub}>{budgetRemaining >= 0 ? `${currency(budgetRemaining)} left` : `${currency(Math.abs(budgetRemaining))} over`}</div>
                </div>
                <div style={s.budgetDivider} />
                <div>
                  <div style={s.budgetSectionTitle}>Monthly (est.)</div>
                  <div style={s.budgetBigMonthly}>{currency(Number((editableTotal * 4.33).toFixed(2)))}</div>
                  <div style={s.budgetSub}>{currency(Number((budgetTarget * 4.33).toFixed(2)))} target</div>
                </div>
              </div>
              <div style={s.budgetTrack}>
                <div style={{ ...s.budgetFill, width: `${budgetPercent}%`, background: budgetRemaining >= 0 ? "#7c8a64" : "#c97b5a" }} />
              </div>
            </div>
            <div style={s.sectionLabel}>Weekly Budget Target</div>
            <div style={s.budgetTargetRow}>
              <span style={s.budgetTargetLabel}>$</span>
              <input type="number" style={s.budgetTargetInput} value={budgetTarget} onChange={(e) => setBudgetTarget(Number(e.target.value) || 0)} />
              <button style={s.resetBtn} onClick={resetBudget}>↺ Reset</button>
            </div>
            <div style={s.sectionLabel}>Grocery List · enter your actual prices</div>
            <button style={s.addGroceryBtn} onClick={addGroceryItem}>+ Add Item</button>
            <div style={s.groceryList}>
              {editableGroceries.map((item, i) => (
                <div key={`${item.name}-${i}`} style={s.groceryEditRow}>
                  <div style={s.groceryEditLeft}>
                    <input style={s.groceryEditInput} value={item.name} onChange={(e) => updateGrocery(i, "name", e.target.value)} placeholder="Item name" />
                    <input style={{ ...s.groceryEditInput, fontSize: 11, color: "#8b7d6b", fontWeight: 400 }} value={item.category} onChange={(e) => updateGrocery(i, "category", e.target.value)} placeholder="Category" />
                  </div>
                  <div style={s.groceryEditRight}>
                    <div style={s.groceryPriceWrap}>
                      <span style={s.groceryDollar}>$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        style={s.groceryCostInput}
                        value={item.priceText !== undefined ? item.priceText : (item.estimatedCost === 0 ? "" : String(item.estimatedCost))}
                        onChange={(e) => updateGrocery(i, "estimatedCost", e.target.value)}
                        onBlur={() => commitPrice(i)}
                        placeholder="0.00"
                      />
                    </div>
                    <button style={s.groceryDeleteBtn} onClick={() => deleteGroceryItem(i)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={s.sectionLabel}>Portion Rules</div>
            <div style={s.rulesCard}>
              {["Greek yogurt: 3/4 cup max", "Rice: 1 cup cooked max", "Chicken: 4 oz standard", "Almond butter: 1 tbsp", "No tomatoes · Low spice"].map((rule) => (
                <div key={rule} style={s.ruleRow}><span style={s.ruleDot}>◆</span><span>{rule}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* ── INSIGHTS ── */}
        {screen === "insights" && (
          <div style={s.screen}>
            <div style={s.pageHeader}><div style={s.pageTitle}>Insights</div></div>
            <div style={s.sectionLabel}>Your Profile</div>
            <div style={s.profileCard}>
              {([["age", "Age", "number", ""], ["height", "Height", "text", "e.g. 5'4\""], ["weight", "Weight (lbs)", "number", ""]] as [keyof typeof profile, string, string, string][]).map(([field, label, type, ph]) => (
                <div key={field} style={s.profileField}>
                  <div style={s.profileFieldLabel}>{label}</div>
                  <input style={s.profileInput} type={type} value={profile[field]} onChange={(e) => setProfile((prev) => ({ ...prev, [field]: e.target.value }))} placeholder={ph} />
                </div>
              ))}
              <div style={s.profileField}>
                <div style={s.profileFieldLabel}>Gender</div>
                <select style={s.profileInput} value={profile.gender} onChange={(e) => setProfile((prev) => ({ ...prev, gender: e.target.value }))}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
              </div>
            </div>
            <div style={s.sectionLabel}>Macro Goals</div>
            <div style={s.macroGoalCard}>
              {(["calories", "protein", "carbs", "fat"] as const).map((key) => {
                const current = averageDailyMacros[key];
                const goal = macroGoals[key];
                const pct = Math.min(100, Math.round((current / goal) * 100));
                const ok = pct >= 80 && pct <= 120;
                return (
                  <div key={key} style={s.macroGoalRow}>
                    <div style={s.macroGoalLabel}>{capitalize(key)}</div>
                    <div style={s.macroGoalBar}>
                      <div style={{ ...s.macroGoalFill, width: `${pct}%`, background: ok ? "#7c8a64" : "#c9876a" }} />
                    </div>
                    <div style={s.macroGoalNums}>
                      <span style={{ color: ok ? "#5a6b4a" : "#b06040", fontSize: 13 }}>{current}</span>
                      <span style={s.macroGoalSlash}>/</span>
                      <input type="number" style={s.macroGoalInput} value={goal} onChange={(e) => setMacroGoals((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))} />
                    </div>
                  </div>
                );
              })}
            </div>
            {macroSuggestions.length > 0 && (
              <>
                <div style={s.sectionLabel}>Recipe Suggestions</div>
                <div style={s.insightCard}>
                  {macroSuggestions.map((tip) => (
                    <div key={tip} style={s.insightRow}><span style={s.insightDot}>→</span><span>{tip}</span></div>
                  ))}
                </div>
              </>
            )}
            {macroSuggestions.length === 0 && (
              <div style={{ ...s.insightCard, marginBottom: 16 }}>
                <div style={{ color: "#5a6b4a", fontWeight: 600, fontSize: 14 }}>✓ Your plan is close to all your macro goals!</div>
              </div>
            )}
            <div style={s.sectionLabel}>Nutrition Pattern Check</div>
            <div style={s.insightCard}>
              {nutritionGaps.length === 0 ? (
                <div style={{ color: "#5a6b4a", fontWeight: 600, fontSize: 14 }}>✓ Your plan looks balanced.</div>
              ) : (
                nutritionGaps.map((gap) => <div key={gap} style={s.insightRow}><span style={s.insightDot}>⚠</span><span>{gap}</span></div>)
              )}
              {personalizedNotes.map((note) => <div key={note} style={s.insightRow}><span style={s.insightDot}>ℹ</span><span>{note}</span></div>)}
              <div style={s.disclaimer}>Food-pattern check only, not medical advice. Speak with a doctor or dietitian about supplements.</div>
            </div>
            <div style={s.sectionLabel}>Meals You Eat Most This Week</div>
            <div style={s.insightCard}>
              {(() => {
                const mealCount: Record<string, number> = {};
                Object.values(plan).forEach((day) => {
                  Object.values(day).forEach((id) => { if (id) mealCount[id] = (mealCount[id] || 0) + 1; });
                });
                const sorted = Object.entries(mealCount)
                  .map(([id, count]) => ({ recipe: recipes.find((r) => r.id === id), count }))
                  .filter((x) => x.recipe)
                  .sort((a, b) => b.count - a.count);
                return sorted.length === 0 ? (
                  <div style={{ color: "#8b7d6b", fontSize: 13, fontStyle: "italic" }}>Plan your meals to see which ones you eat most.</div>
                ) : (
                  <>
                    {sorted.map(({ recipe, count }, i) => recipe && (
                      <div key={recipe.id} style={s.foodFreqRow}>
                        <span style={s.foodFreqRank}>{i + 1}</span>
                        <div style={s.foodFreqBarWrap}>
                          <div style={s.foodFreqLabel}>{recipe.name}</div>
                          <div style={s.foodFreqTrack}>
                            <div style={{ ...s.foodFreqFill, width: `${Math.round((count / sorted[0].count) * 100)}%` }} />
                          </div>
                        </div>
                        <span style={s.foodFreqCount}>{count}x</span>
                      </div>
                    ))}
                    <div style={s.disclaimer}>Based on your current weekly meal plan.</div>
                  </>
                );
              })()}
            </div>
            {mostPicked.length > 0 && (
              <>
                <div style={s.sectionLabel}>Most Added This Session</div>
                <div style={s.insightCard}>
                  {mostPicked.map(({ recipe, count }) => recipe && (
                    <div key={recipe.id} style={s.insightRow}>
                      <span style={s.insightDot}>◆</span>
                      <span><strong>{recipe.name}</strong> — added {count}×</span>
                    </div>
                  ))}
                  <button style={{ ...s.resetBtn, marginTop: 8 }} onClick={() => setMonthlyPicks({})}>↺ Reset</button>
                </div>
              </>
            )}
            <div style={{ height: 16 }} />
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: {
  maxWidth: 430,
  margin: "0 auto",
  minHeight: "100vh",
  background: "#FFF6DF",
  backgroundImage:
    "radial-gradient(rgba(120,100,80,0.08) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
  color: "#5A3827",
  display: "flex",
  flexDirection: "column",
  fontFamily: "Georgia, 'Times New Roman', serif",
  position: "relative",
  overflow: "hidden",
},
homeHeroCard: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 26,
  padding: 16,
  marginBottom: 18,
  boxShadow: "4px 4px 0 rgba(90,56,39,0.10)",
},

homeTopRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
},

bellButton: {
  width: 38,
  height: 38,
  borderRadius: 14,
  border: "1.5px solid #E8CFA3",
  background: "#FFE7C2",
  color: "#5A3827",
  fontSize: 18,
  cursor: "pointer",
},

heroImageBox: {
  height: 220,
  borderRadius: 22,
  background:
    "linear-gradient(180deg, #FFF1D1 0%, #FFE7C2 55%, #F8C8B8 100%)",
  border: "1.5px solid #E8CFA3",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
},

heroSpeech: {
  position: "absolute",
  top: 18,
  left: 18,
  maxWidth: 170,
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 16,
  padding: "10px 12px",
  fontSize: 12,
  color: "#5A3827",
  boxShadow: "2px 2px 0 rgba(90,56,39,0.08)",
},

heroGirl: {
  fontSize: 86,
  marginTop: 36,
},

heroCat: {
  position: "absolute",
  left: 34,
  bottom: 18,
  fontSize: 44,
},

quickActionGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 10,
  marginBottom: 20,
},

quickActionCard: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 18,
  padding: "12px 6px",
  color: "#5A3827",
  boxShadow: "3px 3px 0 rgba(90,56,39,0.08)",
  cursor: "pointer",
},

quickActionIcon: {
  fontSize: 22,
  marginBottom: 6,
},

quickActionText: {
  fontSize: 10,
  fontWeight: 700,
},

homeCategoryGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 12,
  marginBottom: 20,
},

homeCategoryCard: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 22,
  padding: 14,
  color: "#5A3827",
  boxShadow: "4px 4px 0 rgba(90,56,39,0.10)",
  cursor: "pointer",
  textAlign: "center",
},

homeCategoryIcon: {
  width: 58,
  height: 58,
  margin: "0 auto 8px",
  borderRadius: 20,
  background: "#FFF1D1",
  border: "1.5px solid #E8CFA3",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 32,
},

homeCategoryLabel: {
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.25,
},

todayPlanCard: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 22,
  padding: 14,
  marginBottom: 16,
  boxShadow: "4px 4px 0 rgba(90,56,39,0.10)",
},

todayFeaturedMeal: {
  display: "flex",
  alignItems: "center",
  gap: 12,
},

todayMealImage: {
  width: 58,
  height: 58,
  borderRadius: 18,
  background: "#FFE7C2",
  border: "1.5px solid #E8CFA3",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 30,
  flexShrink: 0,
},

todayMealName: {
  fontSize: 14,
  fontWeight: 700,
  color: "#5A3827",
},

todayMealMeta: {
  fontSize: 11,
  color: "#9A7A5A",
  marginTop: 3,
},

heartIcon: {
  marginLeft: "auto",
  color: "#F2A07F",
  fontSize: 18,
},

homeBottomGrid: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
},

weeklyBudgetMiniCard: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 22,
  padding: 14,
  boxShadow: "4px 4px 0 rgba(90,56,39,0.10)",
},

recommendCard: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 22,
  padding: 14,
  boxShadow: "4px 4px 0 rgba(90,56,39,0.10)",
},

cardMiniTitle: {
  fontSize: 12,
  fontWeight: 700,
  color: "#5A3827",
  marginBottom: 10,
},

budgetCircle: {
  width: 96,
  height: 96,
  borderRadius: "50%",
  border: "12px solid #A9B17A",
  background: "#FFF1D1",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 10px",
},

budgetCircleText: {
  fontSize: 14,
  fontWeight: 700,
  color: "#5A3827",
},

budgetCircleSub: {
  fontSize: 10,
  color: "#9A7A5A",
},

budgetMiniText: {
  textAlign: "center",
  fontSize: 12,
  color: "#9A7A5A",
},

recommendFoodIcon: {
  width: 64,
  height: 64,
  borderRadius: 20,
  background: "#FFE7C2",
  border: "1.5px solid #E8CFA3",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 34,
  marginBottom: 10,
},

recommendTitle: {
  fontSize: 13,
  fontWeight: 700,
  color: "#5A3827",
  marginBottom: 10,
},

viewRecipeButton: {
  width: "100%",
  background: "#A9B17A",
  border: "1.5px solid #8B9363",
  color: "#FFF9EA",
  borderRadius: 18,
  padding: "9px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
},
topNav: {
  display: "flex",
  borderBottom: "1.5px solid #E8CFA3",
  background: "#FFF6DFEE",
  backdropFilter: "blur(8px)",
  flexShrink: 0,
  overflowX: "auto",
},
  topNavBtn: { flex: 1, padding: "10px 4px", background: "transparent", border: "none", fontSize: 11, fontWeight: 700, color: "#8b7d6b", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Georgia, serif", whiteSpace: "nowrap" },
topNavBtnActive: {
  color: "#0B5A3C",
  borderBottom: "2.5px solid #0B5A3C",
},
card: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 22,
  boxShadow: "4px 4px 0 rgba(90,56,39,0.10)",
},
  homeHeader: { marginBottom: 24, paddingTop: 8 },
  homeEyebrow: { fontSize: 11, color: "#7c8a64", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 },
  homeLogo: { fontSize: 30, fontWeight: 700, letterSpacing: "0.01em", lineHeight: 1, color: "#2f2a24" },
  homeTagline: { fontSize: 13, color: "#8b7d6b", marginTop: 5, fontStyle: "italic" },
  budgetRingCard: { background: "#fff8ea", borderRadius: 20, padding: 20, display: "flex", alignItems: "center", gap: 20, marginBottom: 24, border: "1.5px solid #c9b99a", boxShadow: "4px 4px 0 rgba(79,70,55,0.10)" },
  ringOuter: { flexShrink: 0 },
  ringInfo: {},
  ringLabel: { fontSize: 11, color: "#8b7d6b", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 },
  ringAmount: { fontSize: 20, fontWeight: 700, color: "#7c8a64" },
  ringMeta: { fontSize: 12, color: "#8b7d6b", marginTop: 4 },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "#7c8a64", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 10, marginTop: 4 },
  macroStrip: { display: "flex", gap: 8, marginBottom: 24 },
  macroChip: { flex: 1, background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 14, padding: "10px 6px", textAlign: "center", boxShadow: "2px 2px 0 rgba(79,70,55,0.08)" },
  macroVal: { fontSize: 16, fontWeight: 700 },
  macroLbl: { fontSize: 11, color: "#8b7d6b", marginTop: 2 },
  macroGoalLbl: { fontSize: 10, color: "#c9b99a", marginTop: 2 },
  todayList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 },
  todayRow: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "2px 2px 0 rgba(79,70,55,0.08)" },
  todaySlotBadge: { background: "#7c8a6422", color: "#5a6b4a", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, flexShrink: 0, border: "1px solid #7c8a6444" },
  todayRowInfo: { flex: 1 },
  todayRowName: { fontSize: 14, fontWeight: 700, color: "#2f2a24" },
  todayRowMeta: { fontSize: 12, color: "#8b7d6b", marginTop: 2, fontStyle: "italic" },
  emptyState: { textAlign: "center", color: "#8b7d6b", padding: "24px 0", fontSize: 13, marginBottom: 24, fontStyle: "italic" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingTop: 8 },
  pageTitle: { fontSize: 24, fontWeight: 700, letterSpacing: "0.01em", color: "#2f2a24" },
newRecipeBtn: {
  background: "#0B5A3C",
  border: "1.5px solid #073C29",
  borderRadius: 20,
  padding: "8px 14px",
  color: "#FFF6DF",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
},
importCard: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 22,
  padding: 14,
  marginBottom: 16,
  boxShadow: "4px 4px 0 rgba(90,56,39,0.10)",
},
  importTitle: { fontSize: 13, fontWeight: 700, color: "#2f2a24", marginBottom: 10 },
  importTextarea: { width: "100%", minHeight: 100, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #c9b99a", background: "#fffdf6", color: "#2f2a24", fontSize: 13, fontFamily: "Georgia, serif", boxSizing: "border-box", resize: "vertical" },
importBtn: {
  marginTop: 10,
  padding: "9px 16px",
  borderRadius: 20,
  border: "none",
  background: "#0B5A3C",
  color: "#FFF6DF",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
},
  searchBar: { width: "100%", background: "#fffdf6", border: "1.5px solid #c9b99a", borderRadius: 14, padding: "12px 16px", color: "#2f2a24", fontSize: 14, marginBottom: 12, boxSizing: "border-box", fontFamily: "Georgia, serif" },
  chipRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },

  categoryCardRow: {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  padding: "4px 0 14px",
  marginBottom: 6,
},

categoryCard: {
  minWidth: 92,
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 22,
  padding: "12px 10px",
  boxShadow: "4px 4px 0 rgba(90,56,39,0.10)",
  color: "#5A3827",
  cursor: "pointer",
  textAlign: "center",
},

categoryCardActive: {
  background: "#FFE7C2",
  border: "1.5px solid #0B5A3C",
  boxShadow: "4px 4px 0 rgba(11,90,60,0.16)",
},

categoryIconBubble: {
  width: 46,
  height: 46,
  margin: "0 auto 8px",
  borderRadius: 18,
  background: "#FFF1D1",
  border: "1.5px solid #E8CFA3",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 25,
},

categoryCardLabel: {
  fontSize: 11,
  fontWeight: 700,
},
  chip: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 99, padding: "5px 13px", fontSize: 12, color: "#8b7d6b", cursor: "pointer" },
  chipActive: { background: "#7c8a6422", border: "1.5px solid #7c8a64", color: "#4d5a3d" },
  chipGreen: { background: "#7c8a6422", border: "1.5px solid #7c8a64", color: "#4d5a3d" },
  planStrip: { display: "flex", alignItems: "center", gap: 8, background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 12, padding: "10px 14px", marginBottom: 14, flexWrap: "wrap", boxShadow: "2px 2px 0 rgba(79,70,55,0.07)" },
  planStripLabel: { fontSize: 12, color: "#8b7d6b", flexShrink: 0, fontStyle: "italic" },
  miniSelect: { background: "#fffdf6", border: "1px solid #c9b99a", borderRadius: 8, padding: "5px 10px", color: "#4d5a3d", fontSize: 12, cursor: "pointer" },
  recipeList: { display: "flex", flexDirection: "column", gap: 10 },
recipeCard: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 22,
  overflow: "hidden",
  boxShadow: "4px 4px 0 rgba(90,56,39,0.10)",
},
  recipeCardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", width: "100%", background: "transparent", border: "none", color: "#2f2a24", cursor: "pointer", textAlign: "left", gap: 12 },
  recipeCardLeft: { flex: 1 },
  recipeCardName: { fontSize: 15, fontWeight: 700, color: "#2f2a24" },
  recipeCardMeta: { fontSize: 12, color: "#8b7d6b", marginTop: 3, fontStyle: "italic" },
  recipeChevron: { fontSize: 10, color: "#c9b99a", flexShrink: 0 },
  recipeExpanded: { padding: "0 16px 16px", borderTop: "1.5px dashed #e0d4c0" },
  miniMacroRow: { display: "flex", gap: 6, paddingTop: 14, marginBottom: 14 },
  miniMacroBox: { flex: 1, background: "#f4efe3", border: "1px solid #ddd0ba", borderRadius: 10, padding: "8px 6px", textAlign: "center" },
  miniMacroVal: { fontSize: 14, fontWeight: 700, color: "#2f2a24" },
  miniMacroLbl: { fontSize: 10, color: "#8b7d6b", marginTop: 2 },
  expandSection: { marginBottom: 12 },
  expandTitle: { fontSize: 10, fontWeight: 700, color: "#7c8a64", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 },
  expandRow: { display: "flex", gap: 8, fontSize: 13, color: "#3d3530", marginBottom: 5, lineHeight: 1.6 },
  expandDot: { color: "#c97b5a", flexShrink: 0, marginTop: 1 },
  expandNum: { color: "#c97b5a", fontWeight: 700, flexShrink: 0, minWidth: 16 },
  tagRow: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  tag: { background: "#f4efe3", border: "1px solid #ddd0ba", borderRadius: 99, padding: "3px 10px", fontSize: 11, color: "#8b7d6b" },
  addBtn: { width: "100%", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  recipeActions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  editBtn: { background: "#f4efe3", border: "1.5px solid #c9b99a", borderRadius: 10, padding: "8px 14px", color: "#3d3530", fontSize: 12, cursor: "pointer" },
  deleteBtn: { background: "#f5ddd0", border: "1.5px solid #c9876a", borderRadius: 10, padding: "8px 14px", color: "#7b3f2f", fontSize: 12, cursor: "pointer" },
  confirmRow: { display: "flex", gap: 6, alignItems: "center" },
  confirmText: { fontSize: 12, color: "#c97b5a" },
  confirmYes: { background: "#c97b5a", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff8ea", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  confirmNo: { background: "#f4efe3", border: "none", borderRadius: 8, padding: "6px 12px", color: "#8b7d6b", fontSize: 12, cursor: "pointer" },
  recipeCount: { textAlign: "center", fontSize: 11, color: "#c9b99a", padding: "12px 0 4px", fontStyle: "italic" },
  dayScroll: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", paddingTop: 8 },
  dayChip: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#8b7d6b", cursor: "pointer" },
  dayChipActive: { background: "#7c8a64", color: "#fff8ea", border: "1.5px solid #4d5a3d", boxShadow: "2px 2px 0 rgba(79,70,55,0.15)" },
  dayMacroBar: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 12, padding: "10px 14px", display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap", boxShadow: "2px 2px 0 rgba(79,70,55,0.07)" },
  dayMacroItem: { fontSize: 13, color: "#3d3530" },
  slotTabRow: { display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  slotTab: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 99, padding: "6px 14px", fontSize: 12, color: "#8b7d6b", cursor: "pointer" },
  slotTabActive: { background: "#f4efe3", color: "#2f2a24", border: "1.5px solid #8b7d6b", fontWeight: 700 },
  slotList: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  slotCard: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 16, padding: "14px 16px", boxShadow: "2px 2px 0 rgba(79,70,55,0.08)" },
  slotCardActive: { border: "1.5px solid #7c8a64", boxShadow: "3px 3px 0 rgba(79,70,55,0.12)" },
  slotCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  slotBadge: { fontSize: 10, fontWeight: 700, color: "#7c8a64", textTransform: "uppercase", letterSpacing: "0.1em" },
  clearBtn: { background: "transparent", border: "none", color: "#c9b99a", fontSize: 14, cursor: "pointer", padding: "2px 6px" },
  slotCardName: { fontSize: 15, fontWeight: 700, marginBottom: 4, color: "#2f2a24" },
  slotCardMeta: { fontSize: 12, color: "#8b7d6b", fontStyle: "italic" },
  goRecipesBtn: { width: "100%", background: "#7c8a64", border: "1.5px solid #4d5a3d", borderRadius: 14, padding: "14px", color: "#fff8ea", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16, boxShadow: "3px 3px 0 rgba(79,70,55,0.15)" },
budgetCard: {
  background: "#FFF9EA",
  border: "1.5px solid #E8CFA3",
  borderRadius: 22,
  padding: 20,
  marginBottom: 20,
  boxShadow: "4px 4px 0 rgba(90,56,39,0.10)",
},
  budgetCardRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  budgetBig: { fontSize: 34, fontWeight: 700, letterSpacing: "-0.01em", color: "#2f2a24" },
  budgetSub: { fontSize: 12, color: "#8b7d6b", marginTop: 4, fontStyle: "italic" },
  budgetSectionTitle: { fontSize: 10, fontWeight: 700, color: "#8b7d6b", textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 4 },
  budgetBigMonthly: { fontSize: 24, fontWeight: 700, color: "#2f2a24" },
  budgetDivider: { width: 1, background: "#e0d4c0", alignSelf: "stretch", margin: "0 8px" },
  budgetTrack: { height: 8, background: "#f4efe3", borderRadius: 99, overflow: "hidden", border: "1px solid #ddd0ba" },
  budgetFill: { height: "100%", borderRadius: 99, transition: "width 0.5s ease" },
  budgetTargetRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20, background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 14, padding: "12px 16px" },
  budgetTargetLabel: { fontSize: 20, fontWeight: 700, color: "#7c8a64" },
  budgetTargetInput: { flex: 1, background: "transparent", border: "none", color: "#2f2a24", fontSize: 20, fontWeight: 700, outline: "none" },
  resetBtn: { background: "#f4efe3", border: "1.5px solid #c9b99a", borderRadius: 10, padding: "7px 12px", color: "#8b7d6b", fontSize: 12, cursor: "pointer" },
  addGroceryBtn: { background: "#7c8a64", border: "1.5px solid #4d5a3d", borderRadius: 12, padding: "10px 16px", color: "#fff8ea", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12, width: "100%", boxShadow: "2px 2px 0 rgba(79,70,55,0.12)" },
  groceryList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 },
  groceryEditRow: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 14, padding: "14px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, boxShadow: "2px 2px 0 rgba(79,70,55,0.07)" },
  groceryEditLeft: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  groceryEditInput: { background: "transparent", border: "none", color: "#2f2a24", fontSize: 14, fontWeight: 700, outline: "none", width: "100%" },
  groceryEditRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  groceryUses: { fontSize: 11, color: "#c9b99a" },
  groceryPriceWrap: { display: "flex", alignItems: "center", gap: 4, background: "#fff8ea", border: "2px solid #7c8a64", borderRadius: 12, padding: "10px 12px", minWidth: 90 },
  groceryDollar: { fontSize: 16, fontWeight: 700, color: "#7c8a64" },
  groceryCostInput: { width: 64, background: "transparent", border: "none", color: "#4d5a3d", fontSize: 18, fontWeight: 700, textAlign: "right" as const, outline: "none" },
  groceryDeleteBtn: { background: "transparent", border: "none", color: "#c9b99a", fontSize: 14, cursor: "pointer" },
  rulesCard: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, boxShadow: "2px 2px 0 rgba(79,70,55,0.07)" },
  ruleRow: { display: "flex", gap: 10, fontSize: 13, color: "#3d3530", lineHeight: 1.6 },
  ruleDot: { color: "#c97b5a", flexShrink: 0, fontSize: 10, marginTop: 3 },
  profileCard: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 16, padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, boxShadow: "2px 2px 0 rgba(79,70,55,0.07)" },
  profileField: {},
  profileFieldLabel: { fontSize: 10, color: "#8b7d6b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.1em" },
  profileInput: { width: "100%", background: "#fffdf6", border: "1.5px solid #c9b99a", borderRadius: 10, padding: "9px 10px", color: "#2f2a24", fontSize: 13, boxSizing: "border-box" },
  macroGoalCard: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, marginBottom: 20, boxShadow: "2px 2px 0 rgba(79,70,55,0.07)" },
  macroGoalRow: { display: "flex", alignItems: "center", gap: 10 },
  macroGoalLabel: { fontSize: 12, fontWeight: 700, color: "#8b7d6b", width: 52, flexShrink: 0 },
  macroGoalBar: { flex: 1, height: 6, background: "#f4efe3", borderRadius: 99, overflow: "hidden", border: "1px solid #ddd0ba" },
  macroGoalFill: { height: "100%", borderRadius: 99, transition: "width 0.4s ease" },
  macroGoalNums: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  macroGoalSlash: { color: "#c9b99a", fontSize: 12 },
  macroGoalInput: { width: 52, background: "#f4efe3", border: "1.5px solid #c9b99a", borderRadius: 8, padding: "4px 6px", color: "#2f2a24", fontSize: 13, textAlign: "right" },
  insightCard: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, boxShadow: "2px 2px 0 rgba(79,70,55,0.07)" },
  insightRow: { display: "flex", gap: 10, fontSize: 13, color: "#3d3530", lineHeight: 1.6 },
  insightDot: { color: "#7c8a64", flexShrink: 0, marginTop: 1, fontSize: 11 },
  disclaimer: { fontSize: 11, color: "#c9b99a", marginTop: 6, lineHeight: 1.5, fontStyle: "italic" },
  foodFreqRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  foodFreqRank: { fontSize: 11, fontWeight: 700, color: "#c9b99a", width: 16, flexShrink: 0, textAlign: "right" as const },
  foodFreqBarWrap: { flex: 1 },
  foodFreqLabel: { fontSize: 13, fontWeight: 600, color: "#2f2a24", marginBottom: 4 },
  foodFreqTrack: { height: 5, background: "#f4efe3", borderRadius: 99, overflow: "hidden", border: "1px solid #e0d4c0" },
  foodFreqFill: { height: "100%", background: "#7c8a64", borderRadius: 99, transition: "width 0.4s ease" },
  foodFreqCount: { fontSize: 12, fontWeight: 700, color: "#7c8a64", flexShrink: 0, width: 24, textAlign: "right" as const },
  editorHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingTop: 8 },
  editorTitle: { fontSize: 18, fontWeight: 700, color: "#2f2a24" },
  backBtn: { background: "transparent", border: "none", color: "#8b7d6b", fontSize: 14, cursor: "pointer", padding: "6px 0" },
  saveBtn: { background: "#7c8a64", border: "1.5px solid #4d5a3d", borderRadius: 10, padding: "8px 18px", color: "#fff8ea", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  fieldGroup: { marginBottom: 16 },
  fieldRow: { display: "flex", gap: 10, marginBottom: 16 },
  fieldLabel: { fontSize: 10, fontWeight: 700, color: "#7c8a64", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 },
  fieldLabelRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  fieldInput: { width: "100%", background: "#fffdf6", border: "1.5px solid #c9b99a", borderRadius: 10, padding: "11px 13px", color: "#2f2a24", fontSize: 13, boxSizing: "border-box" },
  fieldSelect: { width: "100%", background: "#fffdf6", border: "1.5px solid #c9b99a", borderRadius: 10, padding: "11px 13px", color: "#2f2a24", fontSize: 13 },
  macroInputRow: { display: "flex", gap: 8, marginBottom: 16 },
  macroInputBox: { flex: 1, background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 10, padding: "10px 8px", textAlign: "center" },
  macroInputLabel: { fontSize: 10, color: "#8b7d6b", marginBottom: 6, textTransform: "uppercase" },
  macroInput: { width: "100%", background: "transparent", border: "none", color: "#2f2a24", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" },
  ingredientRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 },
  stepNum: { color: "#c97b5a", fontWeight: 700, fontSize: 13, flexShrink: 0, minWidth: 18 },
  addRowBtn: { background: "#7c8a6422", border: "1.5px solid #7c8a6466", borderRadius: 8, padding: "4px 10px", color: "#4d5a3d", fontSize: 12, cursor: "pointer" },
  removeRowBtn: { background: "transparent", border: "none", color: "#c9b99a", fontSize: 14, cursor: "pointer", padding: "4px 6px", flexShrink: 0 },
  toggleRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  toggleChip: { background: "#fff8ea", border: "1.5px solid #c9b99a", borderRadius: 99, padding: "7px 14px", color: "#8b7d6b", fontSize: 12, cursor: "pointer" },
  toggleChipOn: { background: "#7c8a6422", border: "1.5px solid #7c8a64", color: "#4d5a3d" },
};
