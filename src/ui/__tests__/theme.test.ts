import { Palette, palettes, resolveScheme } from '../theme';

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Key = keyof Palette;
/** [foreground, background, minimum ratio] for every pairing the UI uses. */
const PAIRS: [Key, Key, number][] = [
  // Body text and captions
  ['text', 'background', 4.5],
  ['text', 'card', 4.5],
  ['muted', 'background', 4.5],
  ['muted', 'card', 4.5],
  ['text', 'segmentSelected', 4.5],
  ['text', 'chrome', 4.5],
  // Brand
  ['onPrimary', 'primary', 4.5],
  ['onPrimary', 'primaryPressed', 4.5],
  ['primaryText', 'background', 4.5],
  ['primaryText', 'card', 4.5],
  ['primaryText', 'chrome', 4.5],
  ['onPrimarySoft', 'primarySoft', 4.5],
  ['onPrimarySoft', 'segmentSelected', 4.5],
  // Status text on banners and cards
  ['success', 'card', 4.5],
  ['success', 'successSoft', 4.5],
  ['warning', 'warningSoft', 4.5],
  ['danger', 'card', 4.5],
  // Large numbers and graphics (WCAG 3:1 for large text and UI components)
  ['water', 'card', 3],
  ['water', 'background', 3],
  ['water', 'waterSoft', 3],
  ['primary', 'card', 3],
  ['primary', 'background', 3],
  ['success', 'waterSoft', 3],
  // Pace-colored progress ring (graphic: 3:1 against the screen and the ring track)
  ['ringGood', 'background', 3],
  ['ringGood', 'waterSoft', 3],
  ['ringCaution', 'background', 3],
  ['ringCaution', 'waterSoft', 3],
  ['ringAlert', 'background', 3],
  ['ringAlert', 'waterSoft', 3],
  // Status text under the ring uses the status text colors on the screen background
  ['success', 'background', 4.5],
  ['warning', 'background', 4.5],
  ['danger', 'background', 4.5],
];

describe.each(['light', 'dark'] as const)('%s palette', (scheme) => {
  const p = palettes[scheme];

  it.each(PAIRS)('%s on %s meets %d:1', (fg, bg, min) => {
    const ratio = contrast(p[fg], p[bg]);
    if (ratio < min) throw new Error(`${scheme}: ${fg} ${p[fg]} on ${bg} ${p[bg]} is ${ratio.toFixed(2)}:1 (need ${min}:1)`);
  });

  it('uses only 6-digit hex colors', () => {
    for (const value of Object.values(p)) expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

it('light mode uses official Stanford Cardinal Red for brand fills', () => {
  expect(palettes.light.primary).toBe('#8C1515');
});

describe('resolveScheme', () => {
  it('follows the device when set to System', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
  });
  it('honors a forced choice', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });
});
