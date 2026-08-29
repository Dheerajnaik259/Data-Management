import { AuthUser } from '../types';
import { supabase, isSupabaseConfigured } from './config';

async function toAuthUser(id: string, email: string | null, displayName: string | null): Promise<AuthUser> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: profile, error } = await supabase.from('profiles').select('name, role').eq('id', id).maybeSingle();
  if (error) throw new Error(`Unable to verify your authorized profile: ${error.message}`);
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
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. This app cannot sign in or store data until its environment variables are set.');
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error || !data.user) {
      if (error?.message.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Email or password is incorrect. For Gmail authentication, use Continue with Google.');
      }
      throw new Error(error?.message || 'Authentication failed.');
    }
    return toAuthUser(data.user.id, data.user.email, data.user.user_metadata?.full_name);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed.';
    if (/failed to fetch|network|networkerror|load failed/i.test(message)) {
      throw new Error('Cannot reach Supabase. Check your internet connection and Supabase URL, then try again.');
    }
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Password reset is unavailable.');
  }
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

  callback(null);
  return () => {};
}
