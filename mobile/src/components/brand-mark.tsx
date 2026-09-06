import { type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, type PathProps, type SvgProps } from 'react-native-svg';
import { colors, radii } from '@/constants/theme';

/** Keep path data in sync with assets/brand/shiheng-mark.svg */
const BOWL = 'M18 70 C18 58 32 55 46 55 C56 55 60 64 64 69 C68 64 72 55 82 55 C96 55 110 58 110 70 C110 96 86 112 64 113 C42 112 18 96 18 70 Z';
const INNER = 'M61.809 66.872 C66.345 74.131 62.049 84.999 52.214 91.145 C42.378 97.291 30.727 96.388 26.191 89.128 C21.655 81.869 25.951 71.001 35.786 64.855 C45.622 58.709 57.273 59.612 61.809 66.872 Z';
const LEAF = 'M83.25 21.979 C83.809 32.555 78.231 44.288 64.75 54.021 C66.439 37.48 73.811 26.783 83.25 21.979 Z';
const VEIN = 'M80.273 27.534 Q73.946 38.893 68.1 48.219';

type BrandMarkVariant = 'color' | 'inverse' | 'mono';

const palettes: Record<BrandMarkVariant, { bowl: string; inner: string; leaf: string; vein: string | null }> = {
  color: { bowl: '#2E7D5B', inner: '#A7C4A0', leaf: '#2E7D5B', vein: '#EBF3EA' },
  inverse: { bowl: '#FFFFFF', inner: '#E8F0EA', leaf: '#FFFFFF', vein: '#2E7D5B' },
  mono: { bowl: colors.ink, inner: colors.ink, leaf: colors.ink, vein: null },
};

// react-native-svg class components are not assignable to React 19's JSX element type.
const SvgMark = Svg as unknown as ComponentType<SvgProps>;
const SvgPath = Path as unknown as ComponentType<PathProps>;

export function BrandMark({
  size = 32,
  variant = 'color',
}: {
  size?: number;
  variant?: BrandMarkVariant;
}) {
  const palette = palettes[variant];
  return (
    <SvgMark width={size} height={size} viewBox="0 0 128 128" accessibilityLabel="食衡">
      <SvgPath d={BOWL} fill={palette.bowl} />
      <SvgPath d={INNER} fill={palette.inner} />
      <SvgPath d={LEAF} fill={palette.leaf} />
      {palette.vein ? (
        <SvgPath d={VEIN} fill="none" stroke={palette.vein} strokeWidth={1.7} strokeLinecap="round" />
      ) : null}
    </SvgMark>
  );
}

export function BrandMarkTile({
  size = 40,
  markSize,
}: {
  size?: number;
  markSize?: number;
}) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: Math.max(radii.sm, size * 0.28) }]}>
      <BrandMark size={markSize ?? Math.round(size * 0.72)} variant="inverse" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand, overflow: 'hidden' },
});
