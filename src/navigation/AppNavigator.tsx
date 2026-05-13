import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from 'react-native-paper';
import {useAuthStore} from '../store/useAuthStore';
import {usePreferencesStore} from '../store/usePreferencesStore';

import LoginScreen from '../screens/auth/LoginScreen';
import PinSetupScreen from '../screens/auth/PinSetupScreen';
import HomeScreen from '../screens/teacher/HomeScreen';
import ScanScreen from '../screens/teacher/ScanScreen';
import ScanReviewScreen from '../screens/teacher/ScanReviewScreen';
import AttendanceHistoryScreen from '../screens/teacher/AttendanceHistoryScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminManagementScreen from '../screens/admin/AdminManagementScreen';
import ClassAttendanceMatrixScreen from '../screens/admin/ClassAttendanceMatrixScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import StudentEnrollmentScreen from '../screens/enrollment/StudentEnrollmentScreen';
import FaceCaptureScreen from '../screens/enrollment/FaceCaptureScreen';

const RootStack = createStackNavigator();
const AuthStack = createStackNavigator();
const StudentStack = createStackNavigator();
const AttendanceStackNav = createStackNavigator();
const AdminTab = createBottomTabNavigator();
const TeacherTab = createBottomTabNavigator();

const AttendanceStack = () => {
  const t = usePreferencesStore(state => state.t);
  return (
    <AttendanceStackNav.Navigator>
      <AttendanceStackNav.Screen
        name="Home"
        component={HomeScreen}
        options={{headerShown: false}}
      />
      <AttendanceStackNav.Screen
        name="Scan"
        component={ScanScreen}
        options={{headerShown: false}}
      />
      <AttendanceStackNav.Screen
        name="ScanReview"
        component={ScanReviewScreen}
        options={{title: t('reviewAttendance')}}
      />
    </AttendanceStackNav.Navigator>
  );
};

const StudentRosterStack = () => {
  const t = usePreferencesStore(state => state.t);
  return (
    <StudentStack.Navigator>
      <StudentStack.Screen
        name="StudentRoster"
        component={AdminDashboardScreen}
        options={{title: t('students')}}
      />
      <StudentStack.Screen
        name="StudentEnrollment"
        component={StudentEnrollmentScreen}
        options={{title: t('enrollStudent')}}
      />
      <StudentStack.Screen
        name="FaceCapture"
        component={FaceCaptureScreen}
        options={{headerShown: false}}
      />
      <StudentStack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{title: t('reports')}}
      />
    </StudentStack.Navigator>
  );
};

const screenOptions =
  (icons: Record<string, string>) =>
  ({route}: any) => ({
    tabBarIcon: ({color, size}: any) => (
      <MaterialCommunityIcons
        name={icons[route.name] ?? 'circle'}
        color={color}
        size={size}
      />
    ),
    tabBarStyle: {
      borderTopWidth: 0,
      elevation: 12,
      height: 64,
      paddingBottom: 8,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontWeight: '700' as const,
    },
  });

const AdminTabs = () => {
  const t = usePreferencesStore(state => state.t);
  return (
    <AdminTab.Navigator
      screenOptions={screenOptions({
        Dashboard: 'view-dashboard-outline',
        Manage: 'account-cog-outline',
        Matrix: 'table-account',
        Settings: 'cog-outline',
      })}>
      <AdminTab.Screen
        name="Dashboard"
        component={StudentRosterStack}
        options={{title: t('students'), headerShown: false}}
      />
      <AdminTab.Screen
        name="Manage"
        component={AdminManagementScreen}
        options={{title: t('manageSchool')}}
      />
      <AdminTab.Screen
        name="Matrix"
        component={ClassAttendanceMatrixScreen}
        options={{title: t('attendanceMatrix')}}
      />
      <AdminTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: t('settings')}}
      />
    </AdminTab.Navigator>
  );
};

const TeacherTabs = () => {
  const t = usePreferencesStore(state => state.t);
  return (
    <TeacherTab.Navigator
      screenOptions={screenOptions({
        Attendance: 'clipboard-check-outline',
        Students: 'school-outline',
        Matrix: 'table-account',
        History: 'history',
        Settings: 'cog-outline',
      })}>
      <TeacherTab.Screen
        name="Attendance"
        component={AttendanceStack}
        options={{title: t('scan'), headerShown: false}}
      />
      <TeacherTab.Screen
        name="Students"
        component={StudentRosterStack}
        options={{title: t('students'), headerShown: false}}
      />
      <TeacherTab.Screen
        name="Matrix"
        component={ClassAttendanceMatrixScreen}
        options={{title: t('attendanceMatrix')}}
      />
      <TeacherTab.Screen
        name="History"
        component={AttendanceHistoryScreen}
        options={{title: t('history')}}
      />
      <TeacherTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: t('settings')}}
      />
    </TeacherTab.Navigator>
  );
};

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{headerShown: false}}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="PinSetup" component={PinSetupScreen} />
  </AuthStack.Navigator>
);

const AppNavigator = () => {
  const theme = useTheme();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const rootKey = !isAuthenticated
    ? 'auth'
    : user?.role === 'admin'
    ? 'admin'
    : 'teacher';

  return (
    <NavigationContainer
      theme={{
        dark: theme.dark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.onSurface,
          border: theme.colors.outline,
          notification: theme.colors.error,
        },
      }}>
      <RootStack.Navigator key={rootKey} screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : user?.role === 'admin' ? (
          <RootStack.Screen name="Admin" component={AdminTabs} />
        ) : (
          <RootStack.Screen name="Teacher" component={TeacherTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
