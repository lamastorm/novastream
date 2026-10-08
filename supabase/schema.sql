-- ====================================================================
-- SCHEMA SUPABASE : CATALOGUE NOVASTREAM / ERODIUM BOT IA
-- ====================================================================
-- Exécutez ce script dans l'Éditeur SQL de Supabase (SQL Editor)
-- pour créer la table synchronisée en continu par le Bot IA.

CREATE TABLE IF NOT EXISTS public.catalog_movies (
  id BIGINT PRIMARY KEY,
  imdb_id TEXT,
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average NUMERIC(3, 1),
  vote_count INTEGER DEFAULT 0,
  release_date DATE,
  media_type TEXT DEFAULT 'movie',
  popularity NUMERIC(10, 2) DEFAULT 0,
  is_verified_bot BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour des requêtes ultra-rapides triées par popularité et dates de sortie
CREATE INDEX IF NOT EXISTS idx_catalog_popularity ON public.catalog_movies (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_release ON public.catalog_movies (release_date DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_imdb ON public.catalog_movies (imdb_id);

-- Activation de Row Level Security (RLS) avec lecture publique
ALTER TABLE public.catalog_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique du catalogue" 
  ON public.catalog_movies 
  FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Insertion et mise à jour par le bot" 
  ON public.catalog_movies 
  FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);
