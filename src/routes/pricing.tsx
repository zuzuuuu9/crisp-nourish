import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Lumen Free and Pro plans" },
      { name: "description", content: "Start free with Lumen or go Pro for unlimited AI meal plans, swaps and smart shopping lists." },
      { property: "og:title", content: "Lumen pricing — Free and Pro" },
      { property: "og:description", content: "Simple plans for personalised, AI-powered nutrition." },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to start losing weight with a plan that fits you.",
    features: [
      "Full metabolic profile: BMI, BMR, TDEE",
      "One AI 7-day meal plan per week",
      "Daily calorie and macro targets",
      "Weight logging and trend chart",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "per month",
    description: "For people who want their plan to adapt as fast as they do.",
    features: [
      "Unlimited plan generations",
      "Unlimited AI meal swaps",
      "Smart shopping lists grouped by aisle",
      "Advanced progress analytics and weekly goals",
      "Allergy and diet-aware recipe variety",
      "Priority AI generation",
    ],
    cta: "Go Pro",
    highlight: true,
  },
];

function Pricing() {
  const { user } = useAuth();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <div className="rise-in text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Simple pricing
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Nutrition that pays for itself
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Start free. Upgrade when you want unlimited plans, swaps and deeper insight.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {plans.map((plan, i) => (
          <div
            key={plan.name}
            className={`glass-card rise-in relative flex flex-col p-8 ${plan.highlight ? "ring-2 ring-primary" : ""}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Most popular
              </span>
            )}
            <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            <p className="mt-6 font-display text-4xl font-semibold">
              {plan.price}
              <span className="ml-2 text-base font-medium text-muted-foreground">{plan.period}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 w-full" variant={plan.highlight ? "default" : "outline"}>
              <Link to={user ? "/dashboard" : "/auth"}>{plan.cta}</Link>
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Lumen gives guidance, not medical advice. Talk to a professional before big dietary changes.
      </p>
    </div>
  );
}
