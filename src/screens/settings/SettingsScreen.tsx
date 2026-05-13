import React from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {Button, Card, SegmentedButtons, useTheme} from 'react-native-paper';
import {AuthService} from '../../services/auth/AuthService';
import {AppLanguage} from '../../services/i18n/i18n';
import {
  AppThemeMode,
  usePreferencesStore,
} from '../../store/usePreferencesStore';
import {useAuthStore} from '../../store/useAuthStore';
import {brand, shadow} from '../../theme/design';

const SettingsScreen = () => {
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  const language = usePreferencesStore(state => state.language);
  const themeMode = usePreferencesStore(state => state.themeMode);
  const setLanguage = usePreferencesStore(state => state.setLanguage);
  const setThemeMode = usePreferencesStore(state => state.setThemeMode);
  const t = usePreferencesStore(state => state.t);

  const handleLogout = () => {
    try {
      setTimeout(() => {
        AuthService.logout();
      }, 0);
    } catch (error) {
      Alert.alert(
        'Logout failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t('settings')}</Text>
        <Text style={styles.heroText}>
          {user?.name ?? 'User'} • {user?.role ?? 'profile'}
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>{t('language')}</Text>
          <SegmentedButtons
            value={language}
            onValueChange={value => setLanguage(value as AppLanguage)}
            buttons={[
              {value: 'en', label: 'English'},
              {value: 'fr', label: 'Français'},
            ]}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>{t('theme')}</Text>
          <SegmentedButtons
            value={themeMode}
            onValueChange={value => setThemeMode(value as AppThemeMode)}
            buttons={[
              {value: 'light', label: t('light')},
              {value: 'dark', label: t('dark')},
            ]}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Profile access</Text>
          <Text style={styles.helpText}>
            Teachers can scan attendance and manage enrolled students. Admins
            can also manage teachers and classes.
          </Text>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon="logout"
        onPress={handleLogout}
        style={styles.logout}
        contentStyle={styles.logoutContent}>
        {t('logout')}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16},
  hero: {
    backgroundColor: brand.blackNav,
    borderRadius: 34,
    padding: 24,
    marginBottom: 18,
    ...shadow.card,
  },
  heroTitle: {fontSize: 30, fontWeight: '900', color: '#FFFFFF'},
  heroText: {marginTop: 6, color: '#D7D7DF', fontWeight: '700'},
  card: {marginBottom: 16, borderRadius: 26, ...shadow.card},
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
    color: brand.ink,
  },
  helpText: {
    color: brand.muted,
    lineHeight: 20,
  },
  logout: {marginTop: 12, borderRadius: 18},
  logoutContent: {height: 52},
});

export default SettingsScreen;
