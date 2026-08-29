import { supabase, isSupabaseConfigured } from './config';

export const SUPABASE_STORAGE_BUCKET = 'smm-ops-files';

export async function uploadFile(file: File, folder: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase Storage is not configured.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeFile(path: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase Storage is not configured.');
  const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}
