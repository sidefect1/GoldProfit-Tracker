
export type Theme = 'light' | 'dark';

export const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('gp-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
};

export const applyTheme = (theme: Theme) => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('gp-theme', theme);
};
