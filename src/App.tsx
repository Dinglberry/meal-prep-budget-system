import React, { useMemo, useState } from "react";
import {
  ALL_CATEGORIES,
  aggregateGroceries,
  capitalize,
  currency,
  sumMacros,
  type SlotKey,
  type WeekPlan,
} from "./lib";
import { recipes } from "./data/recipes";
import { defaultPlan } from "./data/plan";

const WEEKLY_BUDGET = 50;
type DayKey = keyof WeekPlan;
type Screen = "home" | "recipes" | "planner" | "budget";

function getRecipeById(id: string) {
  const recipe = recipes.find((r) => r.id === id) ?? null;
  if (id && !recipe && import.meta.env.DEV) {
    console.warn(`[Glow Kitchen] No recipe found for id: "${id}"`);
  }
  return recipe;
}

const NAV = [
  { id: "home", label: "Home", icon: "⊙" },
  { id: "recipes", label: "Recipes", icon: "◈" },
  { id: "planner", label: "Planner", icon: "▦" },
  { id: "budget", label: "Budget", icon: "◎" },
] as const;

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [stomachSafeOnly, setStomachSafeOnly] = useState(true);
  const [plan, setPlan] = useState<WeekPlan>(defaultPlan);
  const [selectedDay, setSelectedDay] = useState<DayKey>("Monday");
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("breakfast");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  const categories = useMemo(
    () => [ALL_CATEGORIES, ...Array.from(new Set(recipes.map((r) => r.category)))],
    []
  );

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const needle = query.trim().toLowerCase();
      const matchesQuery =
        needle.length === 0 ||
        recipe.name.toLowerCase().includes(needle) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(needle));
      const matchesCategory = category === ALL_CATEGORIES || recipe.category === category;
      const matchesStomach = !stomachSafeOnly || recipe.stomachSafe;
      return matchesQuery && matchesCategory && matchesStomach;
    });
  }, [query, category, stomachSafeOnly]);

  const weeklyRecipes = useMemo(() => {
    return Object.values(plan)
      .flatMap((day) => Object.values(day))
      .map((id) => getRecipeById(id))
      .filter((r): r is NonNullable<ReturnType<typeof getRecipeById>> => Boolean(r));
  }, [plan]);

  const weeklyMacros = useMemo(() => sumMacros(weeklyRecipes), [weeklyRecipes]);
  const averageDailyMacros = useMemo(() => ({
    calories: Math.round(weeklyMacros.calories / 7),
    protein: Math.round(weeklyMacros.protein / 7),
    carbs: Math.round(weeklyMacros.carbs / 7),
    fat: Math.round(weeklyMacros.fat / 7),
  }), [weeklyMacros]);

  const groceries = useMemo(() => aggregateGroceries(weeklyRecipes), [weeklyRecipes]);
  const groceryTotal = useMemo(
    () => groceries.reduce((acc, item) => acc + item.estimatedCost, 0),
    [groceries]
  );
  const [budgetTarget, setBudgetTarget] = useState(50);

const [editableGroceries, setEditableGroceries] = useState(() =>
  groceries.map((item) => ({
    name: item.name,
    category: item.category,
    uses: item.uses,
    estimatedCost: item.estimatedCost,
  }))
);

const editableTotal = Number(
  editableGroceries.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2)
);

function updateGrocery(
  index: number,
  field: "name" | "category" | "estimatedCost",
  value: string
) {
  setEditableGroceries((current) =>
    current.map((item, i) =>
      i === index
        ? {
            ...item,
            [field]: field === "estimatedCost" ? Number(value) || 0 : value,
          }
        : item
    )
  );
}

function addGroceryItem() {
  setEditableGroceries((current) => [
    ...current,
    {
      name: "New item",
      category: "Custom",
      uses: 1,
      estimatedCost: 0,
    },
  ]);
}

function deleteGroceryItem(index: number) {
  setEditableGroceries((current) => current.filter((_, i) => i !== index));
}
  const budgetRemaining = Number((budgetTarget - editableTotal).toFixed(2));
