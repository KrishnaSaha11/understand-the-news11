-- ============================================================
-- FULL DATABASE SETUP for Understand the News
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Create "profiles" table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_level TEXT DEFAULT 'teenager',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create "saved_articles" table
CREATE TABLE IF NOT EXISTS public.saved_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_data JSONB NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create "analysis_cache" table
CREATE TABLE IF NOT EXISTS public.analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_url TEXT NOT NULL,
  level TEXT NOT NULL,
  language TEXT DEFAULT 'English',
  analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add index on saved_articles.user_id (performance fix)
CREATE INDEX IF NOT EXISTS idx_saved_articles_user_id
  ON public.saved_articles (user_id);

-- 5. Add index on analysis_cache for fast lookups
CREATE INDEX IF NOT EXISTS idx_analysis_cache_url_level
  ON public.analysis_cache (article_url, level, language);

-- 6. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_cache ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for "profiles"
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 8. RLS Policies for "saved_articles"
CREATE POLICY "Users can view own saved articles"
  ON public.saved_articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved articles"
  ON public.saved_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved articles"
  ON public.saved_articles FOR DELETE
  USING (auth.uid() = user_id);

-- 9. RLS Policies for "analysis_cache"
CREATE POLICY "Anyone can read analysis cache"
  ON public.analysis_cache FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert analysis cache"
  ON public.analysis_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 10. Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, preferred_level)
  VALUES (NEW.id, 'teenager');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- DONE! All tables, indexes, RLS policies, and triggers created.
-- ============================================================
