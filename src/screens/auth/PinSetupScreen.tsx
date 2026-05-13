import React, {useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {Button, RadioButton, Surface, TextInput} from 'react-native-paper';
import {AuthRole, AuthService} from '../../services/auth/AuthService';

const PinSetupScreen = ({navigation}: any) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<AuthRole>('teacher');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreateUser = async () => {
    if (!name.trim()) {
      Alert.alert('Nom manquant', "Entrez le nom de l'utilisateur.");
      return;
    }

    if (!/^\d{4,}$/.test(pin)) {
      Alert.alert('Code PIN invalide', 'Le code PIN doit contenir au moins 4 chiffres.');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('Les codes PIN ne correspondent pas', 'Le code PIN et la confirmation ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      await AuthService.setupPin(name, role, pin);
      Alert.alert('Utilisateur créé', 'Vous pouvez maintenant sélectionner l\'utilisateur et vous connecter.', [
        {text: 'OK', onPress: () => navigation.navigate('Login')},
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Impossible de créer l\'utilisateur', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <Text style={styles.title}>Créer un utilisateur</Text>
        <Text style={styles.subtitle}>
          Créez un compte administrateur ou enseignant, puis utilisez-le pour gérer les élèves et
          scanner les présences.
        </Text>

        <TextInput
          label="Nom complet"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          style={styles.input}
        />

        <Text style={styles.label}>Rôle</Text>
        <RadioButton.Group
          value={role}
          onValueChange={value => setRole(value as AuthRole)}>
          <RadioButton.Item label="Enseignant" value="teacher" />
          <RadioButton.Item label="Administrateur" value="admin" />
        </RadioButton.Group>

        <TextInput
          label="Code PIN"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          label="Confirmer le code PIN"
          value={confirmPin}
          onChangeText={setConfirmPin}
          secureTextEntry
          keyboardType="numeric"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleCreateUser}
          loading={saving}
          disabled={saving}
          style={styles.button}>
          Créer un utilisateur
        </Button>
        <Button onPress={() => navigation.navigate('Login')} disabled={saving}>
          Retour à la connexion
        </Button>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  surface: {
    padding: 20,
    borderRadius: 10,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    marginBottom: 14,
  },
  label: {
    fontWeight: '600',
    marginBottom: 4,
  },
  button: {
    marginTop: 10,
  },
});

export default PinSetupScreen;
