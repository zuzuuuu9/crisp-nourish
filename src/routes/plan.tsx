import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { MacroBar } from "@/components/MetricCards";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { useMealPlan } from "@/hooks/useMealPlan";
import { dayTotals, type Meal } from "@/lib/meal-plan";
import { generateMealPlan, regenerateMeal } from "@/lib/meal-plan.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Your 7-day meal plan — Lumen" },
      { name: "description", content: "Breakfast, lunch, dinner and snacks for the week, matched to your calorie and macro targets." },
      { property: "og:title", content: "Your 7-day AI meal plan" },
      { property: "og:description", content: "Seven days of meals tuned to your targets, preferences and allergies." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <PlanPage />
      </AppShell>
    </RequireAuth>
  ),
});

function PlanPage() {
  const { data: plan, isLoading } = useMealPlan();
  const [dayIndex, setDayIndex] = useState(0);
  const qc = useQueryClient();
  const generate = useServerFn(generateMealPlan);
  const regenerate = useServerFn(regenerateMeal);

  const generateMutation = useMutation({
    mutationFn: () => generate(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meal-plan"] });
      toast.success("Fresh plan generated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not generate the plan"),
  });

  const mealMutation = useMutation({
    mutationFn: (vars: { slot: string }) =>
      regenerate({ data: { planId: plan!.id, dayIndex, slot: vars.slot } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meal-plan"] });
      toast.success("Meal swapped");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not swap that meal"),
  });

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="glass-card rise-in mx-auto max-w-md p-8 text-center">
        <Sparkles className="mx-auto size-6 text-primary" />
        <h1 className="mt-4 font-display text-xl font-semibold">No plan yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate a personalized seven-day plan from your profile and targets.
        </p>
        <Button className="mt-5" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate my plan
        </Button>
      </div>
    );
  }

  const day = plan.days[dayIndex]!;
  const totals = dayTotals(day);

  return (
    <div className="space-y-6">
      <div className="rise-in flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your week</h1>
          <p className="text-sm text-muted-foreground">
            Target {plan.targets.calories} kcal · {plan.targets.protein}p / {plan.targets.carbs}c / {plan.targets.fat}f
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/shopping">Shopping list</Link>
          </Button>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            New week
          </Button>
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {plan.days.map((d, i) => (
          <button
            key={d.day}
            onClick={() => setDayIndex(i)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              i === dayIndex ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary",
            )}
          >
            {d.day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="glass-card rise-in grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{day.day} total</p>
          <p className="font-display text-3xl font-semibold tabular-nums">{Math.round(totals.calories)} kcal</p>
        </div>
        <MacroBar label="Protein" value={totals.protein} target={plan.targets.protein} color="protein" />
        <MacroBar label="Carbs" value={totals.carbs} target={plan.targets.carbs} color="carbs" />
        <MacroBar label="Fat" value={totals.fat} target={plan.targets.fat} color="fat" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {day.meals.map((meal, i) => (
          <MealCard
            key={`${day.day}-${meal.slot}-${i}`}
            meal={meal}
            busy={mealMutation.isPending && mealMutation.variables?.slot === meal.slot}
            onRegenerate={() => mealMutation.mutate({ slot: meal.slot })}
            delay={i * 70}
          />
        ))}
      </div>
    </div>
  );
}

function MealCard({
  meal,
  busy,
  onRegenerate,
  delay,
}: {
  meal: Meal;
  busy: boolean;
  onRegenerate: () => void;
  delay: number;
}) {
  return (
    <article
      className="glass-card rise-in flex flex-col p-5 transition-transform hover:-translate-y-0.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{meal.slot}</p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">{meal.name}</h3>
        </div>
        <Button variant="ghost" size="icon" aria-label="Regenerate meal" onClick={onRegenerate} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{meal.description}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Pill>{Math.round(meal.calories)} kcal</Pill>
        <Pill className="text-protein">{Math.round(meal.protein)}g protein</Pill>
        <Pill className="text-carbs">{Math.round(meal.carbs)}g carbs</Pill>
        <Pill className="text-fat">{Math.round(meal.fat)}g fat</Pill>
        <Pill className="text-fiber">{Math.round(meal.fiber)}g fiber</Pill>
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" /> {meal.prepMinutes} min prep
        </p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {(meal.ingredients ?? []).map((ing) => (
            <li key={ing.item} className="flex justify-between gap-4">
              <span>{ing.item}</span>
              <span className="tabular-nums">{ing.quantity}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground", className)}>
      {children}
    </span>
  );
}
