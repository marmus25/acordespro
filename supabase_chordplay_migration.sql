-- Ejecutar en el SQL Editor de Supabase
-- Tabla para persistir configuración de la función "Tocar" por canción

CREATE TABLE IF NOT EXISTS chordplay_settings (
  song_key   text        PRIMARY KEY,
  config     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Acceso anónimo total (igual que community_songs)
ALTER TABLE chordplay_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_full_access" ON chordplay_settings
  FOR ALL USING (true) WITH CHECK (true);
