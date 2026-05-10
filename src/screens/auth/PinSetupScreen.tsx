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
      Alert.alert('Missing name', 'Enter the user name.');
      return;
    }

    if (!/^\d{4,}$/.test(pin)) {
      Alert.alert('Invalid PIN', 'PIN must contain at least 4 digits.');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('PIN mismatch', 'PIN and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await AuthService.setupPin(name, role, pin);
      Alert.alert('User created', 'You can now select the user and log in.', [
        {text: 'OK', onPress: () => navigation.navigate('Login')},
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Could not create user', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <Text style={styles.title}>Create User</Text>
        <Text style={styles.subtitle}>
          Create an admin or teacher account, then use it to manage students and
          scan attendance.
        </Text>

        <TextInput
          label="Full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          style={styles.input}
        />

        <Text style={styles.label}>Role</Text>
        <RadioButton.Group
          value={role}
          onValueChange={value => setRole(value as AuthRole)}>
          <RadioButton.Item label="Teacher" value="teacher" />
          <RadioButton.Item label="Admin" value="admin" />
        </RadioButton.Group>

        <TextInput
          label="PIN"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          label="Confirm PIN"
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
          Create User
        </Button>
        <Button onPress={() => navigation.navigate('Login')} disabled={saving}>
          Back to Login
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
