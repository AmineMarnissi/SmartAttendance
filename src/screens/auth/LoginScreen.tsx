import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Alert, Text} from 'react-native';
import {TextInput, Button, List, Surface} from 'react-native-paper';
import {userRepository} from '../../services/database/userRepository';
import {AuthService} from '../../services/auth/AuthService';
import {User} from '../../types/models';

const LoginScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const allUsers = await userRepository.getAll();
    setUsers(allUsers);
  };

  const handleLogin = async () => {
    if (!selectedUser || !pin) {
      Alert.alert('Error', 'Please select a user and enter PIN');
      return;
    }

    setLoading(true);
    const success = await AuthService.login(selectedUser.name, pin);
    setLoading(false);

    if (!success) {
      Alert.alert('Error', 'Invalid PIN');
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <Text style={styles.title}>SmartAttendance</Text>

        {!selectedUser ? (
          <List.Section>
            <Text style={styles.sectionTitle}>Select User</Text>
            {users.map(user => (
              <List.Item
                key={user.id}
                title={user.name}
                description={user.role}
                left={props => <List.Icon {...props} icon="account" />}
                onPress={() => setSelectedUser(user)}
              />
            ))}
          </List.Section>
        ) : (
          <View>
            <List.Item
              title={selectedUser.name}
              description={selectedUser.role}
              left={props => <List.Icon {...props} icon="account" />}
              right={props => <List.Icon {...props} icon="close" />}
              onPress={() => setSelectedUser(null)}
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
  button: {
    marginTop: 10,
  },
});

export default LoginScreen;
