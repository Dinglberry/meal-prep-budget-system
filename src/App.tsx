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

const NAV = [
  { id: "home", label: "Home", icon: "⊙" },
  { id: "recipes", label: "Recipes", icon: "◈" },
  { id: "planner", label: "Planner", icon: "▦" },
  { id: "budget", label: "Budget", icon: "◎" },
  { id: "insights", label: "Insights", icon: "◬" },
] as const;

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

type EditableGrocery = { name: string; category: string; uses: number; estimatedCost: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [stomachSafeOnly, setStomachSafeOnly] = useState(true);
  const [plan, setPlan] = useState<WeekPlan>(defaultPlan);
  const [selectedDay, setSelectedDay] = useState<DayKey>("Monday");
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("breakfast");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<(Recipe & { isNew?: boolean }) | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Budget & groceries
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

  // Monthly tracking
  const [monthlyPicks, setMonthlyPicks] = useState<Record<string, number>>({});

  // Profile
  const [profile, setProfile] = useState({ age: "", height: "", weight: "", gender: "female" });

  // Macro goals
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

  // Macro gaps
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
    macroGaps.protein < -10 && `You're ~${Math.abs(macroGaps.protein)}g over protein. You may not need to change anything — extra protein is generally fine.`,
    macroGaps.carbs > 20 && `You need ~${macroGaps.carbs}g more carbs. Add rice, oats, bananas, or whole grain toast.`,
    macroGaps.carbs < -20 && `You're ~${Math.abs(macroGaps.carbs)}g over carbs. Reduce rice, bread, or honey portions.`,
    macroGaps.fat > 10 && `You need ~${macroGaps.fat}g more fat. Add avocado, olive oil, nuts, or eggs.`,
    macroGaps.fat < -10 && `You're ~${Math.abs(macroGaps.fat)}g over fat. Reduce oils or nut butter.`,
  ].filter(Boolean) as string[];

  // Nutrition gap detection
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

  // Most picked this session
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
    setEditableGroceries((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: field === "estimatedCost" ? Number(value) || 0 : value } : item));
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
                  {["Breakfast", "Bowls", "Snacks", "Drinks"].map((c) => <option key={c}>{c}</option>)}
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
      <div style={s.statusBar} />
      <div style={s.screenWrap}>

        {/* ── HOME ── */}
        {screen === "home" && (
          <div style={s.screen}>
            <div style={s.homeHeader}>
              <div style={s.homeEyebrow}>Good morning ✦</div>
              <div style={s.homeLogo}>Glow Kitchen</div>
              <div style={s.homeTagline}>your weekly meal system</div>
            </div>

            <div style={s.budgetRingCard}>
              <div style={s.ringOuter}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#1a1a2e" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={budgetRemaining >= 0 ? "#a8e6cf" : "#ff6b6b"} strokeWidth="10" strokeDasharray={`${budgetPercent * 3.14} 314`} strokeLinecap="round" transform="rotate(-90 60 60)" />
                  <text x="60" y="54" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700">{currency(editableTotal)}</text>
                  <text x="60" y="72" textAnchor="middle" fill="#a8e6cf" fontSize="10">of {currency(budgetTarget)}</text>
                </svg>
              </div>
              <div style={s.ringInfo}>
                <div style={s.ringLabel}>Weekly Budget</div>
                <div style={s.ringAmount}>{budgetRemaining >= 0 ? `${currency(budgetRemaining)} left` : `${currency(Math.abs(budgetRemaining))} over`}</div>
                <div style={s.ringMeta}>{budgetPercent}% used</div>
              </div>
            </div>

            <div style={s.sectionLabel}>Daily Average vs Goals</div>
            <div style={s.macroStrip}>
              {([["Cal", averageDailyMacros.calories, macroGoals.calories, ""], ["Protein", averageDailyMacros.protein, macroGoals.protein, "g"], ["Carbs", averageDailyMacros.carbs, macroGoals.carbs, "g"], ["Fat", averageDailyMacros.fat, macroGoals.fat, "g"]] as [string, number, number, string][]).map(([label, current, goal, unit]) => {
                const pct = Math.min(100, Math.round((current / goal) * 100));
                const ok = pct >= 80 && pct <= 120;
                return (
                  <div key={label} style={s.macroChip}>
                    <div style={{ ...s.macroVal, color: ok ? "#a8e6cf" : "#ffb347" }}>{current}{unit}</div>
                    <div style={s.macroLbl}>{label}</div>
                    <div style={s.macroGoalLbl}>goal {goal}{unit}</div>
                  </div>
                );
              })}
            </div>

            <div style={s.sectionLabel}>Today · {selectedDay}</div>
            {todaySlots.length === 0 ? (
              <div style={s.emptyState}>No meals planned yet</div>
            ) : (
              <div style={s.todayList}>
                {todaySlots.map(({ slot, recipe }) => recipe && (
                  <div key={slot} style={s.todayRow}>
                    <div style={s.todaySlotBadge}>{capitalize(slot)}</div>
                    <div style={s.todayRowInfo}>
                      <div style={s.todayRowName}>{recipe.name}</div>
                      <div style={s.todayRowMeta}>{recipe.macros.calories} cal · {recipe.macros.protein}g protein</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={s.sectionLabel}>Quick Access</div>
            <div style={s.quickGrid}>
              {([["recipes", "◈", "Recipes", `${recipes.length} meals`], ["planner", "▦", "Planner", "This week"], ["budget", "◎", "Budget", `${editableGroceries.length} items`], ["insights", "◬", "Insights", "Nutrition"]] as [Screen, string, string, string][]).map(([sc, emoji, label, sub]) => (
                <button key={sc} style={s.quickTile} onClick={() => setScreen(sc)}>
                  <div style={s.quickEmoji}>{emoji}</div>
                  <div style={s.quickLabel}>{label}</div>
                  <div style={s.quickSub}>{sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RECIPES ── */}
        {screen === "recipes" && (
          <div style={s.screen}>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Recipes</div>
              <button style={s.newRecipeBtn} onClick={openNewRecipe}>+ New</button>
            </div>
            <input style={s.searchBar} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍  Search recipes or tags…" />
            <div style={s.chipRow}>
              {categories.map((cat) => (
                <button key={cat} style={{ ...s.chip, ...(category === cat ? s.chipActive : {}) }} onClick={() => setCategory(cat)}>
                  {cat === ALL_CATEGORIES ? "All" : cat}
                </button>
              ))}
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
                        <div style={s.recipeCardName}>{recipe.name}</div>
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
                            {recipe.ingredients.map((ing) => <div key={ing.item} style={s.expandRow}><span style={s.expandDot}>·</span><span>{ing.amount} {ing.item}</span></div>)}
                          </div>
                        )}
                        {recipe.instructions.length > 0 && (
                          <div style={s.expandSection}>
                            <div style={s.expandTitle}>Instructions</div>
                            {recipe.instructions.map((step, i) => <div key={i} style={s.expandRow}><span style={s.expandNum}>{i + 1}</span><span>{step}</span></div>)}
                          </div>
                        )}
                        {recipe.tags.length > 0 && <div style={s.tagRow}>{recipe.tags.map((tag) => <span key={tag} style={s.tag}>{tag}</span>)}</div>}
                        <button style={{ ...s.addBtn, background: isAdded ? "#a8e6cf" : "#a8e6cf22", color: isAdded ? "#0d1a12" : "#a8e6cf" }} onClick={() => assignRecipe(recipe.id)}>
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
              <div style={s.budgetCardRow}>
                <div>
                  <div style={s.budgetBig}>{currency(editableTotal)}</div>
                  <div style={s.budgetSub}>of {currency(budgetTarget)} target</div>
                </div>
                <div style={{ ...s.budgetPill, background: budgetRemaining >= 0 ? "#a8e6cf22" : "#ff6b6b22", color: budgetRemaining >= 0 ? "#a8e6cf" : "#ff6b6b", border: `1px solid ${budgetRemaining >= 0 ? "#a8e6cf44" : "#ff6b6b44"}` }}>
                  {budgetRemaining >= 0 ? `${currency(budgetRemaining)} left` : `${currency(Math.abs(budgetRemaining))} over`}
                </div>
              </div>
              <div style={s.budgetTrack}>
                <div style={{ ...s.budgetFill, width: `${budgetPercent}%`, background: budgetRemaining >= 0 ? "#a8e6cf" : "#ff6b6b" }} />
              </div>
            </div>

            <div style={s.sectionLabel}>Budget Target</div>
            <div style={s.budgetTargetRow}>
              <span style={s.budgetTargetLabel}>$</span>
              <input type="number" style={s.budgetTargetInput} value={budgetTarget} onChange={(e) => setBudgetTarget(Number(e.target.value) || 0)} />
              <button style={s.resetBtn} onClick={resetBudget}>↺ Reset</button>
            </div>

            <div style={s.sectionLabel}>Grocery List</div>
            <button style={s.addGroceryBtn} onClick={addGroceryItem}>+ Add Item</button>
            <div style={s.groceryList}>
              {editableGroceries.map((item, i) => (
                <div key={`${item.name}-${i}`} style={s.groceryEditRow}>
                  <div style={s.groceryEditLeft}>
                    <input style={s.groceryEditInput} value={item.name} onChange={(e) => updateGrocery(i, "name", e.target.value)} placeholder="Item name" />
                    <input style={{ ...s.groceryEditInput, fontSize: 11, color: "#6b7280" }} value={item.category} onChange={(e) => updateGrocery(i, "category", e.target.value)} placeholder="Category" />
                  </div>
                  <div style={s.groceryEditRight}>
                    <span style={s.groceryUses}>{item.uses}x</span>
                    <input type="number" style={s.groceryCostInput} value={item.estimatedCost} onChange={(e) => updateGrocery(i, "estimatedCost", e.target.value)} />
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

            {/* Profile */}
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

            {/* Macro Goals */}
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
                      <div style={{ ...s.macroGoalFill, width: `${pct}%`, background: ok ? "#a8e6cf" : "#ffb347" }} />
                    </div>
                    <div style={s.macroGoalNums}>
                      <span style={{ color: ok ? "#a8e6cf" : "#ffb347" }}>{current}</span>
                      <span style={s.macroGoalSlash}>/</span>
                      <input type="number" style={s.macroGoalInput} value={goal} onChange={(e) => setMacroGoals((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Macro suggestions */}
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
                <div style={{ color: "#a8e6cf", fontWeight: 600, fontSize: 14 }}>✓ Your plan is close to all your macro goals!</div>
              </div>
            )}

            {/* Nutrition gaps */}
            <div style={s.sectionLabel}>Nutrition Pattern Check</div>
            <div style={s.insightCard}>
              {nutritionGaps.length === 0 ? (
                <div style={{ color: "#a8e6cf", fontWeight: 600, fontSize: 14 }}>✓ Your plan looks balanced across the categories this app can detect.</div>
              ) : (
                nutritionGaps.map((gap) => <div key={gap} style={s.insightRow}><span style={s.insightDot}>⚠</span><span>{gap}</span></div>)
              )}
              {personalizedNotes.map((note) => <div key={note} style={s.insightRow}><span style={s.insightDot}>ℹ</span><span>{note}</span></div>)}
              <div style={s.disclaimer}>This is a food-pattern check only, not medical advice. Speak with a doctor or dietitian about supplements.</div>
            </div>

            {/* Monthly picks */}
            <div style={s.sectionLabel}>Most Added This Session</div>
            <div style={s.insightCard}>
              {mostPicked.length === 0 ? (
                <div style={{ color: "#6b7280", fontSize: 13 }}>Add recipes to your planner to start tracking.</div>
              ) : (
                mostPicked.map(({ recipe, count }) => recipe && (
                  <div key={recipe.id} style={s.insightRow}>
                    <span style={s.insightDot}>◆</span>
                    <span><strong>{recipe.name}</strong> — added {count}x</span>
                  </div>
                ))
              )}
              {mostPicked.length > 0 && (
                <button style={{ ...s.resetBtn, marginTop: 12 }} onClick={() => setMonthlyPicks({})}>↺ Reset tracking</button>
              )}
            </div>

            <div style={{ height: 16 }} />
          </div>
        )}
      </div>

      <nav style={s.bottomNav}>
        {NAV.map((item) => (
          <button key={item.id} style={s.navBtn} onClick={() => setScreen(item.id as Screen)}>
            <span style={{ ...s.navIcon, ...(screen === item.id ? { color: "#a8e6cf" } : {}) }}>{item.icon}</span>
            <span style={{ ...s.navLabel, ...(screen === item.id ? { color: "#a8e6cf" } : {}) }}>{item.label}</span>
            {screen === item.id && <div style={s.navDot} />}
          </button>
        ))}
      </nav>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#0d0d1a", color: "#f0f0f8", display: "flex", flexDirection: "column", fontFamily: "'DM Sans','SF Pro Display',-apple-system,sans-serif", position: "relative", overflow: "hidden" },
  statusBar: { height: 3, background: "linear-gradient(90deg,#a8e6cf,#88d8b0,#a8e6cf)", flexShrink: 0 },
  screenWrap: { flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 80 },
  screen: { padding: "20px 16px 0" },
  homeHeader: { marginBottom: 24, paddingTop: 8 },
  homeEyebrow: { fontSize: 12, color: "#a8e6cf", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 },
  homeLogo: { fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 },
  homeTagline: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  budgetRingCard: { background: "#161628", borderRadius: 20, padding: 20, display: "flex", alignItems: "center", gap: 20, marginBottom: 24, border: "1px solid #ffffff0d" },
  ringOuter: { flexShrink: 0 },
  ringInfo: {},
  ringLabel: { fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 },
  ringAmount: { fontSize: 22, fontWeight: 700, color: "#a8e6cf" },
  ringMeta: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, marginTop: 4 },
  macroStrip: { display: "flex", gap: 8, marginBottom: 24 },
  macroChip: { flex: 1, background: "#161628", border: "1px solid #ffffff0d", borderRadius: 14, padding: "10px 6px", textAlign: "center" },
  macroVal: { fontSize: 16, fontWeight: 700 },
  macroLbl: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  macroGoalLbl: { fontSize: 10, color: "#444466", marginTop: 2 },
  todayList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 },
  todayRow: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 },
  todaySlotBadge: { background: "#a8e6cf22", color: "#a8e6cf", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 600, flexShrink: 0 },
  todayRowInfo: { flex: 1 },
  todayRowName: { fontSize: 14, fontWeight: 600 },
  todayRowMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  emptyState: { textAlign: "center", color: "#6b7280", padding: "24px 0", fontSize: 14, marginBottom: 24 },
  quickGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 },
  quickTile: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 14, padding: "14px 6px", textAlign: "center", cursor: "pointer", color: "#f0f0f8" },
  quickEmoji: { fontSize: 18, marginBottom: 5 },
  quickLabel: { fontSize: 11, fontWeight: 700 },
  quickSub: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingTop: 8 },
  pageTitle: { fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" },
  newRecipeBtn: { background: "#a8e6cf22", border: "1px solid #a8e6cf44", borderRadius: 10, padding: "8px 14px", color: "#a8e6cf", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  searchBar: { width: "100%", background: "#161628", border: "1px solid #ffffff0d", borderRadius: 14, padding: "13px 16px", color: "#f0f0f8", fontSize: 14, marginBottom: 12, boxSizing: "border-box" },
  chipRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  chip: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 99, padding: "6px 14px", fontSize: 13, color: "#9ca3af", cursor: "pointer" },
  chipActive: { background: "#a8e6cf22", border: "1px solid #a8e6cf66", color: "#a8e6cf" },
  chipGreen: { background: "#a8e6cf22", border: "1px solid #a8e6cf66", color: "#a8e6cf" },
  planStrip: { display: "flex", alignItems: "center", gap: 8, background: "#161628", border: "1px solid #ffffff0d", borderRadius: 12, padding: "10px 14px", marginBottom: 14, flexWrap: "wrap" },
  planStripLabel: { fontSize: 12, color: "#6b7280", flexShrink: 0 },
  miniSelect: { background: "#0d0d1a", border: "1px solid #ffffff15", borderRadius: 8, padding: "5px 10px", color: "#a8e6cf", fontSize: 13, cursor: "pointer" },
  recipeList: { display: "flex", flexDirection: "column", gap: 8 },
  recipeCard: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 16, overflow: "hidden" },
  recipeCardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", width: "100%", background: "transparent", border: "none", color: "#f0f0f8", cursor: "pointer", textAlign: "left", gap: 12 },
  recipeCardLeft: { flex: 1 },
  recipeCardName: { fontSize: 15, fontWeight: 600 },
  recipeCardMeta: { fontSize: 12, color: "#6b7280", marginTop: 3 },
  recipeChevron: { fontSize: 10, color: "#6b7280", flexShrink: 0 },
  recipeExpanded: { padding: "0 16px 16px", borderTop: "1px solid #ffffff0a" },
  miniMacroRow: { display: "flex", gap: 6, paddingTop: 14, marginBottom: 14 },
  miniMacroBox: { flex: 1, background: "#0d0d1a", borderRadius: 10, padding: "8px 6px", textAlign: "center" },
  miniMacroVal: { fontSize: 14, fontWeight: 700 },
  miniMacroLbl: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  expandSection: { marginBottom: 12 },
  expandTitle: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 },
  expandRow: { display: "flex", gap: 8, fontSize: 13, color: "#d1d5db", marginBottom: 5, lineHeight: 1.5 },
  expandDot: { color: "#a8e6cf", flexShrink: 0, marginTop: 1 },
  expandNum: { color: "#a8e6cf", fontWeight: 700, flexShrink: 0, minWidth: 16 },
  tagRow: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  tag: { background: "#ffffff08", borderRadius: 99, padding: "3px 10px", fontSize: 11, color: "#9ca3af" },
  addBtn: { width: "100%", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  recipeActions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  editBtn: { background: "#ffffff0a", border: "1px solid #ffffff15", borderRadius: 10, padding: "8px 14px", color: "#d1d5db", fontSize: 13, cursor: "pointer" },
  deleteBtn: { background: "#ff6b6b11", border: "1px solid #ff6b6b33", borderRadius: 10, padding: "8px 14px", color: "#ff6b6b", fontSize: 13, cursor: "pointer" },
  confirmRow: { display: "flex", gap: 6, alignItems: "center" },
  confirmText: { fontSize: 12, color: "#ff6b6b" },
  confirmYes: { background: "#ff6b6b", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  confirmNo: { background: "#ffffff0a", border: "none", borderRadius: 8, padding: "6px 12px", color: "#9ca3af", fontSize: 12, cursor: "pointer" },
  recipeCount: { textAlign: "center", fontSize: 12, color: "#444466", padding: "12px 0 4px" },
  dayScroll: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", paddingTop: 8 },
  dayChip: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#9ca3af", cursor: "pointer" },
  dayChipActive: { background: "#a8e6cf", color: "#0d1a12", border: "1px solid #a8e6cf" },
  dayMacroBar: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 12, padding: "10px 14px", display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" },
  dayMacroItem: { fontSize: 13, color: "#d1d5db" },
  slotTabRow: { display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  slotTab: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 99, padding: "6px 14px", fontSize: 12, color: "#9ca3af", cursor: "pointer" },
  slotTabActive: { background: "#ffffff15", color: "#f0f0f8", border: "1px solid #ffffff22" },
  slotList: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  slotCard: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 16, padding: "14px 16px" },
  slotCardActive: { border: "1px solid #a8e6cf44" },
  slotCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  slotBadge: { fontSize: 11, fontWeight: 700, color: "#a8e6cf", textTransform: "uppercase", letterSpacing: "0.08em" },
  clearBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 14, cursor: "pointer", padding: "2px 6px" },
  slotCardName: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  slotCardMeta: { fontSize: 12, color: "#6b7280" },
  goRecipesBtn: { width: "100%", background: "#a8e6cf22", border: "1px solid #a8e6cf44", borderRadius: 14, padding: "14px", color: "#a8e6cf", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 16 },
  budgetCard: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 20, padding: 20, marginBottom: 20 },
  budgetCardRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  budgetBig: { fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" },
  budgetSub: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  budgetPill: { borderRadius: 99, padding: "6px 14px", fontSize: 13, fontWeight: 700, flexShrink: 0 },
  budgetTrack: { height: 8, background: "#0d0d1a", borderRadius: 99, overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 99, transition: "width 0.5s ease" },
  budgetTargetRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20, background: "#161628", border: "1px solid #ffffff0d", borderRadius: 14, padding: "12px 16px" },
  budgetTargetLabel: { fontSize: 20, fontWeight: 700, color: "#a8e6cf" },
  budgetTargetInput: { flex: 1, background: "transparent", border: "none", color: "#f0f0f8", fontSize: 20, fontWeight: 700, outline: "none" },
  resetBtn: { background: "#ffffff0a", border: "1px solid #ffffff15", borderRadius: 10, padding: "7px 12px", color: "#9ca3af", fontSize: 12, cursor: "pointer" },
  addGroceryBtn: { background: "#a8e6cf22", border: "1px solid #a8e6cf44", borderRadius: 12, padding: "10px 16px", color: "#a8e6cf", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12, width: "100%" },
  groceryList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 },
  groceryEditRow: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 14, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  groceryEditLeft: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  groceryEditInput: { background: "transparent", border: "none", color: "#f0f0f8", fontSize: 14, fontWeight: 600, outline: "none", width: "100%" },
  groceryEditRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  groceryUses: { fontSize: 11, color: "#6b7280" },
  groceryCostInput: { width: 60, background: "#0d0d1a", border: "1px solid #ffffff15", borderRadius: 8, padding: "4px 8px", color: "#a8e6cf", fontSize: 13, fontWeight: 700, textAlign: "right" },
  groceryDeleteBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 14, cursor: "pointer" },
  rulesCard: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 },
  ruleRow: { display: "flex", gap: 10, fontSize: 13, color: "#d1d5db", lineHeight: 1.5 },
  ruleDot: { color: "#a8e6cf", flexShrink: 0, fontSize: 10, marginTop: 3 },
  // Insights
  profileCard: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 16, padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 },
  profileField: {},
  profileFieldLabel: { fontSize: 11, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" },
  profileInput: { width: "100%", background: "#0d0d1a", border: "1px solid #ffffff15", borderRadius: 10, padding: "9px 10px", color: "#f0f0f8", fontSize: 14, boxSizing: "border-box" },
  macroGoalCard: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 },
  macroGoalRow: { display: "flex", alignItems: "center", gap: 10 },
  macroGoalLabel: { fontSize: 12, fontWeight: 600, color: "#9ca3af", width: 52, flexShrink: 0 },
  macroGoalBar: { flex: 1, height: 6, background: "#0d0d1a", borderRadius: 99, overflow: "hidden" },
  macroGoalFill: { height: "100%", borderRadius: 99, transition: "width 0.4s ease" },
  macroGoalNums: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  macroGoalSlash: { color: "#444466", fontSize: 12 },
  macroGoalInput: { width: 52, background: "#0d0d1a", border: "1px solid #ffffff15", borderRadius: 8, padding: "4px 6px", color: "#f0f0f8", fontSize: 13, textAlign: "right" },
  insightCard: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 },
  insightRow: { display: "flex", gap: 10, fontSize: 13, color: "#d1d5db", lineHeight: 1.55 },
  insightDot: { color: "#a8e6cf", flexShrink: 0, marginTop: 1, fontSize: 11 },
  disclaimer: { fontSize: 11, color: "#444466", marginTop: 6, lineHeight: 1.5 },
  // Editor
  editorHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingTop: 8 },
  editorTitle: { fontSize: 18, fontWeight: 700 },
  backBtn: { background: "transparent", border: "none", color: "#9ca3af", fontSize: 14, cursor: "pointer", padding: "6px 0" },
  saveBtn: { background: "#a8e6cf", border: "none", borderRadius: 10, padding: "8px 18px", color: "#0d1a12", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  fieldGroup: { marginBottom: 16 },
  fieldRow: { display: "flex", gap: 10, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 },
  fieldLabelRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  fieldInput: { width: "100%", background: "#161628", border: "1px solid #ffffff15", borderRadius: 10, padding: "11px 13px", color: "#f0f0f8", fontSize: 14, boxSizing: "border-box" },
  fieldSelect: { width: "100%", background: "#161628", border: "1px solid #ffffff15", borderRadius: 10, padding: "11px 13px", color: "#f0f0f8", fontSize: 14 },
  macroInputRow: { display: "flex", gap: 8, marginBottom: 16 },
  macroInputBox: { flex: 1, background: "#161628", border: "1px solid #ffffff0d", borderRadius: 10, padding: "10px 8px", textAlign: "center" },
  macroInputLabel: { fontSize: 10, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" },
  macroInput: { width: "100%", background: "transparent", border: "none", color: "#f0f0f8", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" },
  ingredientRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 },
  stepNum: { color: "#a8e6cf", fontWeight: 700, fontSize: 13, flexShrink: 0, minWidth: 18 },
  addRowBtn: { background: "#a8e6cf22", border: "1px solid #a8e6cf44", borderRadius: 8, padding: "4px 10px", color: "#a8e6cf", fontSize: 12, cursor: "pointer" },
  removeRowBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 14, cursor: "pointer", padding: "4px 6px", flexShrink: 0 },
  toggleRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  toggleChip: { background: "#161628", border: "1px solid #ffffff15", borderRadius: 99, padding: "7px 14px", color: "#9ca3af", fontSize: 13, cursor: "pointer" },
  toggleChipOn: { background: "#a8e6cf22", border: "1px solid #a8e6cf55", color: "#a8e6cf" },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#0d0d1aee", backdropFilter: "blur(20px)", borderTop: "1px solid #ffffff0d", display: "flex", padding: "8px 0 12px" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "transparent", border: "none", cursor: "pointer", padding: "6px 0", position: "relative" },
  navIcon: { fontSize: 18, color: "#6b7280", lineHeight: 1 },
  navLabel: { fontSize: 10, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em" },
  navDot: { width: 4, height: 4, borderRadius: 99, background: "#a8e6cf", position: "absolute", bottom: -2 },
};
