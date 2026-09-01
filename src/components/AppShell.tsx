import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Leaf, LineChart, LogOut, Moon, ShoppingBasket, Sparkles, Sun } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plan", label: "Meal plan", icon: Leaf },
  { to: "/shopping", label: "Shopping", icon: ShoppingBasket },
  { to: "/progress", label: "Progress", icon: LineChart },
] as const;

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle}>
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-hero">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display text-lg font-semibold">Lumen</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              title={user?.email ?? undefined}
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:pb-16">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-4">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
