import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, Text} from 'react-native';
import {Button, List, Avatar, useTheme} from 'react-native-paper';
import {classRepository} from '../../services/database/classRepository';
import {Class} from '../../types/models';
import {attendanceRepository} from '../../services/database/attendanceRepository';
import StatCard from '../../components/analytics/StatCard';
import AttendanceChart from '../../components/analytics/AttendanceChart';

const HomeScreen = ({navigation}: any) => {
  const theme = useTheme();
  const [classes, setClasses] = useState<Class[]>([]);
  const [overallRate, setOverallRate] = useState(0);
  const [trendData, setTrendData] = useState<{date: string; rate: number}[]>(
    [],
  );

  useEffect(() => {
    const loadClasses = async () => {
      // Use getAll so classes appear for any user role (admin or teacher)
      const allClasses = await classRepository.getAll();
      console.log(
        '[HomeScreen] Loaded classes:',
        allClasses.length,
        allClasses.map(c => `${c.id}:${c.name}`),
      );
      setClasses(allClasses);

      if (allClasses.length > 0) {
        const trend = await attendanceRepository.getDailyAttendanceTrend(
          allClasses[0].id,
        );
        setTrendData(trend);
      }
    };

    const loadOverallStats = async () => {
      const allClasses = await classRepository.getAll();
      let totalPresent = 0;
      let totalRecords = 0;

      for (const cls of allClasses) {
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

    loadClasses();
    loadOverallStats();
  }, []);

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.colors.onSurface}]}>
          Attendance Mode
        </Text>
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
        <Text style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
          Your Classes
        </Text>
        {classes.map(cls => (
          <List.Item
            key={cls.id}
            title={cls.name}
            titleStyle={{color: theme.colors.onSurface}}
            description={`Grade: ${cls.grade || 'N/A'}`}
            descriptionStyle={{color: theme.colors.onSurfaceVariant}}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
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
    marginLeft: 8,
  },
  scanButton: {
    alignSelf: 'center',
  },
});

export default HomeScreen;
