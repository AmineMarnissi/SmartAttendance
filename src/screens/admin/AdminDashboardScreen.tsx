import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, Text} from 'react-native';
import {Card, Button, List} from 'react-native-paper';
import {useAuthStore} from '../../store/useAuthStore';
import {AuthService} from '../../services/auth/AuthService';

import {attendanceRepository} from '../../services/database/attendanceRepository';
import StatCard from '../../components/analytics/StatCard';

const AdminDashboardScreen = ({navigation}: any) => {
  useAuthStore(state => state.user);
  const [stats, setStats] = useState({present: 0, absent: 0, total: 0});

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const rawStats = await attendanceRepository.getSchoolWideStats();
    let present = 0;
    let total = 0;
    rawStats.forEach((s: any) => {
      if (s.status === 'present' || s.status === 'late') {
        present += s.count;
      }
      total += s.count;
    });
    setStats({present, absent: total - present, total});
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Admin Panel</Text>
        <Button mode="outlined" onPress={() => AuthService.logout()}>
          Logout
        </Button>
      </View>

      <View style={styles.statGrid}>
        <StatCard
          title="School Rate"
          value={`${
            stats.total > 0
              ? Math.round((stats.present / stats.total) * 100)
              : 0
          }%`}
          color="#4CAF50"
        />
        <StatCard title="Total Records" value={stats.total} color="#FF9800" />
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('StudentEnrollment')}
              style={styles.actionBtn}>
              Enroll Student
            </Button>
            <Button
              mode="contained-tonal"
              onPress={() => navigation.navigate('Reports')}
              style={styles.actionBtn}>
              View Reports
            </Button>
          </View>
        </Card.Content>
      </Card>

      <List.Section>
        <Text style={styles.sectionTitle}>Management</Text>
        <List.Item
          title="Manage Classes"
          left={props => <List.Icon {...props} icon="google-classroom" />}
          onPress={() => {}}
        />
        <List.Item
          title="Manage Teachers"
          left={props => <List.Icon {...props} icon="account-group" />}
          onPress={() => {}}
        />
        <List.Item
          title="School Settings"
          left={props => <List.Icon {...props} icon="cog" />}
          onPress={() => {}}
        />
      </List.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  card: {
    marginBottom: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default AdminDashboardScreen;
