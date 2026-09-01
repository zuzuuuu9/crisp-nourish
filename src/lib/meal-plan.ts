export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export interface Meal {
  slot: MealSlot;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  prepMinutes: number;
  ingredients: { item: string; quantity: string; category: string }[];
}

export interface PlanDay {
  day: string;
  meals: Meal[];
}

export interface PlanTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface ShoppingGroup {
  category: string;
  items: { item: string; quantity: string }[];
}

export interface MealPlan {
  id: string;
  targets: PlanTargets;
  days: PlanDay[];
  shopping_list: ShoppingGroup[];
  created_at: string;
}

export function dayTotals(day: PlanDay) {
  return day.meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
      fiber: acc.fiber + (m.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

export function buildShoppingList(days: PlanDay[]): ShoppingGroup[] {
  const groups = new Map<string, Map<string, string[]>>();
  for (const day of days) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients ?? []) {
        const category = ing.category?.trim() || "Other";
        const key = ing.item.trim().toLowerCase();
        if (!groups.has(category)) groups.set(category, new Map());
        const bucket = groups.get(category)!;
        bucket.set(key, [...(bucket.get(key) ?? []), ing.quantity]);
      }
    }
  }
  return [...groups.entries()]
    .map(([category, items]) => ({
      category,
      items: [...items.entries()]
        .map(([item, quantities]) => ({
          item: item.replace(/^\w/, (c) => c.toUpperCase()),
          quantity: summarize(quantities),
        }))
        .sort((a, b) => a.item.localeCompare(b.item)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

function summarize(quantities: string[]): string {
  const numeric = quantities.map((q) => /^([\d.]+)\s*(.*)$/.exec(q.trim()));
  const unit = numeric[0]?.[2];
  if (numeric.every((m) => m && m[2] === unit)) {
    const total = numeric.reduce((sum, m) => sum + parseFloat(m![1]!), 0);
    return `${Math.round(total * 10) / 10}${unit ? ` ${unit}` : ""}`;
  }
  return `${quantities.length} × (${quantities.join(", ")})`;
}
