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
import { MetricCard } from "./components/MetricCard";
import { SectionCard } from "./components/SectionCard";

const WEEKLY_BUDGET = 50;

type DayKey = keyof WeekPlan;

function getRecipeById(id: string) {
  const recipe = recipes.find((r) => r.id === id) ?? null;
  // Fix: warn in dev when a plan references an unknown recipe id
  if (id && !recipe && import.meta.env.DEV) {
    console.warn(`[Glow Kitchen] No recipe found for id: "${id}"`);
  }
  return recipe;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [stomachSafeOnly, setStomachSafeOnly] = useState(true);
  const [plan, setPlan] = useState<WeekPlan>(defaultPlan);
  const [selectedDay, setSelectedDay] = useState<DayKey>("Monday");
  // Fix: initialize slot to first slot of the selected day
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("breakfast");
  // Fix: track a brief "added" confirmation per recipe
  const [addedId, setAddedId] = useState<string | null>(null);

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
        recipe.source.toLowerCase().includes(needle) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(needle));
      const matchesCategory =
        category === ALL_CATEGORIES || recipe.category === category;
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
  const averageDailyMacros = useMemo(
    () => ({
      calories: Math.round(weeklyMacros.calories / 7),
      protein: Math.round(weeklyMacros.protein / 7),
      carbs: Math.round(weeklyMacros.carbs / 7),
      fat: Math.round(weeklyMacros.fat / 7),
    }),
    [weeklyMacros]
  );

  const groceries = useMemo(() => aggregateGroceries(weeklyRecipes), [weeklyRecipes]);
  const groceryTotal = useMemo(
    () => groceries.reduce((acc, item) => acc + item.estimatedCost, 0),
    [groceries]
  );

  const currentDayRecipes = useMemo(() => {
    const day = plan[selectedDay];
    return Object.entries(day).map(([slot, id]) => ({
      slot: slot as SlotKey,
      recipe: getRecipeById(id),
    }));
  }, [plan, selectedDay]);

  const dayMacroTotal = useMemo(
    () =>
      sumMacros(
        currentDayRecipes
          .map(({ recipe }) => recipe)
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
      ),
    [currentDayRecipes]
  );

  function assignRecipe(recipeId: string) {
    setPlan((prev) => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [selectedSlot]: recipeId,
      },
    }));
    // Fix: brief confirmation then clear
    setAddedId(recipeId);
    setTimeout(() => setAddedId(null), 1500);
  }

  function clearSlot(day: DayKey, slot: string) {
    setPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: "",
      },
    }));
  }

  // Fix: reset slot to first slot of newly selected day
  function handleDayChange(day: DayKey) {
    setSelectedDay(day);
    const firstSlot = Object.keys(plan[day])[0] as SlotKey;
    setSelectedSlot(firstSlot);
  }

  const budgetPercent = Math.min(100, Math.round((groceryTotal / WEEKLY_BUDGET) * 100));
  const budgetRemaining = Number((WEEKLY_BUDGET - groceryTotal).toFixed(2));

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.hero}>
          <div>
            <div style={styles.kicker}>Glow Kitchen</div>
            <h1 style={styles.title}>Recipe + Budget App</h1>
            <p style={styles.subtitle}>
              A GitHub-ready React app with exact-measurement recipes, a weekly $50 budget tracker,
              meal planning, container-based portions, and a scalable recipe library.
            </p>
          </div>

          <div style={styles.metricGrid}>
            <MetricCard label="Recipes" value={recipes.length} />
            <MetricCard label="Budget" value={currency(groceryTotal)} />
            <MetricCard label="Avg Cal" value={averageDailyMacros.calories} />
            <MetricCard label="Protein" value={`${averageDailyMacros.protein}g`} />
          </div>
        </header>

        <div style={styles.twoColumn}>
          <div style={styles.mainColumn}>
            <SectionCard title="Recipe Library" subtitle="Every recipe uses exact measurements and detailed steps.">
              <div style={styles.filterRow}>
                <input
                  style={styles.input}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search recipe name, source, or tag"
                />
                <select
                  style={styles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item === ALL_CATEGORIES ? "All" : item}
                    </option>
                  ))}
                </select>
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={stomachSafeOnly}
                    onChange={(e) => setStomachSafeOnly(e.target.checked)}
                  />
                  <span>Stomach-safe only</span>
                </label>
              </div>

              <div style={styles.recipeGrid}>
                {filteredRecipes.map((recipe) => {
                  const isAdded = addedId === recipe.id;
                  return (
                    <article key={recipe.id} style={styles.recipeCard}>
                      <div style={styles.recipeTop}>
                        <div>
                          <h3 style={styles.recipeTitle}>{recipe.name}</h3>
                          <div style={styles.recipeMeta}>
                            {recipe.category} • {recipe.source}
                          </div>
                        </div>
                        <div style={styles.badgeWrap}>
                          {recipe.noTomato ? <span style={styles.badge}>No tomato</span> : null}
                          {recipe.lowSpice ? <span style={styles.badge}>Low spice</span> : null}
                          {recipe.stomachSafe ? <span style={styles.badge}>Stomach-safe</span> : null}
                        </div>
                      </div>

                      <div style={styles.macroGrid}>
                        <div style={styles.macroBox}><strong>{recipe.macros.calories}</strong><span>cal</span></div>
                        <div style={styles.macroBox}><strong>{recipe.macros.protein}g</strong><span>protein</span></div>
                        <div style={styles.macroBox}><strong>{recipe.macros.carbs}g</strong><span>carbs</span></div>
                        <div style={styles.macroBox}><strong>{recipe.macros.fat}g</strong><span>fat</span></div>
                      </div>

                      <div>
                        <div style={styles.blockTitle}>Ingredients</div>
                        <ul style={styles.list}>
                          {recipe.ingredients.map((ing) => (
                            <li key={`${recipe.id}-${ing.item}`}>
                              {ing.amount} {ing.item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div style={styles.blockTitle}>Instructions</div>
                        <ol style={styles.list}>
                          {recipe.instructions.map((step, i) => (
                            <li key={`${recipe.id}-${i}`}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      <div style={styles.recipeFooter}>
                        <div>
                          Serves {recipe.servings} • {recipe.servingSize}
                          {recipe.container ? ` • ${recipe.container}` : ""}
                        </div>
                        {/* Fix: show brief "Added!" confirmation after assigning */}
                        <button
                          style={{
                            ...styles.primaryButton,
                            background: isAdded ? "#16a34a" : "#0f172a",
                            transition: "background 0.2s",
                          }}
                          onClick={() => assignRecipe(recipe.id)}
                        >
                          {isAdded ? "Added!" : `Add to ${selectedDay} ${capitalize(selectedSlot)}`}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Meal Planner" subtitle="Choose a day and slot, then add recipes from the library.">
              <div style={styles.filterRow}>
                {/* Fix: use handleDayChange to also reset the slot */}
                <select
                  style={styles.select}
                  value={selectedDay}
                  onChange={(e) => handleDayChange(e.target.value as DayKey)}
                >
                  {Object.keys(plan).map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>

                <select
                  style={styles.select}
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value as SlotKey)}
                >
                  {Object.keys(plan[selectedDay]).map((slot) => (
                    <option key={slot} value={slot}>{capitalize(slot)}</option>
                  ))}
                </select>

                <div style={styles.checkboxRow}>
                  <span>Day total: {dayMacroTotal.calories} cal • {dayMacroTotal.protein}g protein</span>
                </div>
              </div>

              <div style={styles.slotGrid}>
                {currentDayRecipes.map(({ slot, recipe }) => (
                  <div key={slot} style={styles.slotCard}>
                    <div>
                      <div style={styles.slotLabel}>{capitalize(slot)}</div>
                      <div style={styles.slotRecipeName}>{recipe ? recipe.name : "No recipe assigned"}</div>
                      {recipe ? (
                        <div style={styles.slotRecipeMeta}>
                          {recipe.macros.calories} cal • {recipe.macros.protein}g protein
                        </div>
                      ) : null}
                    </div>
                    <button style={styles.secondaryButton} onClick={() => clearSlot(selectedDay, slot)}>
                      Clear
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <aside style={styles.sideColumn}>
            <SectionCard title="Weekly Budget" subtitle="Auto-calculated from your planned recipes.">
              <div style={styles.budgetValue}>{currency(groceryTotal)}</div>
              <div style={styles.budgetSub}>
                {budgetRemaining >= 0
                  ? `${currency(budgetRemaining)} left`
                  : `${currency(Math.abs(budgetRemaining))} over`}
              </div>
              {/* Fix: use semantic <progress> element for accessibility */}
              <progress
                value={groceryTotal}
                max={WEEKLY_BUDGET}
                aria-label="Weekly budget used"
                style={{
                  width: "100%",
                  height: 14,
                  borderRadius: 999,
                  marginBottom: 18,
                  accentColor: groceryTotal <= WEEKLY_BUDGET ? "#16a34a" : "#dc2626",
                }}
              />

              <div style={styles.groceryList}>
                {groceries.map((item) => (
                  <div key={`${item.name}-${item.category}`} style={styles.groceryRow}>
                    <div>
                      <div style={styles.groceryName}>{item.name}</div>
                      <div style={styles.groceryMeta}>
                        {item.amount} • {item.category} • used {item.uses}x
                      </div>
                    </div>
                    <div style={styles.groceryCost}>{currency(item.estimatedCost)}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Portion Control" subtitle="Built from your custom rules so you do not have to guess.">
              <ul style={styles.list}>
                <li>Greek yogurt: 3/4 cup max per meal</li>
                <li>Rice: 1 cup cooked max per meal</li>
                <li>Chicken: 4 oz standard, 6 oz only on high-protein days</li>
                <li>Almond butter: 1 tbsp per serving</li>
                <li>Coffee add-ins: 2 tbsp milk + 1 tsp sweetener max</li>
                <li>No tomatoes in your personal plan</li>
                <li>Keep spice mild or omitted</li>
              </ul>
            </SectionCard>

            <SectionCard title="Farmer's Fridge Containers" subtitle="Use the same packing logic each week.">
              <div style={styles.containerRule}>
                <strong>Breakfast Jar (24 oz)</strong>
                <p>Bottom: fruit + honey. Top: yogurt. Crunchy items separate.</p>
              </div>
              <div style={styles.containerRule}>
                <strong>Lunch Bowl (24 oz)</strong>
                <p>Bottom: rice or grain. Middle: vegetables. Top: protein. Sauce separate.</p>
              </div>
              <div style={styles.containerRule}>
                <strong>Snack Box (12 oz)</strong>
                <p>Pack one exact portion only. Example: 2 eggs + 1 apple.</p>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #fff1f2 100%)",
    color: "#0f172a",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  container: { maxWidth: 1400, margin: "0 auto", padding: 24 },
  hero: {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid #ffe4e6",
    borderRadius: 28,
    padding: 24,
    boxShadow: "0 6px 20px rgba(15, 23, 42, 0.05)",
    display: "grid",
    gap: 20,
    marginBottom: 24,
  },
  kicker: {
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    color: "#fb7185",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  title: { fontSize: "clamp(2rem, 4vw, 3.25rem)", lineHeight: 1.05, margin: 0 },
  subtitle: { color: "#475569", maxWidth: 820, marginTop: 12, marginBottom: 0, lineHeight: 1.6 },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 },
  twoColumn: { display: "grid", gridTemplateColumns: "1.4fr 0.85fr", gap: 24, alignItems: "start" },
  mainColumn: { display: "grid", gap: 24 },
  sideColumn: { display: "grid", gap: 24 },
  filterRow: { display: "grid", gridTemplateColumns: "1fr 180px 210px", gap: 12, marginBottom: 16 },
  input: { width: "100%", borderRadius: 14, border: "1px solid #cbd5e1", padding: "12px 14px", background: "#fff" },
  select: { width: "100%", borderRadius: 14, border: "1px solid #cbd5e1", padding: "12px 14px", background: "#fff" },
  checkboxRow: {
    display: "flex", alignItems: "center", gap: 10,
    border: "1px solid #cbd5e1", borderRadius: 14, padding: "12px 14px",
    color: "#334155", background: "#fff",
  },
  recipeGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 },
  recipeCard: { border: "1px solid #e2e8f0", borderRadius: 22, padding: 18, display: "grid", gap: 16 },
  recipeTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  recipeTitle: { margin: 0, fontSize: 18 },
  recipeMeta: { color: "#64748b", fontSize: 14, marginTop: 4 },
  badgeWrap: { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" },
  badge: {
    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 999,
    padding: "4px 8px", fontSize: 12, color: "#334155",
  },
  macroGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 },
  macroBox: { background: "#f8fafc", borderRadius: 14, padding: "10px 8px", textAlign: "center", display: "grid", gap: 4 },
  blockTitle: { fontWeight: 700, marginBottom: 8 },
  list: { margin: 0, paddingLeft: 18, display: "grid", gap: 6, color: "#334155", lineHeight: 1.55 },
  recipeFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, color: "#64748b", fontSize: 14 },
  primaryButton: { border: "none", borderRadius: 14, padding: "10px 14px", color: "#fff", cursor: "pointer", fontWeight: 600 },
  secondaryButton: { border: "1px solid #cbd5e1", borderRadius: 12, padding: "8px 12px", background: "#fff", cursor: "pointer" },
  slotGrid: { display: "grid", gap: 12 },
  slotCard: {
    border: "1px solid #e2e8f0", borderRadius: 18, padding: 16,
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
  },
  slotLabel: { textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "#64748b" },
  slotRecipeName: { fontWeight: 700, marginTop: 4 },
  slotRecipeMeta: { color: "#64748b", marginTop: 4, fontSize: 14 },
  budgetValue: { fontSize: 36, fontWeight: 800 },
  budgetSub: { color: "#64748b", marginTop: 6, marginBottom: 12 },
  groceryList: { display: "grid", gap: 10, maxHeight: 420, overflow: "auto", paddingRight: 4 },
  groceryRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    border: "1px solid #e2e8f0", borderRadius: 14, padding: 12,
  },
  groceryName: { fontWeight: 700 },
  groceryMeta: { color: "#64748b", fontSize: 13, marginTop: 4 },
  groceryCost: { fontWeight: 700, whiteSpace: "nowrap" },
  containerRule: { border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, marginBottom: 12, background: "#f8fafc" },
};
