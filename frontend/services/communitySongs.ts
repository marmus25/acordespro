import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { SongData } from '../types';

// Cliente admin — solo se activa cuando el usuario ingresa la clave correcta
const ADMIN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYWl0aGlzdGFsbXZsY3NmbnR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDgxMzU0MiwiZXhwIjoyMDk2Mzg5NTQyfQ.nbUDRM6OM_5m7zd-cexXHM1Qj5MpTKeiNaYV6XoUd0I';
const supabaseAdmin = createClient(
  'https://gqaithistalmvlcsfntw.supabase.co',
  ADMIN_KEY
);

export interface CommunitySong extends SongData {
  id: string;
  genre?: string;
  created_at: string;
  view_count: number;
}

export const getCommunitySongs = async (): Promise<CommunitySong[]> => {
  const { data, error } = await supabase
    .from('community_songs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    originalKey: row.original_key,
    genre: row.genre ?? '',
    lines: row.lines,
    youtubeUrl: row.youtube_url ?? undefined,
    created_at: row.created_at,
    view_count: row.view_count ?? 0,
  }));
};

// ── Operaciones de solo lectura / publicación (anon) ──────────────────────────
export const publishCommunitySong = async (
  song: SongData,
  genre?: string
): Promise<void> => {
  const { error } = await supabase.from('community_songs').insert({
    title: song.title,
    artist: song.artist,
    original_key: song.originalKey,
    genre: genre ?? '',
    lines: song.lines,
    youtube_url: song.youtubeUrl ?? null,
  });
  if (error) throw new Error(error.message);
};

export const incrementViewCount = async (id: string): Promise<void> => {
  const { data } = await supabaseAdmin
    .from('community_songs').select('view_count').eq('id', id).single();
  if (data) {
    await supabaseAdmin.from('community_songs')
      .update({ view_count: (data.view_count ?? 0) + 1 })
      .eq('id', id);
  }
};

// ── Operaciones de admin (service_role) ───────────────────────────────────────
export const deleteCommunitySong = async (id: string): Promise<void> => {
  const { error } = await supabaseAdmin.from('community_songs').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

export const updateCommunitySongGenre = async (id: string, genre: string): Promise<void> => {
  const { error } = await supabaseAdmin.from('community_songs').update({ genre }).eq('id', id);
  if (error) throw new Error(error.message);
};
