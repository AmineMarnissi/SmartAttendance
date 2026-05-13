import {MD3DarkTheme, MD3LightTheme} from 'react-native-paper';
import {brand} from './design';

export const modernLightTheme = {
  ...MD3LightTheme,
  roundness: 22,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    secondary: '#111827',
    tertiary: '#FFB3B7',
    background: brand.cream,
    surface: brand.surface,
    surfaceVariant: brand.primarySoft,
    onSurface: brand.ink,
    onSurfaceVariant: brand.muted,
    outline: '#F4C5C8',
    elevation: {...MD3LightTheme.colors.elevation, level1: brand.surface},
  },
};

export const modernDarkTheme = {
  ...MD3DarkTheme,
  roundness: 22,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FF7479',
    secondary: '#F8FAFC',
    tertiary: '#FDBA74',
    background: '#090A12',
    surface: '#15151F',
    surfaceVariant: '#26151A',
    onSurface: '#FFF8EA',
    onSurfaceVariant: '#C7C8D2',
    outline: '#3A2630',
  },
};
