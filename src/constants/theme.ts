export const colors = {
  background: '#070A2A',
  surface: '#0D1645',
  surfaceMuted: '#151F5A',
  border: '#293B8A',
  text: '#FFF9E8',
  textMuted: '#B9C9F4',
  textFaint: '#8295D1',
  primary: '#39E6F2',
  primarySoft: '#123E69',
  accent: '#A855F7',
  accentSoft: '#321A68',
  danger: '#FF8FA3',
  dangerSoft: '#552342',
  warning: '#FFE7A3',
  warningSoft: '#514323',
  scratch: '#C58CFF',
  scratchSoft: '#30205F',
  white: '#FFF9E8',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const typography = {
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  section: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
};
