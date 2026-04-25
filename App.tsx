import { useMemo, useState } from "react";
import { aggregateGroceries, currency, defaultPlan, recipes, sumMacros, type Recipe } from "./lib";

type DayName = keyof typeof defaultPlan;
type MealSlot = keyof (typeof defaultPlan)[DayName];

const dayNames = Object.keys(defaultPlan) as DayName[];
const mealSlots: MealSlot[] = ["breakfast", "lunch", "snack", "dinner", "extra"];

const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

function getRecipe(id: string): Recipe | undefined {
  return recipeMap.get(id);
}

function App() {
  const [selectedDay, setSelectedDay] = useState<DayName>("Monday");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipes[0]?.id ?? "");

  const weekRecipes = useMemo(() => {
    return dayNames.flatMap((day) =>
      mealSlots
        .map((slot) => getRecipe(defaultPlan[day][slot]))
        .filter((recipe): recipe is Recipe => Boolean(recipe))
    );
  }, []);

  const totals = useMemo(() => sumMacros(weekRecipes), [weekRecipes]);
  const groceryList = useMemo(() => aggregateGroceries(weekRecipes), [weekRecipes]);
  const weeklyBudget = useMemo(
    () => Number(groceryList.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2)),
    [groceryList]
  );

  const averageCalories = Math.round(totals.calories / 7);
  const averageProtein = Math.round(totals.protein / 7);
  const selectedRecipe = getRecipe(selectedRecipeId) ?? recipes[0];

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.heroCard}>
          <div>
            <p style={styles.eyebrow}>Glow Kitchen</p>
            <h1 style={styles.title}>Recipe + Budget App</h1>
            <p style={styles.subtitle}>
              Recovered from your current files. Your recipe data is still here, and this rebuild turns it back
              into a usable app.
            </p>
          </div>
          <div style={styles.statsGrid}>
            <StatCard label="Recipes" value={String(recipes.length)} />
            <StatCard label="Budget" value={currency(weeklyBudget)} />
            <StatCard label="Avg Cal" value={String(averageCalories)} />
            <StatCard label="Protein" value={`${averageProtein}g`} />
          </div>
        </header>

        <main style={styles.mainGrid}>
          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.sectionLabel}>Plan overview</p>
                <h2 style={styles.sectionTitle}>Weekly meal plan</h2>
              </div>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value as DayName)} style={styles.select}>
                {dayNames.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.mealList}>
              {mealSlots.map((slot) => {
                const recipe = getRecipe(defaultPlan[selectedDay][slot]);
                if (!recipe) return null;

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedRecipeId(recipe.id)}
                    style={{
                      ...styles.mealButton,
                      ...(selectedRecipeId === recipe.id ? styles.mealButtonActive : {}),
                    }}
                  >
                    <div>
                      <p style={styles.mealSlot}>{slot}</p>
                      <h3 style={styles.mealName}>{recipe.name}</h3>
                    </div>
                    <div style={styles.mealMeta}>
                      <span>{recipe.macros.calories} cal</span>
                      <span>{recipe.macros.protein}g protein</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.sectionLabel}>Recipe library</p>
                <h2 style={styles.sectionTitle}>{selectedRecipe.name}</h2>
              </div>
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                style={styles.select}
              >
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.tagRow}>
              <Tag>{selectedRecipe.category}</Tag>
              <Tag>{selectedRecipe.source}</Tag>
              {selectedRecipe.tags.slice(0, 3).map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>

            <div style={styles.recipeGrid}>
              <div>
                <h3 style={styles.subheading}>Ingredients</h3>
                <ul style={styles.list}>
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <li key={`${ingredient.item}-${ingredient.amount}`}>
                      <strong>{ingredient.item}:</strong> {ingredient.amount}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 style={styles.subheading}>Instructions</h3>
                <ol style={styles.list}>
                  {selectedRecipe.instructions.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.sectionLabel}>Budget</p>
                <h2 style={styles.sectionTitle}>Weekly grocery rollup</h2>
              </div>
              <div style={styles.budgetPill}>Target: $50</div>
            </div>

            <div style={styles.grocerySummaryRow}>
              <div style={styles.summaryBox}>
                <span style={styles.summaryLabel}>Current total</span>
                <strong style={styles.summaryValue}>{currency(weeklyBudget)}</strong>
              </div>
              <div style={styles.summaryBox}>
                <span style={styles.summaryLabel}>Difference</span>
                <strong style={styles.summaryValue}>{currency(Number((50 - weeklyBudget).toFixed(2)))}</strong>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Item</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Uses</th>
                    <th style={styles.th}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {groceryList.map((item) => (
                    <tr key={`${item.name}-${item.category}`}>
                      <td style={styles.td}>{item.name}</td>
                      <td style={styles.td}>{item.category}</td>
                      <td style={styles.td}>{item.uses}</td>
                      <td style={styles.td}>{currency(item.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

function Tag({ children }: { children: string }) {
  return <span style={styles.tag}>{children}</span>;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #fffdf6 0%, #f6efe7 100%)",
    color: "#2c241d",
    fontFamily: 'Inter, Arial, sans-serif',
    padding: "24px",
  },
  shell: {
    maxWidth: "1240px",
    margin: "0 auto",
    display: "grid",
    gap: "20px",
  },
  heroCard: {
    background: "rgba(255,255,255,0.88)",
    border: "1px solid #eadfce",
    borderRadius: "28px",
    padding: "24px",
    boxShadow: "0 20px 50px rgba(89, 59, 31, 0.08)",
    display: "grid",
    gap: "20px",
  },
  eyebrow: {
    margin: 0,
    fontSize: "0.78rem",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "#8d6f54",
    fontWeight: 700,
  },
  title: { margin: "8px 0 10px", fontSize: "2.35rem", lineHeight: 1.05 },
  subtitle: { margin: 0, maxWidth: "780px", color: "#5f5041", lineHeight: 1.6 },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
  },
  statCard: {
    background: "#fffaf3",
    border: "1px solid #ecdcc7",
    borderRadius: "20px",
    padding: "16px",
    minHeight: "92px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  statLabel: { fontSize: "0.92rem", color: "#7a6650" },
  statValue: { fontSize: "1.8rem", lineHeight: 1.1 },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    alignItems: "start",
  },
  card: {
    background: "rgba(255,255,255,0.9)",
    border: "1px solid #eadfce",
    borderRadius: "24px",
    padding: "22px",
    boxShadow: "0 16px 32px rgba(89, 59, 31, 0.06)",
    display: "grid",
    gap: "16px",
  },
  sectionHeader: {
    display: "flex",
    gap: "16px",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  sectionLabel: { margin: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "#8d6f54", fontWeight: 700 },
  sectionTitle: { margin: "6px 0 0", fontSize: "1.45rem" },
  select: {
    borderRadius: "14px",
    border: "1px solid #d8c6ae",
    padding: "12px 14px",
    background: "#fff",
    minWidth: "180px",
  },
  mealList: { display: "grid", gap: "10px" },
  mealButton: {
    border: "1px solid #eadfce",
    background: "#fffaf5",
    borderRadius: "18px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    textAlign: "left",
    cursor: "pointer",
  },
  mealButtonActive: {
    border: "1px solid #b98f5d",
    background: "#fff4e7",
    transform: "translateY(-1px)",
  },
  mealSlot: { margin: 0, textTransform: "uppercase", fontSize: "0.74rem", letterSpacing: "0.12em", color: "#8d6f54", fontWeight: 700 },
  mealName: { margin: "6px 0 0", fontSize: "1rem" },
  mealMeta: { display: "grid", gap: "4px", fontSize: "0.9rem", color: "#6a5a49", justifyItems: "end" },
  tagRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
  tag: {
    borderRadius: "999px",
    background: "#f5ede3",
    border: "1px solid #eadfce",
    padding: "7px 12px",
    fontSize: "0.86rem",
  },
  recipeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" },
  subheading: { margin: 0, fontSize: "1rem" },
  list: { margin: "10px 0 0", paddingLeft: "20px", lineHeight: 1.7 },
  budgetPill: { borderRadius: "999px", padding: "10px 14px", background: "#fff4e7", border: "1px solid #e4cfb2", fontWeight: 700 },
  grocerySummaryRow: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "12px" },
  summaryBox: { background: "#fffaf5", border: "1px solid #eadfce", borderRadius: "18px", padding: "14px", display: "grid", gap: "8px" },
  summaryLabel: { fontSize: "0.86rem", color: "#7a6650" },
  summaryValue: { fontSize: "1.25rem" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "420px" },
  th: { textAlign: "left", padding: "12px 10px", borderBottom: "1px solid #eadfce", color: "#7a6650", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.08em" },
  td: { padding: "12px 10px", borderBottom: "1px solid #f1e8dc" },
};

export default App;
