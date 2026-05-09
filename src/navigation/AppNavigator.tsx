import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  RootStackParamList,
  AuthStackParamList,
  TeacherTabParamList,
} from './types';
import {useAuthStore} from '../store/useAuthStore';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import PinSetupScreen from '../screens/auth/PinSetupScreen';

// Teacher Screens
import HomeScreen from '../screens/teacher/HomeScreen';
import ClassListScreen from '../screens/teacher/ClassListScreen';
import ScanScreen from '../screens/teacher/ScanScreen';
import ScanReviewScreen from '../screens/teacher/ScanReviewScreen';
import AttendanceHistoryScreen from '../screens/teacher/AttendanceHistoryScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import StudentEnrollmentScreen from '../screens/enrollment/StudentEnrollmentScreen';
import FaceCaptureScreen from '../screens/enrollment/FaceCaptureScreen';

const AuthStack = createStackNavigator<AuthStackParamList>();
const TeacherTab = createBottomTabNavigator<TeacherTabParamList>();
const TeacherStack = createStackNavigator();
const AdminStack = createStackNavigator();
const RootStack = createStackNavigator<RootStackParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{headerShown: false}}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="PinSetup" component={PinSetupScreen} />
  </AuthStack.Navigator>
);

const AdminNavigator = () => (
  <AdminStack.Navigator>
    <AdminStack.Screen
      name="AdminDashboard"
      component={AdminDashboardScreen}
      options={{title: 'Admin Dashboard'}}
    />
    <AdminStack.Screen
      name="StudentEnrollment"
      component={StudentEnrollmentScreen}
      options={{title: 'Enroll Student'}}
    />
    <AdminStack.Screen
      name="FaceCapture"
      component={FaceCaptureScreen}
      options={{headerShown: false}}
    />
    <AdminStack.Screen name="Reports" component={ReportsScreen} />
  </AdminStack.Navigator>
);

const TeacherHomeStack = () => (
  <TeacherStack.Navigator>
    <TeacherStack.Screen
      name="Home"
      component={HomeScreen}
      options={{headerShown: false}}
    />
    <TeacherStack.Screen
      name="Scan"
      component={ScanScreen}
      options={{headerShown: false}}
    />
    <TeacherStack.Screen
      name="ScanReview"
      component={ScanReviewScreen}
      options={{title: 'Review'}}
    />
  </TeacherStack.Navigator>
);

const TeacherNavigator = () => (
  <TeacherTab.Navigator>
    <TeacherTab.Screen
      name="TeacherHome"
      component={TeacherHomeStack}
      options={{title: 'Home', headerShown: false}}
    />
    <TeacherTab.Screen name="Classes" component={ClassListScreen} />
    <TeacherTab.Screen name="History" component={AttendanceHistoryScreen} />
    <TeacherTab.Screen name="Settings" component={SettingsScreen} />
  </TeacherTab.Navigator>
);

const AppNavigator = () => {
  const {isAuthenticated, user} = useAuthStore(state => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
  }));

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : user?.role === 'admin' ? (
          <RootStack.Screen name="Admin" component={AdminNavigator} />
        ) : (
          <RootStack.Screen name="Teacher" component={TeacherNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
