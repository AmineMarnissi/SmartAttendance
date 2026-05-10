import React, {useCallback, useState} from 'react';
import {View, StyleSheet, Alert, Text} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {TextInput, Button, List, Surface} from 'react-native-paper';
import {userRepository} from '../../services/database/userRepository';
import {AuthService} from '../../services/auth/AuthService';
import {User} from '../../types/models';

const LoginScreen = ({navigation}: any) => {
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
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Could not load users', message);
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
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setPin('');
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <Text style={styles.title}>SmartAttendance</Text>

        {!selectedUser ? (
          <List.Section>
            <Text style={styles.sectionTitle}>Select User</Text>

            {loadingUsers ? (
              <Text style={styles.emptyText}>Loading users…</Text>
            ) : users.length === 0 ? (
              <Text style={styles.emptyText}>
                No users found. Create an admin or teacher account to start.
              </Text>
            ) : (
              users.map(user => (
                <List.Item
                  key={user.id}
                  title={user.name}
                  description={user.role}
                  left={props => <List.Icon {...props} icon="account" />}
                  onPress={() => setSelectedUser(user)}
                />
              ))
            )}

            <Button
              mode={users.length === 0 ? 'contained' : 'outlined'}
              onPress={() => navigation.navigate('PinSetup')}
              style={styles.button}>
              Create User
            </Button>
            <Button onPress={loadUsers} disabled={loadingUsers}>
              Refresh Users
            </Button>
          </List.Section>
        ) : (
          <View>
            <List.Item
              title={selectedUser.name}
              description={selectedUser.role}
              left={props => <List.Icon {...props} icon="account" />}
              right={props => <List.Icon {...props} icon="close" />}
              onPress={clearSelectedUser}
            />
            <TextInput
              label="Enter PIN"
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="numeric"
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}>
              Login
            </Button>
            <Button onPress={clearSelectedUser} disabled={loading}>
              Choose Different User
            </Button>
          </View>
        )}
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
    elevation: 4,
    borderRadius: 10,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 28,
    fontWeight: '700',
  },
  input: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
  },
});

export default LoginScreen;
