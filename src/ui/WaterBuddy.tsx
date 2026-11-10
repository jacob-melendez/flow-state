import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';

import { BuddyMood, buddyState } from '../domain/buddy';

/**
 * The buddy keeps its own colors in light and dark mode (like an emoji), so it
 * always reads as a cheerful water droplet.
 */
const BUDDY = {
  body: '#E3F4F7',
  water: '#36AFC7',
  outline: '#007C92',
  face: '#11343B',
  cheek: '#F2A1A1',
  shine: '#FFFFFF',
  sparkle: '#F4B860',
};

// Droplet shape in a 100×100 box.
const DROPLET = 'M50 8 C50 8 18 44 18 64 A32 32 0 0 0 82 64 C82 44 50 8 50 8 Z';

function Face({ mood }: { mood: BuddyMood }) {
  const eye = (cx: number) => (
    <G key={cx}>
      <Ellipse cx={cx} cy={60} rx={2.8} ry={3.8} fill={BUDDY.face} />
      <Circle cx={cx + 0.9} cy={58.6} r={0.9} fill={BUDDY.shine} />
    </G>
  );
  const stroke = { stroke: BUDDY.face, strokeWidth: 2.4, strokeLinecap: 'round' as const, fill: 'none' };

  switch (mood) {
    case 'thirsty':
      return (
        <G>
          {/* droopy eyes, little frown, and a sweat drop */}
          <Path d="M37 60 q4 2.5 8 0" {...stroke} />
          <Path d="M55 60 q4 2.5 8 0" {...stroke} />
          <Path d="M45 75 q5 -4 10 0" {...stroke} />
          <Path d="M70 50 q2.5 4 0 6 q-2.5 -2 0 -6 Z" fill={BUDDY.water} />
        </G>
      );
    case 'okay':
      return (
        <G>
          {eye(42)}
          {eye(58)}
          <Path d="M45 71 q5 4 10 0" {...stroke} />
        </G>
      );
    case 'happy':
      return (
        <G>
          {eye(42)}
          {eye(58)}
          <Circle cx={35} cy={68} r={3.5} fill={BUDDY.cheek} opacity={0.6} />
          <Circle cx={65} cy={68} r={3.5} fill={BUDDY.cheek} opacity={0.6} />
          <Path d="M42 69 q8 8 16 0" {...stroke} />
        </G>
      );
    case 'thrilled':
      return (
        <G>
          {/* ^ ^ eyes and a big open grin */}
          <Path d="M38 61 q4 -5 8 0" {...stroke} />
          <Path d="M54 61 q4 -5 8 0" {...stroke} />
          <Circle cx={34} cy={68} r={3.8} fill={BUDDY.cheek} opacity={0.7} />
          <Circle cx={66} cy={68} r={3.8} fill={BUDDY.cheek} opacity={0.7} />
          <Path d="M41 68 q9 13 18 0 Z" fill={BUDDY.face} />
          <Path d="M46 73.5 q4 3 8 0" fill={BUDDY.cheek} />
        </G>
      );
  }
}

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <Path
      d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`}
      fill={BUDDY.sparkle}
    />
  );
}

/**
 * A droplet character that grows, fills with water and cheers up as cups are
 * logged. `size` is its size at the goal; it starts at about half that.
 */
export function WaterBuddy({ cups, goal, size = 160 }: { cups: number; goal: number; size?: number }) {
  const state = buddyState(cups, goal);
  const [scale] = useState(() => new Animated.Value(state.scale));
  const first = useRef(true);
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Pop a little bigger, then settle at the new size.
    Animated.sequence([
      Animated.timing(scale, { toValue: state.scale * 1.12, duration: 140, useNativeDriver }),
      Animated.spring(scale, { toValue: state.scale, friction: 4, tension: 120, useNativeDriver }),
    ]).start();
  }, [state.scale, scale, useNativeDriver]);

  // Water surface: a gentle wave across the droplet at the current fill level.
  const top = 96 - state.fill * 88;
  const wave = `M-10 ${top} Q2.5 ${top - 3} 15 ${top} T40 ${top} T65 ${top} T90 ${top} T115 ${top} V110 H-10 Z`;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Water buddy, ${state.mood}: ${state.caption}`}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={{ width: size, height: size, transform: [{ scale }] }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <ClipPath id="buddy-body">
              <Path d={DROPLET} />
            </ClipPath>
          </Defs>
          <Path d={DROPLET} fill={BUDDY.body} />
          <G clipPath="url(#buddy-body)">
            <Path d={wave} fill={BUDDY.water} opacity={0.75} />
          </G>
          <Path d={DROPLET} fill="none" stroke={BUDDY.outline} strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={36} cy={44} rx={4.5} ry={9} fill={BUDDY.shine} opacity={0.75} transform="rotate(-25 36 44)" />
          <Face mood={state.mood} />
          {state.mood === 'thrilled' ? (
            <G>
              <Sparkle x={14} y={30} s={6} />
              <Sparkle x={86} y={22} s={5} />
              <Sparkle x={90} y={60} s={4} />
            </G>
          ) : null}
        </Svg>
      </Animated.View>
    </View>
  );
}
