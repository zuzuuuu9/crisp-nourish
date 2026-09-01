import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calculateMetrics } from "@/lib/nutrition";
import { buildShoppingList, type Meal, type PlanDay } from "@/lib/meal-plan";

const MODEL = "google/gemini-3.7-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface ProfileRow {
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: string | null;
  dietary_preferences: string[] | null;
  allergies: string[] | null;
  daily_routine: string | null;
  goal_pace: number | null;
}

class GatewayError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function callGateway(system: string, user: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this project yet.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429)
      throw new GatewayError("AI is busy right now — please try again in a moment.", 429);
    if (res.status === 402)
      throw new GatewayError("AI credits are exhausted. Add credits to keep generating plans.", 402);
    throw new GatewayError(`AI request failed (${res.status}): ${body.slice(0, 200)}`, res.status);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response.");
  return content;
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "");
  return JSON.parse(cleaned) as T;
}

function profileBrief(p: ProfileRow) {
  return [
    `Age: ${p.age}`,
    `Gender: ${p.gender}`,
    `Height: ${p.height_cm} cm`,
    `Current weight: ${p.weight_kg} kg`,
    `Target weight: ${p.target_weight_kg} kg`,
    `Activity: ${p.activity_level}`,
    `Dietary preferences: ${(p.dietary_preferences ?? []).join(", ") || "none"}`,
    `Allergies / must avoid: ${(p.allergies ?? []).join(", ") || "none"}`,
    `Daily routine: ${p.daily_routine || "standard 9-5"}`,
  ].join("\n");
}

const MEAL_SHAPE = `Each meal object: {"slot":"breakfast|lunch|dinner|snack","name":string,"description":string (max 140 chars),"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"prepMinutes":number,"ingredients":[{"item":string,"quantity":"e.g. 150 g","category":"Produce|Protein|Dairy|Grains|Pantry|Frozen|Other"}]}`;

export const generateMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "age, gender, height_cm, weight_kg, target_weight_kg, activity_level, dietary_preferences, allergies, daily_routine, goal_pace",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!profile?.age || !profile.height_cm || !profile.weight_kg) {
      throw new Error("Complete your profile before generating a plan.");
    }

    const p = profile as ProfileRow;
    const metrics = calculateMetrics({
      age: p.age!,
      gender: p.gender ?? "female",
      heightCm: Number(p.height_cm),
      weightKg: Number(p.weight_kg),
      targetWeightKg: Number(p.target_weight_kg ?? p.weight_kg),
      activityLevel: p.activity_level ?? "light",
      goalPace: Number(p.goal_pace ?? 0.5),
    });

    const targets = {
      calories: metrics.targetCalories,
      protein: metrics.protein,
      carbs: metrics.carbs,
      fat: metrics.fat,
      fiber: metrics.fiber,
    };

    const raw = await callGateway(
      "You are a registered dietitian creating realistic, tasty, budget-aware weight-loss meal plans. Respond with JSON only. Never include an allergen the user listed.",
      `Create a 7-day meal plan (Monday to Sunday) with breakfast, lunch, dinner and one snack per day.

USER
${profileBrief(p)}

DAILY TARGETS (each day's meals must sum within 5% of these)
calories ${targets.calories} kcal, protein ${targets.protein} g, carbs ${targets.carbs} g, fat ${targets.fat} g, fiber ${targets.fiber} g

Return JSON: {"days":[{"day":"Monday","meals":[4 meal objects in slot order]}, ... 7 days]}
${MEAL_SHAPE}
Vary meals across the week, reuse ingredients sensibly to keep shopping cheap, and fit prep time to the user's routine.`,
    );

    const parsed = parseJson<{ days: PlanDay[] }>(raw);
    const days = (parsed.days ?? []).slice(0, 7).map((d, i) => ({
      day: d.day ?? DAYS[i]!,
      meals: d.meals ?? [],
    }));
    if (days.length === 0) throw new Error("AI returned an unusable plan. Please try again.");

    const shopping = buildShoppingList(days);

    await supabase.from("meal_plans").delete().eq("user_id", userId);
    const { data: inserted, error: insertError } = await supabase
      .from("meal_plans")
      .insert({
        user_id: userId,
        targets: targets as unknown as Json,
        days: days as unknown as Json,
        shopping_list: shopping as unknown as Json,
      })
      .select("id, targets, days, shopping_list, created_at")
      .single();

    if (insertError) throw new Error(insertError.message);
    return inserted;
  });

export const regenerateMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { planId: string; dayIndex: number; slot: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: plan, error } = await supabase
      .from("meal_plans")
      .select("id, targets, days, shopping_list, created_at")
      .eq("id", data.planId)
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("dietary_preferences, allergies, daily_routine")
      .eq("id", userId)
      .maybeSingle();

    const days = plan.days as unknown as PlanDay[];
    const day = days[data.dayIndex];
    if (!day) throw new Error("That day is not part of this plan.");
    const index = day.meals.findIndex((m) => m.slot === data.slot);
    if (index === -1) throw new Error("That meal is not part of this plan.");
    const current = day.meals[index]!;

    const raw = await callGateway(
      "You are a registered dietitian. Respond with JSON only. Never include a listed allergen.",
      `Replace this ${data.slot} with a different meal hitting the same nutrition, for ${day.day}.

Replace: ${current.name} (${current.calories} kcal, ${current.protein}p / ${current.carbs}c / ${current.fat}f / ${current.fiber} fiber)
Dietary preferences: ${(profile?.dietary_preferences ?? []).join(", ") || "none"}
Allergies: ${(profile?.allergies ?? []).join(", ") || "none"}
Routine: ${profile?.daily_routine || "standard"}
Avoid repeating other meals that day: ${day.meals
        .filter((_, i) => i !== index)
        .map((m) => m.name)
        .join(", ")}

Return JSON: {"meal": meal object}
${MEAL_SHAPE}`,
    );

    const parsed = parseJson<{ meal: Meal }>(raw);
    if (!parsed.meal?.name) throw new Error("AI returned an unusable meal. Please try again.");
    parsed.meal.slot = current.slot;
    day.meals[index] = parsed.meal;

    const shopping = buildShoppingList(days);
    const { data: updated, error: updateError } = await supabase
      .from("meal_plans")
      .update({ days, shopping_list: shopping })
      .eq("id", plan.id)
      .select("id, targets, days, shopping_list, created_at")
      .single();
    if (updateError) throw new Error(updateError.message);
    return updated;
  });
