import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVITY_LABELS, calculateMetrics, type ActivityLevel } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your Lumen profile" },
      { name: "description", content: "Tell Lumen about your body, activity and food preferences to get a personalized plan." },
      { property: "og:title", content: "Set up your Lumen profile" },
      { property: "og:description", content: "Nine quick questions to build your personalized nutrition plan." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Onboarding />
    </RequireAuth>
  ),
});

const DIETS = ["Balanced", "High protein", "Vegetarian", "Vegan", "Pescatarian", "Mediterranean", "Low carb", "Halal", "Kosher"];
const ALLERGENS = ["Gluten", "Dairy", "Eggs", "Peanuts", "Tree nuts", "Soy", "Shellfish", "Fish", "Sesame"];

function Onboarding() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    age: 30,
    gender: "female",
    height_cm: 170,
    weight_kg: 80,
    target_weight_kg: 70,
    activity_level: "light" as ActivityLevel,
    dietary_preferences: ["Balanced"] as string[],
    allergies: [] as string[],
    daily_routine: "",
    goal_pace: 0.5,
  });

  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      ...f,
      age: profile.age ?? f.age,
      gender: profile.gender ?? f.gender,
      height_cm: Number(profile.height_cm ?? f.height_cm),
      weight_kg: Number(profile.weight_kg ?? f.weight_kg),
      target_weight_kg: Number(profile.target_weight_kg ?? f.target_weight_kg),
      activity_level: (profile.activity_level as ActivityLevel) ?? f.activity_level,
      dietary_preferences: profile.dietary_preferences?.length ? profile.dietary_preferences : f.dietary_preferences,
      allergies: profile.allergies ?? f.allergies,
      daily_routine: profile.daily_routine ?? f.daily_routine,
      goal_pace: Number(profile.goal_pace ?? f.goal_pace),
    }));
  }, [profile]);

  const metrics = calculateMetrics({
    age: form.age,
    gender: form.gender,
    heightCm: form.height_cm,
    weightKg: form.weight_kg,
    targetWeightKg: form.target_weight_kg,
    activityLevel: form.activity_level,
    goalPace: form.goal_pace,
  });

  function toggle(key: "dietary_preferences" | "allergies", value: string) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  }

  async function finish() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...form, onboarded: true })
        .eq("id", user!.id);
      if (error) throw error;
      await supabase
        .from("weight_entries")
        .upsert({ user_id: user!.id, weight_kg: form.weight_kg }, { onConflict: "user_id,logged_on" });
      await qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      title: "About you",
      body: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age">
              <Input
                type="number"
                min={14}
                max={100}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
              />
            </Field>
            <Field label="Gender">
              <div className="flex gap-2">
                {["female", "male"].map((g) => (
                  <Chip key={g} active={form.gender === g} onClick={() => setForm({ ...form, gender: g })}>
                    {g[0]!.toUpperCase() + g.slice(1)}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Height (cm)">
            <Input
              type="number"
              value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: Number(e.target.value) })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Current weight (kg)">
              <Input
                type="number"
                step="0.1"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: Number(e.target.value) })}
              />
            </Field>
            <Field label="Target weight (kg)">
              <Input
                type="number"
                step="0.1"
                value={form.target_weight_kg}
                onChange={(e) => setForm({ ...form, target_weight_kg: Number(e.target.value) })}
              />
            </Field>
          </div>
        </div>
      ),
    },
    {
      title: "How active are you?",
      body: (
        <div className="space-y-2">
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setForm({ ...form, activity_level: level })}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-colors",
                form.activity_level === level
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-secondary",
              )}
            >
              <p className="font-semibold capitalize">{level}</p>
              <p className="text-sm text-muted-foreground">{ACTIVITY_LABELS[level]}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Food preferences",
      body: (
        <div className="space-y-6">
          <Field label="Dietary style">
            <div className="flex flex-wrap gap-2">
              {DIETS.map((d) => (
                <Chip key={d} active={form.dietary_preferences.includes(d)} onClick={() => toggle("dietary_preferences", d)}>
                  {d}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Allergies & foods to avoid">
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map((a) => (
                <Chip key={a} active={form.allergies.includes(a)} onClick={() => toggle("allergies", a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </Field>
        </div>
      ),
    },
    {
      title: "Your daily routine",
      body: (
        <div className="space-y-6">
          <Field label="Describe a typical day">
            <Textarea
              rows={5}
              placeholder="Up at 6:30, gym before work, desk job until 18:00, cook dinner at 19:30, no time to cook lunch on weekdays…"
              value={form.daily_routine}
              onChange={(e) => setForm({ ...form, daily_routine: e.target.value })}
            />
          </Field>
          <Field label={`Goal pace — ${form.goal_pace} kg per week`}>
            <Slider
              min={0.25}
              max={1}
              step={0.25}
              value={[form.goal_pace]}
              onValueChange={([v]) => setForm({ ...form, goal_pace: v ?? 0.5 })}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              0.25–0.75 kg per week is the sustainable range for most people.
            </p>
          </Field>
        </div>
      ),
    },
    {
      title: "Your numbers",
      body: (
        <div className="grid grid-cols-2 gap-3">
          {[
            ["BMI", `${metrics.bmi}`, metrics.bmiCategory],
            ["Body fat (est.)", `${metrics.bodyFatPct}%`, "Deurenberg estimate"],
            ["BMR", `${metrics.bmr}`, "kcal at rest"],
            ["TDEE", `${metrics.tdee}`, "kcal burned daily"],
            ["Daily target", `${metrics.targetCalories}`, `${metrics.deficit} kcal deficit`],
            ["Time to goal", `${metrics.weeksToGoal} wks`, `to ${form.target_weight_kg} kg`],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-2xl border border-border bg-surface/60 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step]!;

  return (
    <div className="min-h-screen bg-background bg-hero px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>

        <div className="glass-card rise-in p-6" key={step}>
          <h1 className="font-display text-2xl font-semibold">{current.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}
          </p>
          <div className="mt-6">{current.body}</div>

          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button className="ml-auto" onClick={() => setStep(step + 1)}>
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button className="ml-auto" onClick={finish} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Save & open dashboard"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
