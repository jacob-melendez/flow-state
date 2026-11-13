/**
 * Colors, spacing and type, in light and dark versions.
 *
 * Stanford-themed: Cardinal Red is the brand and action color; Stanford's
 * Lagunita teal is used for water (rings, cups, charts). Values come from
 * Stanford's identity palette (https://identity.stanford.edu/design-elements/color/);
 * every text/background pair is checked for WCAG AA contrast in
 * src/ui/__tests__/theme.test.ts. Always use these tokens, never raw colors.
 */
import { createContext, useContext } from 'react';
import { TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';
export type AppearancePreference = 'system' | ColorScheme;

export interface Palette {
  /** Screen background. */
  background: string;
  /** Cards and raised surfaces. */
  card: string;
  /** The selected option in a segmented control. */
  segmentSelected: string;
  text: string;
  muted: string;
  placeholder: string;
  border: string;
  /** Cardinal: filled buttons, switches, selected states. */
  primary: string;
  /** Pressed state for primary fills. */
  primaryPressed: string;
  /** Text and icons on `primary`. */
  onPrimary: string;
  /** Cardinal text, links and icons on the background or cards. */
  primaryText: string;
  /** Tinted background for secondary buttons, chips and info banners. */
  primarySoft: string;
  /** Text on `primarySoft`. */
  onPrimarySoft: string;
  /** Water visuals: progress rings, cup counts, charts. */
  water: string;
  waterSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  /** Tab bar and header backgrounds. */
  chrome: string;
  /** Progress ring by pace: on track / a bit off / far off (behind or too much). */
  ringGood: string;
  ringCaution: string;
  ringAlert: string;
}

/** Official Stanford brand colors, for reference (use the palette tokens in UI). */
export const STANFORD = {
  cardinal: '#8C1515',
  cardinalDark: '#820000',
  brightRed: '#B1040E',
  black: '#2E2D29',
  paloAlto: '#175E54',
  lagunita: '#007C92',
  sky: '#0098DB',
} as const;

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    background: '#F7F5F2',
    card: '#FFFFFF',
    segmentSelected: '#FFFFFF',
    text: STANFORD.black,
    muted: '#5F5A54',
    placeholder: '#A39D97',
    border: '#E5E0DA',
    primary: STANFORD.cardinal,
    primaryPressed: STANFORD.cardinalDark,
    onPrimary: '#FFFFFF',
    primaryText: STANFORD.cardinal,
    primarySoft: '#F6E6E6',
    onPrimarySoft: STANFORD.cardinalDark,
    water: STANFORD.lagunita,
    waterSoft: '#DDEFF2',
    success: STANFORD.paloAlto,
    successSoft: '#E2F0EC',
    warning: '#8A4B00',
    warningSoft: '#FCEFDD',
    danger: STANFORD.brightRed,
    chrome: '#FFFFFF',
    ringGood: '#1E8A5A',
    ringCaution: '#AD7300',
    ringAlert: STANFORD.brightRed,
  },
  dark: {
    background: '#141312',
    card: '#211F1D',
    segmentSelected: '#3A3734',
    text: '#F3F0EB',
    muted: '#B4ADA5',
    placeholder: '#7B746D',
    border: '#35322F',
    // A lighter Cardinal-family red so switches and selected states stay visible
    // on near-black (official Bright Red is used when pressed).
    primary: '#D02B2B',
    primaryPressed: STANFORD.brightRed,
    onPrimary: '#FFFFFF',
    primaryText: '#FF7A73',
    primarySoft: '#3A1B1B',
    onPrimarySoft: '#FFB4AE',
    water: '#4FC3D9',
    waterSoft: '#16343A',
    success: '#6FD3A8',
    successSoft: '#163128',
    warning: '#F4B860',
    warningSoft: '#3A2B14',
    danger: '#FF7A73',
    chrome: '#1B1A18',
    ringGood: '#6FD3A8',
    ringCaution: '#F4C04F',
    ringAlert: '#FF6B6B',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Keeps screen content a comfortable width on tablets and desktop browsers. */
export const READABLE_WIDTH = { width: '100%', maxWidth: 560, alignSelf: 'center' } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export interface TypeScale {
  title: TextStyle;
  heading: TextStyle;
  body: TextStyle;
  caption: TextStyle;
}

export function typeScale(c: Palette): TypeScale {
  return {
    title: { fontSize: 28, fontWeight: '700', color: c.text },
    heading: { fontSize: 18, fontWeight: '600', color: c.text },
    body: { fontSize: 16, color: c.text },
    caption: { fontSize: 13, color: c.muted },
  };
}

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  type: TypeScale;
}

export function themeFor(scheme: ColorScheme): Theme {
  return { scheme, colors: palettes[scheme], type: typeScale(palettes[scheme]) };
}

/** Which scheme to use, given the student's choice and the device setting. */
export function resolveScheme(preference: AppearancePreference, system: string | null | undefined): ColorScheme {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export const ThemeContext = createContext<Theme>(themeFor('light'));

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Builds a style-sheet hook from palette-dependent styles. Pass a factory that
 * returns `StyleSheet.create({...})`; it runs once per color scheme, so styles
 * are only rebuilt when light/dark changes.
 */
export function makeStyles<T>(factory: (colors: Palette, type: TypeScale) => T): () => T {
  const cache: Partial<Record<ColorScheme, T>> = {};
  return function useStyles() {
    const { scheme, colors, type } = useTheme();
    return (cache[scheme] ??= factory(colors, type));
  };
}
