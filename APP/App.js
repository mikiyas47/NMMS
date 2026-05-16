import './global.css';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/LoginScreen';
import DistributorDashboard from './src/screens/DistributorDashboard';
import RegistrationScreen from './src/screens/RegistrationScreen';
import CustomerPayScreen from './src/screens/CustomerPayScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { startKeepAlive, stopKeepAlive } from './src/api/authService';

import * as Linking from 'expo-linking';

const Stack = createStackNavigator();

const linking = {
  prefixes: [Linking.createURL('/'), 'nmms-app://'],
  config: {
    screens: {
      CustomerPay: 'pay',
    },
  },
};

function AppNavigator() {
  const { isDark } = useTheme();
  const [initialRoute, setInitialRoute] = useState(null); // null = loading

  useEffect(() => {
    startKeepAlive();
    // Check if user is already logged in — skip login screen if token exists
    AsyncStorage.getItem('authToken').then(token => {
      setInitialRoute(token ? 'UserDashboard' : 'Login');
    }).catch(() => setInitialRoute('Login'));

    return () => stopKeepAlive();
  }, []);

  // Show a minimal splash while checking auth state (< 100ms)
  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0F1E', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6366F1" size="large" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer linking={linking}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegistrationScreen} />
          <Stack.Screen name="UserDashboard" component={DistributorDashboard} />
          {/* ── Independent customer payment page ── */}
          <Stack.Screen name="CustomerPay" component={CustomerPayScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
