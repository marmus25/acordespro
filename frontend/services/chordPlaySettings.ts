import { supabase } from './supabase';

export interface ChordPlayConfig {
  bpm?: number;
  patternId?: string;
  dlDelay?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customPatterns?: any[];
  sectionMeasures?: Record<string, number>;
  segMeasures?: Record<string, number>;
}

export async function loadChordPlayConfig(songKey: string): Promise<ChordPlayConfig | null> {
  try {
    const { data } = await supabase
      .from('chordplay_settings')
      .select('config')
      .eq('song_key', songKey)
      .maybeSingle();
    return (data?.config as ChordPlayConfig) ?? null;
  } catch {
    return null;
  }
}

export async function saveChordPlayConfig(songKey: string, config: ChordPlayConfig): Promise<void> {
  try {
    await supabase.from('chordplay_settings').upsert(
      { song_key: songKey, config, updated_at: new Date().toISOString() },
      { onConflict: 'song_key' }
    );
  } catch {}
}
