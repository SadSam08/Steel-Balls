import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  signUpWithEmail,
  loginWithEmail,
  loginWithGoogle,
  sendResetPassword,
} from '../data/authService';
import { SteelBallsIcon } from './SteelBallsIcon';

interface AuthScreenProps {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onError, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineSuccess, setInlineSuccess] = useState<string | null>(null);

  const formatAuthError = (err: any): string => {
    console.error('Auth error detail:', err);
    const code = err?.code || '';
    const message = err?.message || '';

    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return 'Incorrect password or email address. Please try again.';
    }
    if (code === 'auth/user-not-found') {
      return 'No account found with this email address. Please sign up.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many failed attempts. Please try again later or reset your password.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google Sign-In popup was closed before completing.';
    }
    if (code === 'auth/popup-blocked') {
      return 'Sign-In popup was blocked by browser. Please allow popups for this site.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'This sign-in method is currently disabled in your Firebase console.';
    }

    return message || 'Authentication failed. Please check your credentials.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    setInlineSuccess(null);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setInlineError('Please enter your email address.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!password) {
          setInlineError('Please enter your password.');
          setIsLoading(false);
          return;
        }
        await loginWithEmail(cleanEmail, password);
        onSuccess('Welcome back!');
      } else if (mode === 'signup') {
        if (!password || password.length < 6) {
          setInlineError('Password must be at least 6 characters long.');
          setIsLoading(false);
          return;
        }
        await signUpWithEmail(cleanEmail, password);
        onSuccess('Account created successfully!');
      } else if (mode === 'reset') {
        await sendResetPassword(cleanEmail);
        const msg = 'Password reset email sent! Please check your inbox.';
        setInlineSuccess(msg);
        onSuccess(msg);
      }
    } catch (err: any) {
      const friendlyMsg = formatAuthError(err);
      setInlineError(friendlyMsg);
      onError(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setInlineError(null);
    setInlineSuccess(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onSuccess('Signed in with Google!');
    } catch (err: any) {
      const friendlyMsg = formatAuthError(err);
      setInlineError(friendlyMsg);
      onError(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-['Outfit',sans-serif]">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm space-y-6 shadow-2xl relative z-10 backdrop-blur-xl animate-in fade-in zoom-in-95">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center shadow-xl shadow-cyan-500/10 border border-slate-700/60">
            <SteelBallsIcon size={42} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              STEEL<span className="text-cyan-400">BALLS</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login' && 'Sign in to track your workouts & PRs'}
              {mode === 'signup' && 'Create your account to start tracking'}
              {mode === 'reset' && 'Reset your password via email'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setInlineError(null);
              setInlineSuccess(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              mode === 'login'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setInlineError(null);
              setInlineSuccess(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              mode === 'signup'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Inline Error Message Banner */}
        {inlineError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{inlineError}</span>
          </div>
        )}

        {/* Inline Success Message Banner */}
        {inlineSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{inlineSuccess}</span>
          </div>
        )}

        {/* Main Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setInlineError(null);
                      setInlineSuccess(null);
                    }}
                    className="text-[11px] text-cyan-400 hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : mode === 'login' ? (
              <>
                <LogIn size={18} /> Sign In
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus size={18} /> Create Account
              </>
            ) : (
              <>
                <KeyRound size={18} /> Send Reset Link
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        {mode !== 'reset' && (
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-semibold uppercase">
              Or
            </span>
          </div>
        )}

        {/* Google Sign In Button */}
        {mode !== 'reset' && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700/80 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3c0 2.9.7 5.6 1.9 8l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z"
              />
            </svg>
            Continue with Google
          </button>
        )}

        {/* Footer Navigation Link */}
        <div className="text-center text-xs text-slate-400 pt-1">
          {mode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setInlineError(null);
                  setInlineSuccess(null);
                }}
                className="text-cyan-400 font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setInlineError(null);
                  setInlineSuccess(null);
                }}
                className="text-cyan-400 font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <p>
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setInlineError(null);
                  setInlineSuccess(null);
                }}
                className="text-cyan-400 font-bold hover:underline"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
