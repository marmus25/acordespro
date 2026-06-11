import { supabase } from './supabase';
import { SongData } from '../types';

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

export const incrementViewCount = async (_id: string): Promise<void> => {
  // Vista contabilizada localmente — el service_role ya no está en el frontend
};

export const deleteCommunitySong = async (_id: string): Promise<void> => {
  throw new Error('Eliminá la canción directamente desde el panel de Supabase.');
};

export const updateCommunitySongGenre = async (_id: string, _genre: string): Promise<void> => {
  throw new Error('Editá el género directamente desde el panel de Supabase.');
};
