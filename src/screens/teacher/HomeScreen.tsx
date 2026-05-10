import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, Text} from 'react-native';
import {Button, List, Avatar} from 'react-native-paper';
import {useAuthStore} from '../../store/useAuthStore';
import {classRepository} from '../../services/database/classRepository';
import {Class} from '../../types/models';
import {attendanceRepository} from '../../services/database/attendanceRepository';
import StatCard from '../../components/analytics/StatCard';
import AttendanceChart from '../../components/analytics/AttendanceChart';

const HomeScreen = ({navigation}: any) => {
  const user = useAuthStore(state => state.user);
  const [classes, setClasses] = useState<Class[]>([]);
  const [overallRate, setOverallRate] = useState(0);
  const [trendData, setTrendData] = useState<{date: string; rate: number}[]>(
    [],
  );

  useEffect(() => {
    const loadClasses = async () => {
      const teacherClasses = await classRepository.getByTeacher(user.id);
      setClasses(teacherClasses);

      if (teacherClasses.length > 0) {
        const trend = await attendanceRepository.getDailyAttendanceTrend(
          teacherClasses[0].id,
        );
        setTrendData(trend);
      }
    };

    const loadOverallStats = async () => {
      const teacherClasses = await classRepository.getByTeacher(user.id);
      let totalPresent = 0;
      let totalRecords = 0;

      for (const cls of teacherClasses) {
        const stats = await attendanceRepository.getClassAttendanceStats(
          cls.id,
        );
        stats.forEach((s: any) => {
          if (s.status === 'present' || s.status === 'late') {
            totalPresent += s.count;
          }
          totalRecords += s.count;
        });
      }

      setOverallRate(
        totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
      );
    };

    if (user) {
      loadClasses();
      loadOverallStats();
    }
  }, [user]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Mode</Text>
      </View>

      <View style={styles.statGrid}>
        <StatCard
          title="Overall Rate"
          value={`${overallRate}%`}
          color="#4CAF50"
        />
        <StatCard
          title="Total Classes"
          value={classes.length}
          color="#2196F3"
        />
      </View>

      {trendData.length > 0 && (
        <AttendanceChart data={trendData} title="Class Attendance Trend" />
      )}

      <List.Section>
        <Text style={styles.sectionTitle}>Your Classes</Text>
        {classes.map(cls => (
          <List.Item
            key={cls.id}
            title={cls.name}
            description={`Grade: ${cls.grade || 'N/A'}`}
            left={props => <Avatar.Icon {...props} icon="book" size={40} />}
            right={() => (
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Scan', {classId: cls.id})}
                style={styles.scanButton}>
                Scan
              </Button>
            )}
          />
        ))}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  card: {
    marginBottom: 20,
  },
  scanButton: {
    alignSelf: 'center',
  },
});

export default HomeScreen;
