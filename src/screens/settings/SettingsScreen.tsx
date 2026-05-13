import React from 'react';
import {StyleSheet, ScrollView, Alert} from 'react-native';
import {useTheme, List, Divider, Switch, IconButton} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/useAuthStore';
import {useThemeStore} from '../../store/useThemeStore';

const SettingsScreen = ({navigation}: any) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const Subheader = List.Subheader as React.ComponentType<any>;
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const {isDarkMode, toggleTheme} = useThemeStore();

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
    );
  }, [logout]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="logout"
          iconColor={theme.colors.error}
          size={24}
          onPress={handleLogout}
          style={styles.headerLogoutBtn}
        />
      ),
    });
  }, [navigation, theme, handleLogout]);

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={[
        styles.scrollContent,
        {paddingBottom: insets.bottom + 100},
      ]}>
      <List.Section>
        <Subheader>Compte</Subheader>
        <List.Item
          title={user?.name || 'Utilisateur'}
          description={user?.role === 'admin' ? 'Administrateur' : 'Enseignant'}
          left={props => <List.Icon {...props} icon="account-circle" />}
        />
        <List.Item
          title="Changer le PIN"
          left={props => <List.Icon {...props} icon="lock-reset" />}
          onPress={() => Alert.alert('Bientôt disponible', 'Le changement de PIN sera disponible dans la prochaine mise à jour.')}
        />
      </List.Section>

      <Divider />
      <List.Section>
        <Subheader>Gestion</Subheader>
        <List.Item
          title="Gérer les Classes"
          left={props => <List.Icon {...props} icon="google-classroom" />}
          onPress={() => navigation.navigate('ClassManagement')}
        />
        <List.Item
          title="Gérer les Enseignants"
          left={props => <List.Icon {...props} icon="account-group" />}
          onPress={() => navigation.navigate('TeacherManagement')}
        />
        <List.Item
          title="Paramètres de l'école"
          left={props => <List.Icon {...props} icon="school" />}
          onPress={() => navigation.navigate('SchoolSettings')}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <Subheader>Application</Subheader>
        <List.Item
          title="Mode Sombre"
          description={isDarkMode ? "Activé" : "Désactivé"}
          left={props => <List.Icon {...props} icon="brightness-6" />}
          right={() => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
          onPress={toggleTheme}
        />
        <List.Item
          title="Effacer la Base de Données"
          description="Supprimer toutes les données locales"
          left={props => <List.Icon {...props} icon="database-remove" color={theme.colors.error} />}
          onPress={() => Alert.alert('Avertissement', 'Cela supprimera tous les élèves et enregistrements. Continuer ?', [
            {text: 'Annuler'},
            {text: 'Tout supprimer', style: 'destructive'}
          ])}
        />
      </List.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    // Dynamically handled in the component
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerLogoutBtn: {
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default SettingsScreen;
