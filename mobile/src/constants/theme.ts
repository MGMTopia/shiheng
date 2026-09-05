export const colors = {
  background: '#F4F7F1', surface: '#FFFFFF', surfaceMuted: '#EEF3EA', ink: '#1B2A22', inkMuted: '#6B786F',
  brand: '#1F5C40', brandDark: '#163F2C', brandSoft: '#E4EFE6', amber: '#B66A12', amberSoft: '#FFF1D8',
  red: '#B6463A', redSoft: '#FBE6E3', blue: '#2E668C', blueSoft: '#E3EFF7', border: '#E0E6DE', white: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { sm: 12, md: 20, lg: 28, pill: 999 } as const;
export const shadows = {
  card: { shadowColor: '#163F2C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 2 },
} as const;

// Compatibility aliases retained for the optional Expo template helpers that remain in the project.
export const Colors = {
  light: { text: colors.ink, background: colors.background, backgroundElement: colors.surfaceMuted, backgroundSelected: colors.brandSoft, textSecondary: colors.inkMuted },
  dark: { text: colors.white, background: colors.ink, backgroundElement: colors.brandDark, backgroundSelected: colors.brand, textSecondary: colors.border },
} as const;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const Fonts = { sans: 'system-ui', serif: 'serif', rounded: 'system-ui', mono: 'monospace' } as const;
export const MaxContentWidth = 800;
export const BottomTabInset = 80;
