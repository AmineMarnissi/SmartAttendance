import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {Button, useTheme} from 'react-native-paper';
import BrandLogo from './BrandLogo';
import {brand} from '../../theme/design';

type SplashScreenProps = {
  status: 'initializing' | 'error';
  message?: string;
  onRetry?: () => void;
};

const SplashScreen = ({status, message, onRetry}: SplashScreenProps) => {
  const theme = useTheme();
  const isError = status === 'error';

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: isError ? theme.colors.background : brand.primary},
      ]}>
      <View style={styles.decorOne} />
      <View style={styles.decorTwo} />
      <BrandLogo inverted={!isError} size={96} />
      {isError ? (
        <>
          <Text style={[styles.errorTitle, {color: theme.colors.error}]}>
            Startup failed
          </Text>
          <Text
            style={[styles.errorText, {color: theme.colors.onSurfaceVariant}]}>
            {message}
          </Text>
          <Button mode="contained" onPress={onRetry} style={styles.retryButton}>
            Retry
          </Button>
        </>
      ) : (
        <>
          <ActivityIndicator
            color="#FFFFFF"
            size="large"
            style={styles.loader}
          />
          <Text style={styles.loadingText}>
            Preparing your smart classroom…
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    overflow: 'hidden',
  },
  decorOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: -60,
    right: -40,
  },
  decorTwo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.10)',
    bottom: -100,
    left: -80,
  },
  loader: {marginTop: 30},
  loadingText: {
    marginTop: 16,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  errorTitle: {fontSize: 24, fontWeight: '900', marginTop: 24},
  errorText: {marginTop: 12, textAlign: 'center'},
  retryButton: {marginTop: 22, borderRadius: 18},
});

export default SplashScreen;
