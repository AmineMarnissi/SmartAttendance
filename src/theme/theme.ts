import { MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';
import { DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

const { DarkTheme } = adaptNavigationTheme({
  reactNavigationDark: NavigationDarkTheme,
});

export const theme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
    primary: '#00D1FF', // Bleu électrique premium
    secondary: '#00F5D4', // Émeraude
    tertiary: '#9B5DE5', // Violet
    background: '#121212', // Fond noir profond
    surface: '#1E1E1E', // Cartes et surfaces
    error: '#FF5252',
    text: '#FFFFFF',
    onSurface: '#FFFFFF',
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: '#242424',
      level2: '#2C2C2C',
      level3: '#363636',
    },
  },
};
