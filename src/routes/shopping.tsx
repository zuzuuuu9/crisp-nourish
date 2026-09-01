import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBasket } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { useMealPlan } from "@/hooks/useMealPlan";

export const Route = createFileRoute("/shopping")({
  head: () => ({
    meta: [
      { title: "Shopping list — Lumen" },
      { name: "description", content: "A smart grocery list built from your personalised 7-day meal plan." },
      { property: "og:title", content: "Your smart shopping list" },
      { property: "og:description", content: "Everything you need for the week, grouped by aisle." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <Shopping />
      </AppShell>
    </RequireAuth>
  ),
});

function Shopping() {
  const { data: plan } = useMealPlan();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const groups = plan?.shopping_list ?? [];
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="rise-in flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Groceries</p>
          <h1 className="font-display text-3xl font-semibold">Shopping list</h1>
        </div>
        {total > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {done} / {total} collected
          </span>
        )}
      </div>

      {total === 0 ? (
        <div className="glass-card rise-in grid place-items-center gap-3 p-10 text-center">
          <ShoppingBasket className="size-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            Generate a meal plan and your grocery list appears here, grouped by aisle.
          </p>
          <Button asChild>
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <div key={group.category} className="glass-card rise-in p-6">
              <h2 className="font-display text-lg font-semibold">{group.category}</h2>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => {
                  const key = `${group.category}:${item.item}`;
                  const isDone = !!checked[key];
                  return (
                    <li key={key}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent/50">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => setChecked((c) => ({ ...c, [key]: !c[key] }))}
                          className="size-4 accent-[var(--color-primary)]"
                        />
                        <span className={isDone ? "text-muted-foreground line-through" : ""}>{item.item}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{item.quantity}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
