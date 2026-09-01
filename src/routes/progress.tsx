import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, TrendingDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/MetricCards";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useWeightEntries } from "@/hooks/useMealPlan";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — weight tracking with Lumen" },
      { name: "description", content: "Log your weigh-ins and watch your trend, weekly pace and goal progress." },
      { property: "og:title", content: "Track your weight progress" },
      { property: "og:description", content: "Weekly goals, trend charts and a full weigh-in history." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <Progress />
      </AppShell>
    </RequireAuth>
  ),
});

function Progress() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: entries = [] } = useWeightEntries();
  const qc = useQueryClient();
  const [weight, setWeight] = useState("");

  const logWeight = useMutation({
    mutationFn: async (kg: number) => {
      const { error } = await supabase
        .from("weight_entries")
        .insert({ user_id: user!.id, weight_kg: kg });
      if (error) throw error;
      const { error: pErr } = await supabase.from("profiles").update({ weight_kg: kg }).eq("id", user!.id);
      if (pErr) throw pErr;
    },
    onSuccess: async () => {
      setWeight("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["weights"] }),
        qc.invalidateQueries({ queryKey: ["profile"] }),
      ]);
      toast.success("Weigh-in logged");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not log your weight"),
  });

  const start = entries[0]?.weight_kg ?? Number(profile?.weight_kg ?? 0);
  const current = entries[entries.length - 1]?.weight_kg ?? Number(profile?.weight_kg ?? 0);
  const target = Number(profile?.target_weight_kg ?? current);
  const lost = start - current;
  const remaining = Math.max(0, current - target);
  const pace = Number(profile?.goal_pace ?? 0.5);

  const chartData = entries.map((e) => ({ date: e.logged_on.slice(5), weight: e.weight_kg }));

  return (
    <div className="space-y-6">
      <div className="rise-in">
        <p className="text-sm text-muted-foreground">Progress</p>
        <h1 className="font-display text-3xl font-semibold">Weight tracking</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Current" value={current ? current.toFixed(1) : "—"} unit="kg" hint={`Started at ${start ? start.toFixed(1) : "—"} kg`} icon={TrendingDown} />
        <StatCard label="Lost so far" value={lost > 0 ? lost.toFixed(1) : "0.0"} unit="kg" hint="Since your first weigh-in" icon={TrendingDown} delay={60} />
        <StatCard label="To goal" value={remaining.toFixed(1)} unit="kg" hint={`~${Math.ceil(remaining / Math.max(pace, 0.1))} weeks at ${pace} kg/week`} icon={TrendingDown} delay={120} />
      </div>

      <div className="glass-card rise-in space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">Log a weigh-in</h2>
        <form
          className="flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const kg = parseFloat(weight);
            if (!kg || kg < 25 || kg > 400) {
              toast.error("Enter a weight between 25 and 400 kg");
              return;
            }
            logWeight.mutate(kg);
          }}
        >
          <Input
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="Weight in kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="max-w-40"
          />
          <Button type="submit" disabled={logWeight.isPending}>
            {logWeight.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Log weight
          </Button>
        </form>
      </div>

      <div className="glass-card rise-in p-6">
        <h2 className="font-display text-lg font-semibold">Trend</h2>
        <div className="mt-4 h-64">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
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
                <Line type="monotone" dataKey="weight" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Log at least two weigh-ins to see your trend.
            </div>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="glass-card rise-in p-6">
          <h2 className="font-display text-lg font-semibold">History</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">{e.logged_on}</span>
                <span className="font-medium tabular-nums">{e.weight_kg.toFixed(1)} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
