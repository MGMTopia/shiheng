export const colors = {
  background: '#F5EEDC', surface: '#FFFFFF', surfaceMuted: '#EBF3EA', ink: '#1F2D26', inkMuted: '#5C6B64',
  brand: '#2E7D5B', brandDark: '#1F4F3A', brandSoft: '#EBF3EA', amber: '#B66A12', amberSoft: '#FFF1D8',
  red: '#B6463A', redSoft: '#FBE6E3', blue: '#2E668C', blueSoft: '#E3EFF7', border: '#E4E4D4', white: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { sm: 12, md: 20, lg: 28, pill: 999 } as const;
export const shadows = {
  card: { shadowColor: '#163F2C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 2 },
} as const;

