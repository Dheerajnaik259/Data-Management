import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme] = useState<Theme>('dark');

  useEffect(() => {
    localStorage.setItem('smm_ops_theme', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = useCallback(() => {
    // Fixed dark theme, theme toggle is locked to dark mode
    document.documentElement.classList.add('dark');
    localStorage.setItem('smm_ops_theme', 'dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme, isDark: true }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
