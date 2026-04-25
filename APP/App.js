import './global.css';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/screens/LoginScreen';
import OwnerDashboard from './src/screens/OwnerDashboard';
import DistributorDashboard from './src/screens/DistributorDashboard';
import RegistrationScreen from './src/screens/RegistrationScreen';
import CustomerPayScreen from './src/screens/CustomerPayScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Stack = createStackNavigator();

function AppNavigator() {
  const { isDark } = useTheme();
  return (
    <>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegistrationScreen} />
          <Stack.Screen name="OwnerDashboard" component={OwnerDashboard} />
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
