export const colors = {
  background: '#F6F5F2',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEDE8',
  border: '#E3E0D8',
  text: '#1F2421',
  textMuted: '#71766F',
  textFaint: '#A2A69F',
  primary: '#2F6B4F',
  primarySoft: '#E2EFE7',
  accent: '#C2703D',
  accentSoft: '#F7E8DC',
  danger: '#B4473C',
  dangerSoft: '#F7E2DF',
  warning: '#A8721B',
  warningSoft: '#F6ECD8',
  scratch: '#6B5CA5',
  scratchSoft: '#ECE8F7',
  white: '#FFFFFF',
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
