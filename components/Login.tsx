
import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'LOGIN') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300 border border-gray-100 dark:border-white/5">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 dark:bg-gold-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">GoldProfit Pro</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2">Secure Pricing Dashboard</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-3 text-red-800 dark:text-red-300 text-sm mb-6">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-navy-950 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-blue-500 dark:focus:border-gold-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-gold-500/20 transition-all font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-navy-950 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-blue-500 dark:focus:border-gold-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-gold-500/20 transition-all font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gray-900 dark:bg-gold-500 text-white font-bold py-3.5 rounded-xl hover:bg-black dark:hover:bg-gold-600 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'LOGIN' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
            className="text-sm font-bold text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-gold-400 transition-colors"
          >
            {mode === 'LOGIN' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};
