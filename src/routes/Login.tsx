import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ShieldAlert, KeyRound, Eye, EyeOff } from 'lucide-react';

const mpixelMediaLogo = new URL('../assets/mpixelmedia-logo.png', import.meta.url).href;

function getSafeReturnPath(locationState: unknown): string {
  const from = (locationState as { from?: { pathname?: unknown } } | null)?.from?.pathname;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.includes('\\')
    ? from
    : '/';
}

export const Login: React.FC = () => {
  const { login, loginWithGoogle, resetPassword, updatePassword, user, isBackendLive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isInvite, setIsInvite] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'invite');
  const [isRecovery, setIsRecovery] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'recovery');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // If already logged in, redirect
  React.useEffect(() => {
    setIsInvite(new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'invite');
    setIsRecovery(new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'recovery');
    if (user && !isInvite && !isRecovery) {
      navigate(getSafeReturnPath(location.state), { replace: true });
    }
  }, [user, isInvite, isRecovery, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResetMessage(null);
    setIsLoading(true);

    try {
      if (isInvite || isRecovery) await updatePassword(password);
      else await login(email, password);
      navigate(getSafeReturnPath(location.state), { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage(null);
    setResetMessage(null);
    try {
      await resetPassword(email);
      setResetMessage('Check your email for a password reset link.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to send a password reset email.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Google authentication failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img src={mpixelMediaLogo} alt="mpixelmedia" className="w-28 h-28 mx-auto rounded-2xl object-cover border border-[var(--color-border)] shadow-xl mb-4" />
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
          ERP Mpixel Media
        </h1>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)] tracking-wide uppercase font-medium">
          Internal Operations & Production Admin Desk
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-panel-elevated py-8 px-6 sm:px-10">
          {/* Security Notice */}
          <div className="mb-6 p-3.5 bg-white/[0.035] border border-[var(--color-border)] rounded-lg flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
            <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
              <span className="font-bold text-[var(--color-text)] block">Restricted Access</span>
              This system is strictly reserved for the two authorized account holders. Public registration and guest sessions are permanently disabled.
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-400/25 rounded-lg text-xs text-red-200">
              {errorMessage}
            </div>
          )}
          {resetMessage && <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-400/25 rounded-lg text-xs text-emerald-200">{resetMessage}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || !isBackendLive}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-[var(--color-text)] bg-white/[0.045] border border-[var(--color-border)] hover:bg-white/[0.08] rounded-md transition-colors shadow-xs disabled:opacity-50"
            >
              <span className="font-bold text-[#4285F4]">G</span>
              <span>Continue with Google</span>
            </button>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              <span className="h-px flex-1 bg-[var(--color-border)]" />
              <span>or email password</span>
              <span className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your Gmail address"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#050505] border border-[var(--color-border)] rounded-md text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">
                {isInvite || isRecovery ? 'Create New Password' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2 text-sm bg-[#050505] border border-[var(--color-border)] rounded-md text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isBackendLive}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-[#071110] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-md transition-colors shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>{isInvite || isRecovery ? 'Update Password' : 'Sign In'}</span>
                </>
              )}
            </button>
            <button type="button" onClick={handleResetPassword} disabled={!isBackendLive} className="w-full text-xs font-semibold text-[var(--color-accent)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
              Forgot password?
            </button>
          </form>

        </div>

        {/* Cloud configuration status */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {isBackendLive ? (
              <span className="text-emerald-300 font-medium">
                &bull; Connected to Secure Cloud Auth. Authorized operators only.
              </span>
            ) : (
              <span className="text-red-300 font-medium">
                &bull; Database is not configured. Sign-in is disabled until <code className="bg-red-500/15 px-1 py-0.5 rounded text-[10px]">.env.local</code> contains valid credentials.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
