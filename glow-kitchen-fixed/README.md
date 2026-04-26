# Glow Kitchen Recipe Budget App

A GitHub-ready React + TypeScript app with:
- Recipe library with exact measurements
- Step-by-step instructions
- Weekly $50 budget tracker
- Meal planner
- Farmer's Fridge-style container guidance
- Macro-aware daily planning

## Project structure

```
src/
  components/
    MetricCard.tsx      # Summary stat card
    SectionCard.tsx     # Section wrapper with title/subtitle
  data/
    recipes.ts          # All recipe definitions
    plan.ts             # Default weekly meal plan
  App.tsx               # Main application
  lib.ts                # Pure helper functions + shared types
  lib.test.ts           # Unit tests
  main.tsx              # Entry point
```

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Adding recipes

Add new entries to `src/data/recipes.ts`. Each recipe must conform to the `Recipe` type exported from `src/lib.ts`. No other files need to change.

## Slot types

Meal slots are typed as `"breakfast" | "lunch" | "snack" | "dinner" | "extra"` via the `SlotKey` union in `lib.ts`. If you add a new slot, update `SlotKey` first — TypeScript will surface every place that needs updating.
