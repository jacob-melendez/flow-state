import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

import { qrShape } from './qr';
import { useTheme } from './theme';

/** A scannable QR code for `value`, always dark on light so cameras can read it. */
export function QrCode({ value, size = 200, label }: { value: string; size?: number; label?: string }) {
  const { colors } = useTheme();
  const shape = useMemo(() => qrShape(value), [value]);
  // Whole pixels per module keep edges crisp (no faint seams between squares).
  const px = Math.max(1, Math.floor(size / shape.size)) * shape.size;
  return (
    <Svg
      width={px}
      height={px}
      viewBox={`0 0 ${shape.size} ${shape.size}`}
      accessibilityLabel={label ?? `QR code for ${value}`}
    >
      <Rect x={0} y={0} width={shape.size} height={shape.size} fill={colors.qrLight} />
      <Path d={shape.path} fill={colors.qrDark} />
    </Svg>
  );
}
