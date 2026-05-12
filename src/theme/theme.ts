import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';

const { DarkTheme, LightTheme } = adaptNavigationTheme({
  reactNavigationDark: NavigationDarkTheme,
  reactNavigationLight: NavigationDefaultTheme,
});

export const darkTheme = {
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

export const lightTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
    primary: '#0056b3', 
    secondary: '#009688', 
    tertiary: '#673ab7', 
    background: '#F5F5F5', 
    surface: '#FFFFFF', 
    error: '#B00020',
    text: '#000000',
    onSurface: '#000000',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: '#f0f0f0',
      level2: '#e8e8e8',
      level3: '#e0e0e0',
    },
  },
};

// Default export for backwards compatibility
export const theme = darkTheme;
