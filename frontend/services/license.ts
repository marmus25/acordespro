import { supabase } from './supabase';

const STORAGE_KEY = 'lc_v1';

interface LocalLicense { email: string; deviceId: string; product: string }

function getDeviceId(): string {
  let id = localStorage.getItem('lc_device');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('lc_device', id);
  }
  return id;
}

export function getLocalLicense(): LocalLicense | null {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
}

function saveLocalLicense(data: LocalLicense) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export type ActivationResult =
  | { ok: true; product: string }
  | { ok: false; reason: 'not_found' | 'other_device' | 'inactive' | 'error' };

export async function activateLicense(email: string): Promise<ActivationResult> {
  const deviceId = getDeviceId();

  try {
    // 1. Buscar la licencia por email
    const { data, error } = await supabase
      .from('licenses')
      .select('id, product, device_id, active')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) return { ok: false, reason: 'not_found' };
    if (!data.active) return { ok: false, reason: 'inactive' };

    // 2. Ya activada en este mismo dispositivo
    if (data.device_id === deviceId) {
      saveLocalLicense({ email: email.toLowerCase().trim(), deviceId, product: data.product });
      return { ok: true, product: data.product };
    }

    // 3. Ya activada en otro dispositivo
    if (data.device_id && data.device_id !== deviceId) {
      return { ok: false, reason: 'other_device' };
    }

    // 4. Primera activación — registrar device_id
    const { error: updateError } = await supabase
      .from('licenses')
      .update({ device_id: deviceId, activated_at: new Date().toISOString() })
      .eq('id', data.id)
      .is('device_id', null);

    if (updateError) return { ok: false, reason: 'error' };

    saveLocalLicense({ email: email.toLowerCase().trim(), deviceId, product: data.product });
    return { ok: true, product: data.product };

  } catch {
    return { ok: false, reason: 'error' };
  }
}

export async function verifyLicense(): Promise<boolean> {
  const local = getLocalLicense();
  if (!local) return false;

  try {
    const { data } = await supabase
      .from('licenses')
      .select('active, device_id')
      .eq('email', local.email)
      .single();

    return !!(data?.active && data.device_id === local.deviceId);
  } catch {
    // Sin red: confiar en la licencia local para no bloquear al usuario
    return true;
  }
}

export function clearLocalLicense() {
  localStorage.removeItem(STORAGE_KEY);
}
