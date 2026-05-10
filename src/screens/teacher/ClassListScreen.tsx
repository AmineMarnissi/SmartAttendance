import React from 'react';
import {StyleSheet, View, Text} from 'react-native';

const ClassListScreen = () => (
  <View style={styles.container}>
    <Text>Class List Screen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ClassListScreen;
