export type Gender = "male" | "female";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary — desk job, little exercise",
  light: "Light — 1-3 workouts per week",
  moderate: "Moderate — 3-5 workouts per week",
  active: "Active — 6-7 workouts per week",
  athlete: "Athlete — training twice a day",
};

export interface Metrics {
  bmi: number;
  bmiCategory: string;
  bodyFatPct: number;
  bmr: number;
  tdee: number;
  targetCalories: number;
  deficit: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  weeksToGoal: number;
}

export interface MetricInput {
  age: number;
  gender: Gender | string;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel | string;
  /** kg per week */
  goalPace: number;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/** Deurenberg estimate — a screening estimate, not a clinical measurement. */
export function estimateBodyFat(bmi: number, age: number, gender: string): number {
  const sex = gender === "male" ? 1 : 0;
  return round(1.2 * bmi + 0.23 * age - 10.8 * sex - 5.4, 1);
}

export function calculateMetrics(input: MetricInput): Metrics {
  const heightM = input.heightCm / 100;
  const bmi = round(input.weightKg / (heightM * heightM), 1);
  const bodyFatPct = Math.max(3, estimateBodyFat(bmi, input.age, input.gender));

  // Mifflin-St Jeor
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  const bmr = Math.round(input.gender === "male" ? base + 5 : base - 161);

  const factor = ACTIVITY_FACTORS[input.activityLevel as ActivityLevel] ?? 1.375;
  const tdee = Math.round(bmr * factor);

  // 1 kg body fat ≈ 7700 kcal. Capped for safety at 25% of TDEE and never below BMR.
  const rawDeficit = (input.goalPace * 7700) / 7;
  const cappedDeficit = Math.min(rawDeficit, tdee * 0.25);
  const floor = Math.max(bmr, input.gender === "male" ? 1500 : 1200);
  const targetCalories = Math.max(floor, Math.round(tdee - cappedDeficit));
  const deficit = tdee - targetCalories;

  // High protein preserves lean mass in a deficit.
  const protein = Math.round(Math.min(2.2, 1.8) * input.weightKg);
  const fat = Math.round((targetCalories * 0.27) / 9);
  const carbs = Math.max(50, Math.round((targetCalories - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((targetCalories / 1000) * 14);

  const kgToLose = Math.max(0, input.weightKg - input.targetWeightKg);
  const weeksToGoal = deficit > 0 ? Math.ceil(kgToLose / ((deficit * 7) / 7700)) : 0;

  return {
    bmi,
    bmiCategory: bmiCategory(bmi),
    bodyFatPct,
    bmr,
    tdee,
    targetCalories,
    deficit,
    protein,
    carbs,
    fat,
    fiber,
    weeksToGoal,
  };
}

function round(n: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
