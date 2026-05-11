import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {useTheme} from 'react-native-paper';

const SettingsScreen = () => {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text style={{color: theme.colors.onSurface}}>Settings Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SettingsScreen;
