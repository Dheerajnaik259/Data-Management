import { AuthUser } from '../types';
import { supabase, isSupabaseConfigured } from './config';

const LOCAL_STORAGE_AUTH_KEY = 'smm_ops_auth_user';
const LOCAL_ROLE_MAP: Record<string, string> = {
  'dheerajnaik259@gmail.com': 'admin',
  'kushagrarana707@gmail.com': 'founder',
};

async function toAuthUser(id: string, email: string | null, displayName: string | null): Promise<AuthUser> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', id).maybeSingle();
  if (!profile || !['admin', 'founder'].includes(profile.role)) {
    await supabase.auth.signOut();
    throw new Error(`${email || 'This Google account'} is not authorized yet. Add its Auth user to public.profiles with role admin or founder.`);
  }
  return {
    uid: id,
    email: email || '',
    displayName: profile?.name || displayName || email?.split('@')[0] || 'User',
    role: profile.role,
  };
}

export async function loginWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/login` },
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('This password reset link has expired or was already used. Request a new reset email.');
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error || !data.user) {
      if (error?.message.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Email or password is incorrect. For Gmail authentication, use Continue with Google.');
      }
      throw new Error(error?.message || 'Authentication failed.');
    }
    return toAuthUser(data.user.id, data.user.email, data.user.user_metadata?.full_name);
  }

  const role = LOCAL_ROLE_MAP[cleanEmail];
  if (role && password.length >= 4) {
    const user: AuthUser = {
      uid: `local_${cleanEmail.split('@')[0]}`,
      email: cleanEmail,
      displayName: role === 'admin' ? 'Dheeraj (Admin)' : `${cleanEmail.split('@')[0]} (Founder)`,
      role,
    };
    localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(user));
    return user;
  }
  throw new Error('Access restricted. Use one of the authorized accounts.');
}

export async function logoutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
  localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        throw new Error('Too many reset emails requested. Please wait before trying again.');
      }
      throw error;
    }
  }
}

export function subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void {
  if (isSupabaseConfigured && supabase) {
    let active = true;
    const applySession = async (sessionUser: { id: string; email?: string | null; user_metadata?: { full_name?: string } } | null) => {
      if (!active) return;
      try {
        callback(sessionUser ? await toAuthUser(sessionUser.id, sessionUser.email || null, sessionUser.user_metadata?.full_name || null) : null);
      } catch (error) {
        console.warn('Supabase session rejected:', error);
        callback(null);
      }
    };
    supabase.auth.getSession().then(({ data }) => applySession(data.session?.user || null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { void applySession(session?.user || null); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
  if (saved) {
    try { callback(JSON.parse(saved) as AuthUser); } catch { callback(null); }
  } else callback(null);
  return () => {};
}
