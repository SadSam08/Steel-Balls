import React, { useState } from 'react';
import { Dumbbell, Mail, Lock, LogIn, UserPlus, KeyRound } from 'lucide-react';
import {
  signUpWithEmail,
  loginWithEmail,
  loginWithGoogle,
  sendResetPassword,
} from '../data/authService';

interface AuthModalProps {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onError, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      onError('Please enter your email address.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!password) {
          onError('Please enter your password.');
          setIsLoading(false);
          return;
        }
        await loginWithEmail(email.trim(), password);
        onSuccess('Welcome back!');
      } else if (mode === 'signup') {
        if (!password || password.length < 6) {
          onError('Password must be at least 6 characters long.');
          setIsLoading(false);
          return;
        }
        await signUpWithEmail(email.trim(), password);
        onSuccess('Account created successfully!');
      } else if (mode === 'reset') {
        await sendResetPassword(email.trim());
        onSuccess('Password reset email sent! Check your inbox.');
        setMode('login');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let friendlyMsg = err?.message || 'Authentication failed.';
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
        friendlyMsg = 'Incorrect email or password. Please try again.';
      } else if (err?.code === 'auth/user-not-found') {
        friendlyMsg = 'No account found with this email.';
      } else if (err?.code === 'auth/email-already-in-use') {
        friendlyMsg = 'An account with this email already exists. Try logging in.';
      } else if (err?.code === 'auth/weak-password') {
        friendlyMsg = 'Password should be at least 6 characters.';
      } else if (err?.code === 'auth/invalid-email') {
        friendlyMsg = 'Please enter a valid email address.';
      }
      onError(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onSuccess('Signed in with Google!');
    } catch (err: any) {
      console.error('Google Auth error:', err);
      onError(err?.message || 'Google Sign-In failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm space-y-6 shadow-2xl relative z-10 animate-in fade-in zoom-in-95">
        {/* Brand Icon & Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            LIFT<span className="text-cyan-400">PULSE</span>
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'login' && 'Sign in to track your workouts & PRs'}
            {mode === 'signup' && 'Create your free account'}
            {mode === 'reset' && 'Reset your password'}
          </p>
        </div>

        {/* Form */}
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
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
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
                    onClick={() => setMode('reset')}
                    className="text-[11px] text-cyan-400 hover:underline font-semibold"
                  >
                    Forgot?
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
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 active:scale-95 transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              'Processing...'
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
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-semibold uppercase">
              Or
            </span>
          </div>
        )}

        {/* Google Sign In */}
        {mode !== 'reset' && (
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95"
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

        {/* Mode Toggle Footer */}
        <div className="text-center text-xs text-slate-400 pt-2">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-cyan-400 font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-cyan-400 font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
