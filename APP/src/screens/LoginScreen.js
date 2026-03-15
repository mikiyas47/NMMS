import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Lock, ArrowRight, Share2, TrendingUp } from 'lucide-react-native';
import { login as loginApi } from '../api/authService';
import { Alert, ActivityIndicator } from 'react-native';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const data = await loginApi(email, password);
      console.log('Login successful:', data);
      
      const role = data.user.role;
      if (role === 'admin') {
        navigation.replace('AdminDashboard');
      } else {
        navigation.replace('UserDashboard');
      }
    } catch (error) {
      const message = error.message || 'Invalid login details';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#1E3A8A', '#1E40AF', '#111827']}
          style={styles.background}
        >
          <View style={styles.content}>
            {/* Logo and Branding */}
            <View style={styles.logoContainer}>
              <View style={styles.iconCircle}>
                <TrendingUp color="#F59E0B" size={40} />
              </View>
              <Text style={styles.brandTitle}>NetGrow</Text>
              <Text style={styles.brandSubtitle}>Network Marketing Management</Text>
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardInfo}>Sign in to your account</Text>

              <View style={styles.inputContainer}>
                <User color="#6B7280" size={20} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email or Username"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock color="#6B7280" size={20} style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={styles.forgotPass}>
                <Text style={styles.forgotPassText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.loginButton} 
                onPress={handleLogin}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#0D9488', '#0F766E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>LOGIN</Text>
                      <ArrowRight color="#FFFFFF" size={20} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signUpText}>Join the Network</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 5,
    opacity: 0.8,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotPassText: {
    color: '#0D9488',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    height: 55,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 30,
  },
  footerText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  signUpText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
