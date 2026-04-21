import React, { useState } from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Lock, ArrowRight, TrendingUp, Sun, Moon, Eye, EyeOff } from 'lucide-react-native';
import { login as loginApi } from '../api/authService';
import { useTheme } from '../context/ThemeContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isDark, toggleTheme, colors: C } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      const role = data.user.role;
      if (role === 'owner') {
        navigation.replace('OwnerDashboard');
      } else {
        // Admin and other roles go to UserDashboard (DistributorDashboard)
        // Note: Mobile app doesn't have a separate AdminDashboard like the web frontend
        navigation.replace('UserDashboard');
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Invalid login details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1">
        <LinearGradient colors={C.gradBrand} className="flex-1">

          {/* Theme Toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            className="absolute top-12 right-5 z-10 w-10 h-10 rounded-full items-center justify-center bg-white/15"
          >
            {isDark
              ? <Sun color="#F59E0B" size={20} />
              : <Moon color="#FFFFFF" size={20} />}
          </TouchableOpacity>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-1 px-6 justify-center items-center">

              {/* Logo */}
              <View className="items-center mb-10">
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4 bg-white/12 border border-white/20"
                >
                  <TrendingUp color="#F59E0B" size={40} />
                </View>
                <Text className="text-3xl font-bold text-white tracking-widest">NetGrow</Text>
                <Text className="text-sm text-gray-300 mt-1 opacity-80">Network Marketing Management</Text>
              </View>

              {/* Card */}
              <View
                className="w-full rounded-3xl p-8 shadow-2xl"
                style={{ backgroundColor: C.surface }}
              >
                <Text className="text-2xl font-bold mb-1" style={{ color: C.text }}>Welcome Back</Text>
                <Text className="text-sm mb-6" style={{ color: C.muted }}>Sign in to your account</Text>

                {/* Email Input */}
                <View
                  className="flex-row items-center rounded-xl mb-4 px-4 h-14"
                  style={{ backgroundColor: C.inputBg }}
                >
                  <User color={C.muted} size={20} />
                  <TextInput
                    placeholder="Email or Username"
                    placeholderTextColor={C.muted}
                    className="flex-1 ml-3 text-base"
                    style={{ color: C.text }}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                {/* Password Input */}
                <View
                  className="flex-row items-center rounded-xl mb-4 px-4 h-14"
                  style={{ backgroundColor: C.inputBg }}
                >
                  <Lock color={C.muted} size={20} />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor={C.muted}
                    className="flex-1 ml-3 text-base"
                    style={{ color: C.text }}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
                    {showPassword ? <EyeOff color={C.muted} size={20} /> : <Eye color={C.muted} size={20} />}
                  </TouchableOpacity>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity className="self-end mb-6">
                  <Text className="text-sm font-semibold" style={{ color: C.accent }}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  className="w-full h-14 rounded-xl overflow-hidden"
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#6366F1', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="flex-1 flex-row justify-center items-center"
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text className="text-white text-lg font-bold mr-3 tracking-widest">LOGIN</Text>
                        <ArrowRight color="#FFFFFF" size={20} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View className="flex-row mt-8">
                <Text className="text-sm text-gray-300">Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text className="text-sm font-bold text-yellow-400">Join the Network</Text>
                </TouchableOpacity>
              </View>

            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default LoginScreen;
