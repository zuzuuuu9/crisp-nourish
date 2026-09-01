import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Flame, Gauge, Loader2, Percent, Sparkles, Target, TrendingDown } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/AppShell";
import { MacroBar, StatCard } from "@/components/MetricCards";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { useMealPlan, useWeightEntries } from "@/hooks/useMealPlan";
import { useProfile } from "@/hooks/useProfile";
import { dayTotals } from "@/lib/meal-plan";
import { generateMealPlan } from "@/lib/meal-plan.functions";
import { calculateMetrics } from "@/lib/nutrition";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — your Lumen targets and progress" },
      { name: "description", content: "Your calorie target, macros, weight trend and today's meals in one view." },
      { property: "og:title", content: "Lumen dashboard" },
      { property: "og:description", content: "Calorie targets, macros and weight trend at a glance." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <Dashboard />
      </AppShell>
    </RequireAuth>
  ),
});

function Dashboard() {
  const { data: profile, isLoading } = useProfile();
  const { data: plan } = useMealPlan();
  const { data: weights = [] } = useWeightEntries();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const generate = useServerFn(generateMealPlan);

  useEffect(() => {
    if (!isLoading && profile && !profile.onboarded) navigate({ to: "/onboarding" });
  }, [isLoading, profile, navigate]);

  const mutation = useMutation({
    mutationFn: () => generate(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meal-plan"] });
      toast.success("Your new 7-day plan is ready");
      navigate({ to: "/plan" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not generate the plan"),
  });

  if (isLoading || !profile?.onboarded) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const metrics = calculateMetrics({
    age: profile.age ?? 30,
    gender: profile.gender ?? "female",
    heightCm: Number(profile.height_cm ?? 170),
    weightKg: Number(profile.weight_kg ?? 80),
    targetWeightKg: Number(profile.target_weight_kg ?? 70),
    activityLevel: profile.activity_level ?? "light",
    goalPace: Number(profile.goal_pace ?? 0.5),
  });

  const today = plan?.days?.[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const totals = today ? dayTotals(today) : null;
  const chartData = weights.map((w) => ({ date: w.logged_on.slice(5), weight: w.weight_kg }));
  const lost = weights.length > 1 ? weights[0]!.weight_kg - weights[weights.length - 1]!.weight_kg : 0;

  return (
    <div className="space-y-6">
      <div className="rise-in flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="font-display text-3xl font-semibold">
            {profile.display_name ?? "Let's get to work"}
          </h1>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {plan ? "Regenerate week" : "Generate my plan"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Daily target" value={metrics.targetCalories.toLocaleString()} unit="kcal" hint={`${metrics.deficit} kcal deficit`} icon={Flame} />
        <StatCard label="TDEE" value={metrics.tdee.toLocaleString()} unit="kcal" hint={`BMR ${metrics.bmr}`} icon={Activity} delay={60} />
        <StatCard label="BMI" value={metrics.bmi} hint={metrics.bmiCategory} icon={Gauge} delay={120} />
        <StatCard label="Body fat (est.)" value={`${metrics.bodyFatPct}%`} hint="Screening estimate" icon={Percent} delay={180} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card rise-in p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Weight trend</h2>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingDown className="size-4 text-primary" />
              {lost > 0 ? `${lost.toFixed(1)} kg lost` : "Log to start the trend"}
            </span>
          </div>
          <div className="mt-4 h-56">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Area type="monotone" dataKey="weight" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#weightFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                <Link to="/progress" className="underline underline-offset-4">
                  Log a second weigh-in to see your trend
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rise-in space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Today's macros</h2>
          {totals ? (
            <>
              <p className="font-display text-3xl font-semibold tabular-nums">
                {Math.round(totals.calories)}
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  / {plan!.targets.calories} kcal
                </span>
              </p>
              <MacroBar label="Protein" value={totals.protein} target={plan!.targets.protein} color="protein" />
              <MacroBar label="Carbs" value={totals.carbs} target={plan!.targets.carbs} color="carbs" />
              <MacroBar label="Fat" value={totals.fat} target={plan!.targets.fat} color="fat" />
              <MacroBar label="Fiber" value={totals.fiber} target={plan!.targets.fiber} color="fiber" />
              <Button asChild variant="outline" className="w-full">
                <Link to="/plan">See today's meals</Link>
              </Button>
            </>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>No meal plan yet. Generate one and your daily macros show up here.</p>
              <MacroBar label="Protein" value={0} target={metrics.protein} color="protein" />
              <MacroBar label="Carbs" value={0} target={metrics.carbs} color="carbs" />
              <MacroBar label="Fat" value={0} target={metrics.fat} color="fat" />
              <MacroBar label="Fiber" value={0} target={metrics.fiber} color="fiber" />
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rise-in flex flex-wrap items-center gap-4 p-6">
        <Target className="size-5 text-primary" />
        <p className="text-sm">
          <span className="font-semibold">{Math.max(0, Number(profile.weight_kg) - Number(profile.target_weight_kg)).toFixed(1)} kg</span>{" "}
          to your goal — about {metrics.weeksToGoal} weeks at {profile.goal_pace} kg/week.
        </p>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link to="/onboarding">Adjust my profile</Link>
        </Button>
      </div>
    </div>
  );
}
