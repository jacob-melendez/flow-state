export const colors = {
  background: '#F3F7FB',
  card: '#FFFFFF',
  text: '#0F1B2D',
  muted: '#5B6B7F',
  border: '#E1E8F0',
  primary: '#1A73E8',
  primaryDark: '#0B4FB3',
  primarySoft: '#E3EEFD',
  success: '#1E9E6A',
  successSoft: '#E2F5EC',
  warning: '#A15C00',
  warningSoft: '#FFF2DE',
  danger: '#B3261E',
  cardinal: '#8C1515',
  white: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const type = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  caption: { fontSize: 13, color: colors.muted },
};
