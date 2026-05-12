import React from 'react';
import {StyleSheet, View, ScrollView, Alert} from 'react-native';
import {useTheme, List, Divider, Button, Title, Switch} from 'react-native-paper';
import {useAuthStore} from '../../store/useAuthStore';
import {useThemeStore} from '../../store/useThemeStore';

const SettingsScreen = () => {
  const theme = useTheme();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const {isDarkMode, toggleTheme} = useThemeStore();

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      {text: 'Annuler', style: 'cancel'},
      {text: 'Déconnexion', onPress: logout, style: 'destructive'},
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.header}>
        <Title style={{color: theme.colors.onSurface}}>Paramètres</Title>
      </View>

      <List.Section>
        <List.Subheader>Compte</List.Subheader>
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
        <List.Subheader>Gestion</List.Subheader>
        <List.Item
          title="Gérer les Classes"
          left={props => <List.Icon {...props} icon="google-classroom" />}
          onPress={() => {}}
        />
        <List.Item
          title="Gérer les Enseignants"
          left={props => <List.Icon {...props} icon="account-group" />}
          onPress={() => {}}
        />
        <List.Item
          title="Paramètres de l'école"
          left={props => <List.Icon {...props} icon="school" />}
          onPress={() => {}}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Application</List.Subheader>
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

      <View style={styles.logoutContainer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          buttonColor={theme.colors.error}
          icon="logout"
          style={styles.logoutBtn}>
          Déconnexion
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  logoutContainer: {
    padding: 20,
    marginTop: 20,
  },
  logoutBtn: {
    borderRadius: 8,
  },
});

export default SettingsScreen;
