import { ReactNode, useEffect, useMemo } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { useSettings } from '../state/settingsStore';
import { ThemeContext, resolveScheme, themeFor } from './theme';

/** Applies the student's Appearance choice (System / Light / Dark) to the whole app. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSettings((s) => s.appearance);
  const system = useColorScheme();
  const scheme = resolveScheme(preference, system);

  // Also switch native UI (date pickers, alerts, keyboard) on iOS/Android.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  // Web: match the page background so overscroll areas aren't white in dark mode.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const theme = themeFor(scheme);
    document.body.style.backgroundColor = theme.colors.background;
    document.documentElement.style.colorScheme = scheme;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', theme.colors.chrome);
  }, [scheme]);

  const theme = useMemo(() => themeFor(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
