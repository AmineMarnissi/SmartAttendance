import React, {useCallback, useState} from 'react';
import {Alert, Keyboard, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Avatar,
  Button,
  Card,
  Chip,
  TextInput,
  useTheme,
} from 'react-native-paper';
import {userRepository} from '../../services/database/userRepository';
import {AuthService} from '../../services/auth/AuthService';
import {User} from '../../types/models';
import {usePreferencesStore} from '../../store/usePreferencesStore';
import BrandLogo from '../../components/ui/BrandLogo';
import {brand, shadow} from '../../theme/design';

const LoginScreen = ({navigation}: any) => {
  const theme = useTheme();
  const t = usePreferencesStore(state => state.t);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await userRepository.getAll();
      setUsers(allUsers);
      if (selectedUser && !allUsers.some(user => user.id === selectedUser.id)) {
        setSelectedUser(null);
        setPin('');
      }
    } catch (error) {
      Alert.alert(
        'Could not load users',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedUser]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers]),
  );

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    Keyboard.dismiss();

    if (!selectedUser || !pin) {
      Alert.alert('Error', 'Please select a user and enter PIN');
      return;
    }

    setLoading(true);
    try {
      const success = await AuthService.login(selectedUser.name, pin);
      if (!success) {
        Alert.alert('Error', 'Invalid PIN');
      }
    } catch (error) {
      Alert.alert(
        'Login failed',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.coralHeader}>
        <View style={styles.blobOne} />
        <View style={styles.blobTwo} />
        <BrandLogo inverted size={74} />
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={[styles.cardTitle, {color: theme.colors.onSurface}]}>
            {' '}
            {selectedUser ? t('welcomeBack') : t('selectUser')}
          </Text>
          <Text style={styles.cardSubtitle}>
            Admin and teacher profiles are separated for secure classroom
            management.
          </Text>

          {!selectedUser ? (
            <>
              {loadingUsers ? (
                <Text style={styles.emptyText}>Loading users…</Text>
              ) : (
                users.map(user => (
                  <Card
                    key={user.id}
                    mode="outlined"
                    style={styles.userCard}
                    onPress={() => setSelectedUser(user)}>
                    <Card.Content style={styles.userRow}>
                      <Avatar.Icon
                        icon={
                          user.role === 'admin' ? 'shield-star' : 'account-tie'
                        }
                        size={46}
                        style={styles.avatar}
                      />
                      <View style={styles.userText}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Chip compact style={styles.roleChip}>
                          {user.role === 'admin' ? t('admin') : t('teacher')}
                        </Chip>
                      </View>
                    </Card.Content>
                  </Card>
                ))
              )}
              <Button
                mode="contained"
                onPress={() => navigation.navigate('PinSetup')}
                style={styles.primaryButton}
                contentStyle={styles.buttonContent}>
                {t('createUser')}
              </Button>
            </>
          ) : (
            <>
              <Card mode="outlined" style={styles.selectedCard}>
                <Card.Content style={styles.userRow}>
                  <Avatar.Icon
                    icon={
                      selectedUser.role === 'admin'
                        ? 'shield-star'
                        : 'account-tie'
                    }
                    size={46}
                    style={styles.avatar}
                  />
                  <View style={styles.userText}>
                    <Text style={styles.userName}>{selectedUser.name}</Text>
                    <Chip compact style={styles.roleChip}>
                      {selectedUser.role === 'admin'
                        ? t('admin')
                        : t('teacher')}
                    </Chip>
                  </View>
                </Card.Content>
              </Card>
              <TextInput
                label={t('pin')}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={styles.input}
                mode="outlined"
              />
              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.primaryButton}
                contentStyle={styles.buttonContent}>
                {t('login')}
              </Button>
              <Button
                onPress={() => {
                  setSelectedUser(null);
                  setPin('');
                }}
                disabled={loading}
                textColor={brand.primary}>
                {t('selectUser')}
              </Button>
            </>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  coralHeader: {
    height: 310,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 46,
    borderBottomRightRadius: 46,
    overflow: 'hidden',
  },
  blobOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -40,
    right: -30,
  },
  blobTwo: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255,255,255,0.10)',
    bottom: -80,
    left: -60,
  },
  card: {
    marginHorizontal: 20,
    marginTop: -38,
    borderRadius: 32,
    ...shadow.card,
  },
  cardTitle: {fontSize: 24, fontWeight: '900', letterSpacing: -0.5},
  cardSubtitle: {
    color: brand.muted,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 19,
  },
  userCard: {marginBottom: 10, borderRadius: 22, backgroundColor: '#FFF7F7'},
  selectedCard: {
    marginBottom: 14,
    borderRadius: 22,
    backgroundColor: '#FFF7F7',
  },
  userRow: {flexDirection: 'row', alignItems: 'center'},
  avatar: {backgroundColor: brand.primarySoft},
  userText: {marginLeft: 12, flex: 1},
  userName: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
    color: brand.ink,
  },
  roleChip: {alignSelf: 'flex-start', backgroundColor: '#FFE2E4'},
  emptyText: {textAlign: 'center', color: brand.muted, marginVertical: 20},
  input: {marginBottom: 12},
  primaryButton: {marginTop: 8, borderRadius: 18},
  buttonContent: {height: 52},
});

export default LoginScreen;
