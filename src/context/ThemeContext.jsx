// ============================================================================
// THEME CONTEXT
// ----------------------------------------------------------------------------
// Light is the default; users can flip to dark. The choice persists in
// localStorage and toggles a `.dark` class on <html>, which flips the CSS color
// variables defined in index.css (and therefore every theme-aware Tailwind
// token: bg/panel/panel2/line/mist/fg). Brand accents stay fixed.
// ============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

const KEY = 'golazo.theme';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem(KEY, theme); } catch { /* private mode */ }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}
