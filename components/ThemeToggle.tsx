
import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Theme, getInitialTheme, applyTheme } from '../utils/theme';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      onClick={toggleTheme}
      className={`fixed top-4 right-4 z-50 p-2.5 rounded-xl shadow-sm backdrop-blur-sm transition-all duration-300 border ${
        theme === 'dark'
          ? 'bg-navy-900/80 border-white/10 text-gold-400 hover:bg-navy-800'
          : 'bg-white/80 border-gray-200 text-gray-600 hover:bg-white hover:text-gold-600'
      }`}
      aria-label="Toggle Dark Mode"
    >
      {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};
