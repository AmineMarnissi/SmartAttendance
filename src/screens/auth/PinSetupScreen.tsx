import React, {useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {
  Button,
  Card,
  RadioButton,
  TextInput,
  useTheme,
} from 'react-native-paper';
import {AuthRole, AuthService} from '../../services/auth/AuthService';
import {usePreferencesStore} from '../../store/usePreferencesStore';
import BrandLogo from '../../components/ui/BrandLogo';
import {brand, shadow} from '../../theme/design';

const PinSetupScreen = ({navigation}: any) => {
  const theme = useTheme();
  const t = usePreferencesStore(state => state.t);
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
      Alert.alert(
        'Could not create user',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <BrandLogo size={70} />
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>{t('createUser')}</Text>
          <Text style={styles.subtitle}>
            Create admin or teacher profiles with a secure PIN.
          </Text>

          <TextInput
            label={t('fullName')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            style={styles.input}
            mode="outlined"
          />

          <Text style={styles.label}>Role</Text>
          <RadioButton.Group
            value={role}
            onValueChange={value => setRole(value as AuthRole)}>
            <View style={styles.roleRow}>
              <RadioButton.Item label={t('teacher')} value="teacher" />
              <RadioButton.Item label={t('admin')} value="admin" />
            </View>
          </RadioButton.Group>

          <TextInput
            label={t('pin')}
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />
          <TextInput
            label="Confirm PIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            secureTextEntry
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />

          <Button
            mode="contained"
            onPress={handleCreateUser}
            loading={saving}
            disabled={saving}
            style={styles.button}
            contentStyle={styles.buttonContent}>
            {t('save')}
          </Button>
          <Button
            onPress={() => navigation.navigate('Login')}
            disabled={saving}
            textColor={brand.primary}>
            {t('login')}
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', padding: 20},
  card: {marginTop: 22, borderRadius: 32, ...shadow.card},
  title: {fontSize: 25, fontWeight: '900', textAlign: 'center'},
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    color: brand.muted,
    textAlign: 'center',
  },
  input: {marginBottom: 12},
  label: {fontWeight: '800', marginBottom: 4, color: brand.ink},
  roleRow: {backgroundColor: '#FFF3F3', borderRadius: 18, marginBottom: 12},
  button: {marginTop: 8, borderRadius: 18},
  buttonContent: {height: 52},
});

export default PinSetupScreen;
