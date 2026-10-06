import { TextStyle } from 'react-native';

export const colors = {
  // Primary
  primary: '#4edea3',
  onPrimary: '#003824',
  primaryContainer: '#10b981',
  onPrimaryContainer: '#00422b',
  primaryFixed: '#6ffbbe',
  primaryFixedDim: '#4edea3',
  onPrimaryFixed: '#002113',
  onPrimaryFixedVariant: '#005236',
  inversePrimary: '#006c49',

  // Secondary
  secondary: '#95d3ba',
  onSecondary: '#003829',
  secondaryContainer: '#0b513d',
  onSecondaryContainer: '#83c2a9',
  secondaryFixed: '#b0f0d6',
  secondaryFixedDim: '#95d3ba',
  onSecondaryFixed: '#002117',
  onSecondaryFixedVariant: '#0b513d',

  // Tertiary
  tertiary: '#45dfa4',
  onTertiary: '#003825',
  tertiaryContainer: '#00b982',
  onTertiaryContainer: '#00422c',
  tertiaryFixed: '#68fcbf',
  tertiaryFixedDim: '#45dfa4',
  onTertiaryFixed: '#002114',
  onTertiaryFixedVariant: '#005137',

  // Surface & Background
  background: '#101418',
  onBackground: '#e0e3e8',
  surface: '#101418',
  surfaceDim: '#101418',
  surfaceBright: '#363a3e',
  surfaceContainerLowest: '#0b0f13',
  surfaceContainerLow: '#181c20',
  surfaceContainer: '#1c2024',
  surfaceContainerHigh: '#262a2f',
  surfaceContainerHighest: '#31353a',
  surfaceVariant: '#31353a',
  onSurface: '#e0e3e8',
  onSurfaceVariant: '#bbcabf',
  surfaceTint: '#4edea3',
  inverseSurface: '#e0e3e8',
  inverseOnSurface: '#2d3135',

  // Outline & Error
  outline: '#86948a',
  outlineVariant: '#3c4a42',
  error: '#ffb4ab',
  errorText: '#BA1A1A',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
} as const;

export type ThemeColor = keyof typeof colors;

/**
 * Converted from rem to unitless pixels (1rem = 16px)
 */
export const spacing = {
  xs: 4,      // 0.25rem
  sm: 8,      // 0.5rem
  md: 16,     // 1rem
  lg: 24,     // 1.5rem
  xl: 42,     // 2.25rem
  xxl: 80,    // 5rem
  margin: 20, // 1.25rem
  marginTop: 60, // 1.25rem
  gutter: 16, // 1rem
} as const;

export const borderRadius = {
  DEFAULT: 4, // 0.25rem
  lg: 8,      // 0.5rem
  xl: 12,     // 0.75rem
  full: 9999,
} as const;

/**
 * Note: Ensure you load the exact font weights via expo-font or react-native-asset.
 * On Android/iOS, custom fonts often require weight-specific family names
 * (e.g., 'PlusJakartaSans-Bold') depending on your font setup.
 */
export const fontFamilies = {
  jakarta: 'Plus Jakarta Sans',
  inter: 'Inter',
} as const;

export const typography: Record<string, TextStyle> = {
  headlineXl: {
    fontFamily: fontFamilies.jakarta,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1.2, // -0.03em * 40
    fontWeight: '700',
  },
  headlineXlMobile: {
    fontFamily: fontFamilies.jakarta,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.8, // -0.025em * 32
    fontWeight: '700',
  },
  headlineLg: {
    fontFamily: fontFamilies.jakarta,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.64, // -0.02em * 32
    fontWeight: '600',
  },
  headlineLgMobile: {
    fontFamily: fontFamilies.jakarta,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.52, // -0.02em * 26
    fontWeight: '600',
  },
  headlineMd: {
    fontFamily: fontFamilies.jakarta,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.33, // -0.015em * 22
    fontWeight: '600',
  },
  headlineSm: {
    fontFamily: fontFamilies.jakarta,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.18, // -0.01em * 18
    fontWeight: '600',
  },
  metricDisplay: {
    fontFamily: fontFamilies.jakarta,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -1.08, // -0.03em * 36
    fontWeight: '700',
  },
  metricDisplayMobile: {
    fontFamily: fontFamilies.jakarta,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.7, // -0.025em * 28
    fontWeight: '700',
  },
  bodyLg: {
    fontFamily: fontFamilies.inter,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16, // -0.01em * 16
    fontWeight: '400',
  },
  bodyMd: {
    fontFamily: fontFamilies.inter,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    fontWeight: '400',
  },
  bodySm: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.12, // 0.01em * 12
    fontWeight: '400',
  },
  labelLg: {
    fontFamily: fontFamilies.inter,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14, // 0.01em * 14
    fontWeight: '600',
  },
  labelMd: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.24, // 0.02em * 12
    fontWeight: '500',
  },
  labelSm: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6, // 0.06em * 10
    fontWeight: '600',
  },
} as const;

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontFamilies,
  typography,
} as const;

export type AppTheme = typeof theme;
export default theme;