const budgetPercent = Math.min(100, Math.round((editableTotal / budgetTarget) * 100));
  const currentDayRecipes = useMemo(() => {
    const day = plan[selectedDay];
    return Object.entries(day).map(([slot, id]) => ({
      slot: slot as SlotKey,
      recipe: getRecipeById(id),
    }));
  }, [plan, selectedDay]);

  const dayMacroTotal = useMemo(() =>
    sumMacros(currentDayRecipes.map(({ recipe }) => recipe).filter((r): r is NonNullable<typeof r> => Boolean(r))),
    [currentDayRecipes]
  );

  function assignRecipe(recipeId: string) {
    setPlan((prev) => ({
      ...prev,
      [selectedDay]: { ...prev[selectedDay], [selectedSlot]: recipeId },
    }));
    setAddedId(recipeId);
    setTimeout(() => setAddedId(null), 1500);
  }

  function clearSlot(day: DayKey, slot: string) {
    setPlan((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: "" },
    }));
  }

  function handleDayChange(day: DayKey) {
    setSelectedDay(day);
    setSelectedSlot(Object.keys(plan[day])[0] as SlotKey);
  }

  const todaySlots = currentDayRecipes.filter(({ recipe }) => recipe);

  return (
    <div style={s.shell}>
      <div style={s.statusBar} />
      <div style={s.screenWrap}>

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
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={budgetRemaining >= 0 ? "#a8e6cf" : "#ff6b6b"}
                    strokeWidth="10"
                    strokeDasharray={`${budgetPercent * 3.14} 314`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dasharray 0.6s ease" }}
                  />
                  <text x="60" y="54" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700">{currency(groceryTotal)}</text>
                  <text x="60" y="72" textAnchor="middle" fill="#a8e6cf" fontSize="10">of {currency(WEEKLY_BUDGET)}</text>
                </svg>
              </div>
              <div style={s.ringInfo}>
                <div style={s.ringLabel}>Weekly Budget</div>
                <div style={s.ringAmount}>{budgetRemaining >= 0 ? `${currency(budgetRemaining)} left` : `${currency(Math.abs(budgetRemaining))} over`}</div>
                <div style={s.ringMeta}>{budgetPercent}% used</div>
              </div>
            </div>

            <div style={s.sectionLabel}>Daily Average</div>
            <div style={s.macroStrip}>
              {[
                { label: "Cal", value: averageDailyMacros.calories, unit: "" },
                { label: "Protein", value: averageDailyMacros.protein, unit: "g" },
                { label: "Carbs", value: averageDailyMacros.carbs, unit: "g" },
                { label: "Fat", value: averageDailyMacros.fat, unit: "g" },
              ].map((m) => (
                <div key={m.label} style={s.macroChip}>
                  <div style={s.macroVal}>{m.value}{m.unit}</div>
                  <div style={s.macroLbl}>{m.label}</div>
                </div>
              ))}
            </div>

            <div style={s.sectionLabel}>Today · {selectedDay}</div>
            {todaySlots.length === 0 ? (
              <div style={s.emptyState}>No meals planned yet — head to Planner</div>
            ) : (
              <div style={s.todayList}>
                {todaySlots.map(({ slot, recipe }) => recipe && (
                  <div key={slot} style={s.todayRow}>
                    <div style={s.todaySlotBadge}>{capitalize(slot)}</div>
                    <div style={s.todayRowInfo}>
                      <div style={s.todayRowName}>{recipe.name}</div>
                      <div style={s.todayRowMeta}>{recipe.macros.calories} cal · {recipe.macros.protein}g protein</div>
                    </div>
                    <div style={s.todayRowCal}>{recipe.macros.calories}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={s.sectionLabel}>Quick Access</div>
            <div style={s.quickGrid}>
              {[
                { screen: "recipes" as Screen, emoji: "◈", label: "Recipes", sub: `${recipes.length} meals` },
                { screen: "planner" as Screen, emoji: "▦", label: "Planner", sub: "This week" },
                { screen: "budget" as Screen, emoji: "◎", label: "Grocery List", sub: `${groceries.length} items` },
              ].map((tile) => (
                <button key={tile.screen} style={s.quickTile} onClick={() => setScreen(tile.screen)}>
                  <div style={s.quickEmoji}>{tile.emoji}</div>
                  <div style={s.quickLabel}>{tile.label}</div>
                  <div style={s.quickSub}>{tile.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === "recipes" && (
          <div style={s.screen}>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Recipes</div>
              <div style={s.pageCount}>{filteredRecipes.length} of {recipes.length}</div>
            </div>

            <input
              style={s.searchBar}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍  Search recipes or tags…"
            />

            <div style={s.chipRow}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  style={{ ...s.chip, ...(category === cat ? s.chipActive : {}) }}
                  onClick={() => setCategory(cat)}
                >
                  {cat === ALL_CATEGORIES ? "All" : cat}
                </button>
              ))}
              <button
                style={{ ...s.chip, ...(stomachSafeOnly ? s.chipGreen : {}) }}
                onClick={() => setStomachSafeOnly(!stomachSafeOnly)}
              >
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
                          {[
                            { l: "Cal", v: recipe.macros.calories },
                            { l: "Protein", v: `${recipe.macros.protein}g` },
                            { l: "Carbs", v: `${recipe.macros.carbs}g` },
                            { l: "Fat", v: `${recipe.macros.fat}g` },
                          ].map((m) => (
                            <div key={m.l} style={s.miniMacroBox}>
                              <div style={s.miniMacroVal}>{m.v}</div>
                              <div style={s.miniMacroLbl}>{m.l}</div>
                            </div>
                          ))}
                        </div>
                        <div style={s.expandSection}>
                          <div style={s.expandTitle}>Ingredients</div>
                          {recipe.ingredients.map((ing) => (
                            <div key={ing.item} style={s.expandRow}>
                              <span style={s.expandDot}>·</span>
                              <span>{ing.amount} {ing.item}</span>
                            </div>
                          ))}
                        </div>
                        <div style={s.expandSection}>
                          <div style={s.expandTitle}>Instructions</div>
                          {recipe.instructions.map((step, i) => (
                            <div key={i} style={s.expandRow}>
                              <span style={s.expandNum}>{i + 1}</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                        <div style={s.tagRow}>
                          {recipe.tags.map((tag) => (
                            <span key={tag} style={s.tag}>{tag}</span>
                          ))}
                        </div>
                        <button
                          style={{ ...s.addBtn, background: isAdded ? "#a8e6cf" : "#a8e6cf22", color: isAdded ? "#0d1a12" : "#a8e6cf" }}
                          onClick={() => assignRecipe(recipe.id)}
                        >
                          {isAdded ? "✓ Added!" : `+ Add to ${selectedDay} ${capitalize(selectedSlot)}`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {screen === "planner" && (
          <div style={s.screen}>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Meal Planner</div>
            </div>
            <div style={s.dayScroll}>
              {Object.keys(plan).map((day) => (
                <button
                  key={day}
                  style={{ ...s.dayChip, ...(selectedDay === day ? s.dayChipActive : {}) }}
                  onClick={() => handleDayChange(day as DayKey)}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
            <div style={s.dayMacroBar}>
              <span style={s.dayMacroItem}>🔥 {dayMacroTotal.calories} cal</span>
              <span style={s.dayMacroItem}>💪 {dayMacroTotal.protein}g protein</span>
              <span style={s.dayMacroItem}>🍚 {dayMacroTotal.carbs}g carbs</span>
            </div>
            <div style={s.slotTabRow}>
              {Object.keys(plan[selectedDay]).map((sl) => (
                <button
                  key={sl}
                  style={{ ...s.slotTab, ...(selectedSlot === sl ? s.slotTabActive : {}) }}
                  onClick={() => setSelectedSlot(sl as SlotKey)}
                >
                  {capitalize(sl)}
                </button>
              ))}
            </div>
            <div style={s.slotList}>
              {currentDayRecipes.map(({ slot, recipe }) => (
                <div key={slot} style={{ ...s.slotCard, ...(selectedSlot === slot ? s.slotCardActive : {}) }}>
                  <div style={s.slotCardTop}>
                    <div style={s.slotBadge}>{capitalize(slot)}</div>
                    {recipe && (
                      <button style={s.clearBtn} onClick={() => clearSlot(selectedDay, slot)}>✕</button>
                    )}
                  </div>
                  <div style={s.slotCardName}>{recipe ? recipe.name : "— empty —"}</div>
                  {recipe && (
                    <div style={s.slotCardMeta}>{recipe.macros.calories} cal · {recipe.macros.protein}g protein · {recipe.macros.carbs}g carbs</div>
                  )}
                </div>
              ))}
            </div>
            <button style={s.goRecipesBtn} onClick={() => setScreen("recipes")}>
              + Browse Recipes to Fill Slots
            </button>
          </div>
        )}

        {screen === "budget" && (
          <div style={s.screen}>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Grocery & Budget</div>
            </div>
            <div style={s.budgetCard}>
              <div style={s.budgetCardRow}>
                <div>
                  <div style={s.budgetBig}>{currency(groceryTotal)}</div>
                  <div style={s.budgetSub}>of {currency(WEEKLY_BUDGET)} weekly budget</div>
                </div>
                <div style={{
                  ...s.budgetPill,
                  background: budgetRemaining >= 0 ? "#a8e6cf22" : "#ff6b6b22",
                  color: budgetRemaining >= 0 ? "#a8e6cf" : "#ff6b6b",
                  border: `1px solid ${budgetRemaining >= 0 ? "#a8e6cf44" : "#ff6b6b44"}`,
                }}>
                  {budgetRemaining >= 0 ? `${currency(budgetRemaining)} left` : `${currency(Math.abs(budgetRemaining))} over`}
                </div>
              </div>
              <div style={s.budgetTrack}>
                <div style={{ ...s.budgetFill, width: `${budgetPercent}%`, background: budgetRemaining >= 0 ? "#a8e6cf" : "#ff6b6b" }} />
              </div>
            </div>

            <div style={s.sectionLabel}>Portion Rules</div>
            <div style={s.rulesCard}>
              {[
                "Greek yogurt: 3/4 cup max per meal",
                "Rice: 1 cup cooked max per meal",
                "Chicken: 4 oz standard, 6 oz on high-protein days",
                "Almond butter: 1 tbsp per serving",
                "Coffee: 2 tbsp milk + 1 tsp sweetener max",
                "No tomatoes · Keep spice mild",
              ].map((rule) => (
                <div key={rule} style={s.ruleRow}>
                  <span style={s.ruleDot}>◆</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>

            <div style={s.sectionLabel}>Grocery List · {groceries.length} items</div>
            <div style={s.groceryList}>
              {groceries.map((item) => (
                <div key={`${item.name}-${item.category}`} style={s.groceryRow}>
                  <div style={s.groceryLeft}>
                    <div style={s.groceryName}>{item.name}</div>
                    <div style={s.groceryMeta}>{item.amount} · {item.category} · {item.uses}x/week</div>
                  </div>
                  <div style={s.groceryCost}>{currency(item.estimatedCost)}</div>
                </div>
              ))}
            </div>

            <div style={s.sectionLabel}>Container Guide</div>
            <div style={s.containerList}>
              {[
                { title: "Breakfast Jar (24 oz)", body: "Bottom: fruit + honey · Top: yogurt · Crunchy items separate" },
                { title: "Lunch Bowl (24 oz)", body: "Bottom: rice · Middle: veg · Top: protein · Sauce separate" },
                { title: "Snack Box (12 oz)", body: "One exact portion only — e.g. 2 eggs + 1 apple" },
              ].map((c) => (
                <div key={c.title} style={s.containerCard}>
                  <div style={s.containerTitle}>{c.title}</div>
                  <div style={s.containerBody}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <nav style={s.bottomNav}>
        {NAV.map((item) => (
          <button
            key={item.id}
            style={{ ...s.navBtn, ...(screen === item.id ? s.navBtnActive : {}) }}
            onClick={() => setScreen(item.id as Screen)}
          >
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
  shell: { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#0d0d1a", color: "#f0f0f8", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif", position: "relative", overflow: "hidden" },
  statusBar: { height: 3, background: "linear-gradient(90deg, #a8e6cf, #88d8b0, #a8e6cf)", flexShrink: 0 },
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
  macroChip: { flex: 1, background: "#161628", border: "1px solid #ffffff0d", borderRadius: 14, padding: "12px 8px", textAlign: "center" },
  macroVal: { fontSize: 18, fontWeight: 700, color: "#f0f0f8" },
  macroLbl: { fontSize: 11, color: "#6b7280", marginTop: 3 },
  todayList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 },
  todayRow: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 },
  todaySlotBadge: { background: "#a8e6cf22", color: "#a8e6cf", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 600, flexShrink: 0 },
  todayRowInfo: { flex: 1 },
  todayRowName: { fontSize: 14, fontWeight: 600 },
  todayRowMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  todayRowCal: { fontSize: 13, fontWeight: 700, color: "#a8e6cf", flexShrink: 0 },
  emptyState: { textAlign: "center", color: "#6b7280", padding: "24px 0", fontSize: 14, marginBottom: 24 },
  quickGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 },
  quickTile: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 16, padding: "16px 10px", textAlign: "center", cursor: "pointer", color: "#f0f0f8" },
  quickEmoji: { fontSize: 22, marginBottom: 6 },
  quickLabel: { fontSize: 13, fontWeight: 700 },
  quickSub: { fontSize: 11, color: "#6b7280", marginTop: 3 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingTop: 8 },
  pageTitle: { fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" },
  pageCount: { fontSize: 13, color: "#6b7280" },
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
  addBtn: { width: "100%", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" },
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
  budgetCard: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 20, padding: 20, marginBottom: 24 },
  budgetCardRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  budgetBig: { fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" },
  budgetSub: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  budgetPill: { borderRadius: 99, padding: "6px 14px", fontSize: 13, fontWeight: 700, flexShrink: 0 },
  budgetTrack: { height: 8, background: "#0d0d1a", borderRadius: 99, overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 99, transition: "width 0.5s ease" },
  rulesCard: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 },
  ruleRow: { display: "flex", gap: 10, fontSize: 13, color: "#d1d5db", lineHeight: 1.5 },
  ruleDot: { color: "#a8e6cf", flexShrink: 0, fontSize: 10, marginTop: 3 },
  groceryList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 },
  groceryRow: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 14, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  groceryLeft: { flex: 1 },
  groceryName: { fontSize: 14, fontWeight: 600 },
  groceryMeta: { fontSize: 12, color: "#6b7280", marginTop: 3 },
  groceryCost: { fontSize: 14, fontWeight: 700, color: "#a8e6cf", flexShrink: 0 },
  containerList: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 },
  containerCard: { background: "#161628", border: "1px solid #ffffff0d", borderRadius: 14, padding: "14px 16px" },
  containerTitle: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  containerBody: { fontSize: 13, color: "#9ca3af", lineHeight: 1.5 },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#0d0d1aee", backdropFilter: "blur(20px)", borderTop: "1px solid #ffffff0d", display: "flex", padding: "8px 0 12px" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "transparent", border: "none", cursor: "pointer", padding: "6px 0", position: "relative" },
  navBtnActive: {},
  navIcon: { fontSize: 18, color: "#6b7280", lineHeight: 1 },
  navLabel: { fontSize: 10, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em" },
  navDot: { width: 4, height: 4, borderRadius: 99, background: "#a8e6cf", position: "absolute", bottom: -2 },
};