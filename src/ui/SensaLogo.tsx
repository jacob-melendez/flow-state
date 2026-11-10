import { Platform } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { useTheme } from './theme';

/**
 * SENSA's logo: a 3×3 grid of colored dots over the letter-spaced name.
 *
 * Redrawn as a vector from the image SENSA provided, so it stays sharp at any
 * size and adapts its lettering for dark mode. If SENSA has official artwork
 * (SVG/PNG), replace this component's contents with it; keep the dot colors
 * and layout unchanged, since this is SENSA's mark.
 */
const DOTS = [
  ['#EE3B1C', '#F77F00', '#FF8C7A'],
  ['#FFE27F', '#FFC54D', '#8FE6A2'],
  ['#2E55D6', '#BFE0FF', '#6B7FDE'],
];

// Clean sans-serif lettering, like SENSA's logo (SVG text defaults to serif).
const NAME_FONT = Platform.select({
  ios: 'Helvetica Neue',
  android: 'sans-serif-medium',
  default: 'Helvetica Neue, Helvetica, Arial, sans-serif',
});

export function SensaLogo({ width = 96, showName = true }: { width?: number; showName?: boolean }) {
  const { scheme } = useTheme();
  const height = showName ? width * 1.28 : width;
  const nameColor = scheme === 'dark' ? '#F3F0EB' : '#2B2B2B';
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 100 ${showName ? 128 : 100}`}
      accessibilityLabel="SENSA logo"
      accessibilityRole="image"
    >
      {DOTS.map((row, r) =>
        row.map((color, c) => <Circle key={`${r}-${c}`} cx={18 + c * 32} cy={18 + r * 32} r={13} fill={color} />),
      )}
      {showName ? (
        <SvgText
          x={50}
          y={122}
          fontSize={15}
          fontWeight="500"
          fontFamily={NAME_FONT}
          fill={nameColor}
          textAnchor="middle"
          letterSpacing={9}
        >
          SENSA
        </SvgText>
      ) : null}
    </Svg>
  );
}
