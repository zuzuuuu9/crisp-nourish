CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  age INT,
  gender TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  target_weight_kg NUMERIC,
  activity_level TEXT,
  dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  daily_routine TEXT,
  goal_pace NUMERIC NOT NULL DEFAULT 0.5,
  plan TEXT NOT NULL DEFAULT 'free',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  weight_kg NUMERIC NOT NULL,
  logged_on DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_entries TO authenticated;
GRANT ALL ON public.weight_entries TO service_role;
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weights" ON public.weight_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  targets JSONB NOT NULL DEFAULT '{}'::jsonb,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  shopping_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.meal_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER meal_plans_updated BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();