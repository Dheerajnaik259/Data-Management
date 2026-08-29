import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Film, Lock, Mail, ShieldAlert, KeyRound, Eye, EyeOff } from 'lucide-react';

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
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
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
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
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
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#C85A32] text-white shadow-md mb-4">
          <Film className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1C1917]">
          SMM Ops Tool
        </h1>
        <p className="mt-1 text-xs text-[#78716C] tracking-wide uppercase font-medium">
          Internal Operations & Production Admin Desk
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-xl border border-[#E5E0DA] shadow-xs">
          {/* Security Notice */}
          <div className="mb-6 p-3.5 bg-[#FAF8F5] border border-[#E5E0DA] rounded-lg flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#57534E] leading-relaxed">
              <span className="font-bold text-[#1C1917] block">Restricted Access</span>
              This system is strictly reserved for the two authorized account holders. Public registration and guest sessions are permanently disabled.
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B]">
              {errorMessage}
            </div>
          )}
          {resetMessage && <div className="mb-5 p-3.5 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg text-xs text-[#166534]">{resetMessage}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || !isBackendLive}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-[#1C1917] bg-white border border-[#D6D3D1] hover:bg-[#F5F5F4] rounded-md transition-colors shadow-xs disabled:opacity-50"
            >
              <span className="font-bold text-[#4285F4]">G</span>
              <span>Continue with Google</span>
            </button>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#A8A29E]">
              <span className="h-px flex-1 bg-[#E5E0DA]" />
              <span>or email password</span>
              <span className="h-px flex-1 bg-[#E5E0DA]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your Gmail address"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E5E0DA] rounded-md text-[#1C1917] placeholder:text-[#A8A29E] focus:ring-1 focus:ring-[#C85A32] focus:border-[#C85A32] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] uppercase tracking-wider mb-1.5">
                {isInvite || isRecovery ? 'Create New Password' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-[#E5E0DA] rounded-md text-[#1C1917] placeholder:text-[#A8A29E] focus:ring-1 focus:ring-[#C85A32] focus:border-[#C85A32] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#A8A29E] hover:text-[#57534E] rounded focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isBackendLive}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#C85A32] hover:bg-[#B84A24] rounded-md transition-colors shadow-xs disabled:opacity-50"
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
            <button type="button" onClick={handleResetPassword} disabled={!isBackendLive} className="w-full text-xs font-semibold text-[#C85A32] hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
              Forgot password?
            </button>
          </form>

        </div>

        {/* Cloud configuration status */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-[#78716C]">
            {isBackendLive ? (
              <span className="text-emerald-700 font-medium">
                &bull; Connected to Supabase Auth. Three authorized operators maximum.
              </span>
            ) : (
              <span className="text-red-700 font-medium">
                &bull; Supabase is not configured. Sign-in is disabled until <code className="bg-[#FEE2E2] px-1 py-0.5 rounded text-[10px]">.env.local</code> contains valid Supabase keys.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
