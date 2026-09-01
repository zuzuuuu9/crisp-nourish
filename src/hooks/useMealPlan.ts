import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { MealPlan } from "@/lib/meal-plan";

export function useMealPlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["meal-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("id, targets, days, shopping_list, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MealPlan) ?? null;
    },
  });
}

export function useWeightEntries() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["weights", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weight_entries")
        .select("id, weight_kg, logged_on")
        .eq("user_id", user!.id)
        .order("logged_on", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((e) => ({ ...e, weight_kg: Number(e.weight_kg) }));
    },
  });
}
