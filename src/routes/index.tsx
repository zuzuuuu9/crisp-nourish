import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Apple,
  ArrowRight,
  Calculator,
  CalendarDays,
  LineChart,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";

import heroMeal from "@/assets/hero-meal.jpg";
import { ThemeToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — AI weight loss plans that actually fit your life" },
      {
        name: "description",
        content:
          "Get your BMI, BMR, TDEE and a safe calorie deficit, then an AI-built 7-day meal plan and smart shopping list. Track progress with beautiful charts.",
      },
      { property: "og:title", content: "Lumen — AI weight loss plans that actually fit your life" },
      {
        property: "og:description",
        content: "Personalized calorie targets, AI meal plans, smart shopping lists and progress tracking.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Calculator,
    title: "Precise metabolic math",
    body: "BMI, estimated body fat, BMR and TDEE from Mifflin-St Jeor, with a deficit capped for safety.",
  },
  {
    icon: CalendarDays,
    title: "AI 7-day meal plans",
    body: "Breakfast, lunch, dinner and snacks tuned to your preferences, allergies and daily routine.",
  },
  {
    icon: ShoppingBasket,
    title: "Smart shopping lists",
    body: "Every ingredient merged, quantified and grouped by aisle so one trip covers the week.",
  },
  {
    icon: LineChart,
    title: "Progress you can see",
    body: "Log your weight, watch the trend line, and hit weekly goals without guesswork.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background bg-hero">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <span className="grid size-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="font-display text-lg font-semibold">Lumen</span>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/pricing" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">
            Pricing
          </Link>
          <ThemeToggle />
          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-24">
        <div className="rise-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Apple className="size-3.5 text-primary" /> AI nutrition coaching
          </span>
          <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.05] md:text-6xl">
            Lose weight with a plan built <span className="text-gradient">around your life</span>
          </h1>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Lumen turns your body metrics and daily routine into a safe calorie target, a seven-day
            meal plan and a shopping list — in under a minute.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Build my plan <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/pricing">See plans</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free forever plan · No credit card · Cancel anytime
          </p>
        </div>

        <div className="rise-in relative" style={{ animationDelay: "120ms" }}>
          <img
            src={heroMeal}
            alt="A balanced plate of grilled salmon, quinoa, avocado and roasted vegetables"
            width={1280}
            height={960}
            className="w-full rounded-3xl border border-border object-cover shadow-lift"
          />
          <div className="glass-card absolute -bottom-6 left-4 hidden p-4 sm:block">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Daily target</p>
            <p className="font-display text-2xl font-semibold">1,840 kcal</p>
            <p className="text-xs text-muted-foreground">148p · 165c · 55f · 30 fiber</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">Everything you need, nothing you don't</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="glass-card rise-in p-6 transition-transform hover:-translate-y-1"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="glass-card flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Your first plan is a minute away</h2>
          <p className="max-w-lg text-sm text-muted-foreground">
            Answer nine quick questions and Lumen does the math, the menu and the groceries.
          </p>
          <Button asChild size="lg">
            <Link to="/auth">
              Start free <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Lumen · Nutrition guidance, not medical advice.
      </footer>
    </div>
  );
}
