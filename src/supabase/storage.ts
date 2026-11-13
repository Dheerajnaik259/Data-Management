import { supabase, isSupabaseConfigured, supabaseUrl } from './config';
import { safeHttpUrl } from '../utils/safeHttpUrl';

export const SUPABASE_STORAGE_BUCKET = 'smm-ops-files';
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const allowedFileTypes: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'video/mp4': ['mp4'],
};

const allowedFolders = new Set(['clients', 'cameramen', 'shoots', 'expenses']);

export function getStorageObjectPath(value: string): string | null {
  let path = value;
  if (/^https:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const configuredOrigin = new URL(supabaseUrl).origin;
      if (url.origin !== configuredOrigin) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/smm-ops-files\/(.+)$/);
      if (!match) return null;
      path = match[1].split('/').map(segment => decodeURIComponent(segment)).join('/');
    } catch {
      return null;
    }
  }

  const segments = path.split('/');
  if (
    segments.length < 3
    || !allowedFolders.has(segments[0])
    || segments.some(segment => !segment || segment === '.' || segment === '..' || segment.includes('\\'))
  ) return null;
  return path;
}

export async function resolveFileUrl(value: string): Promise<string | null> {
  const objectPath = getStorageObjectPath(value);
  if (objectPath) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase Storage is not configured.');
    const { data, error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(objectPath, 300);
    if (error) throw error;
    return data.signedUrl;
  }
  return safeHttpUrl(value);
}

export async function uploadFile(file: File, folder: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase Storage is not configured.');
  const folderSegments = folder.split('/');
  if (
    folderSegments.length !== 2
    || !allowedFolders.has(folderSegments[0])
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(folderSegments[1])
  ) {
    throw new Error('Files must be uploaded to a supported record folder.');
  }
  const allowedExtensions = allowedFileTypes[file.type];
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions || !extension || !allowedExtensions.includes(extension)) {
    throw new Error('Only PDF, JPEG, PNG, and MP4 files are allowed.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Files must be 100 MB or smaller.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function removeFile(path: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase Storage is not configured.');
  const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}
