import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {theme} from '../theme/theme';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {TeacherTabParamList} from './types';

import HomeScreen from '../screens/teacher/HomeScreen';
import ScanScreen from '../screens/teacher/ScanScreen';
import ScanReviewScreen from '../screens/teacher/ScanReviewScreen';
import AttendanceHistoryScreen from '../screens/teacher/AttendanceHistoryScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import StudentListScreen from '../screens/admin/StudentListScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import StudentEnrollmentScreen from '../screens/enrollment/StudentEnrollmentScreen';
import FaceCaptureScreen from '../screens/enrollment/FaceCaptureScreen';

const TeacherTab = createBottomTabNavigator<TeacherTabParamList>();
const TeacherStack = createStackNavigator();
const AdminStack = createStackNavigator();
const RootStack = createStackNavigator();

const tabIcons: Record<keyof TeacherTabParamList, string> = {
  TeacherHome: 'clipboard-check-outline',
  Classes: 'account-group-outline',
  History: 'history',
  Settings: 'cog-outline',
};

const AdminNavigator = () => (
  <AdminStack.Navigator>
    <AdminStack.Screen
      name="AdminDashboard"
      component={AdminDashboardScreen}
      options={{title: 'Admin Dashboard'}}
    />
    <AdminStack.Screen
      name="StudentList"
      component={StudentListScreen}
      options={{title: 'Students'}}
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

const AttendanceStack = () => (
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
      options={{title: 'Review Attendance'}}
    />
  </TeacherStack.Navigator>
);

const MainTabs = () => (
  <TeacherTab.Navigator
    screenOptions={({route}) => ({
      tabBarIcon: ({color, size}) => (
        <MaterialCommunityIcons
          name={tabIcons[route.name]}
          color={color}
          size={size}
        />
      ),
    })}>
    <TeacherTab.Screen
      name="TeacherHome"
      component={AttendanceStack}
      options={{title: 'Attendance', headerShown: false}}
    />
    <TeacherTab.Screen
      name="Classes"
      component={AdminNavigator}
      options={{title: 'Students', headerShown: false}}
    />
    <TeacherTab.Screen name="History" component={AttendanceHistoryScreen} />
    <TeacherTab.Screen name="Settings" component={SettingsScreen} />
  </TeacherTab.Navigator>
);

const AppNavigator = () => (
  <NavigationContainer theme={theme}>
    <RootStack.Navigator screenOptions={{headerShown: false}}>
      <RootStack.Screen name="Main" component={MainTabs} />
    </RootStack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
