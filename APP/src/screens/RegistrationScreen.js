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
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Mail, Phone, Lock, ArrowRight, TrendingUp, ChevronLeft, Sun, Moon, Eye, EyeOff } from 'lucide-react-native';
import { register as registerApi } from '../api/authService';
import { useTheme } from '../context/ThemeContext';

const Field = ({ icon: Icon, placeholder, value, onChangeText, keyboard, secure, C, showPassword, setShowPassword, error }) => (
  <View className="mb-4">
    <View
      className="flex-row items-center rounded-xl px-4 h-14"
      style={{
        backgroundColor: C.inputBg,
        borderWidth: error ? 1 : 0,
        borderColor: error ? '#EF4444' : 'transparent',
      }}
    >
      <Icon color={error ? '#EF4444' : C.muted} size={20} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        className="flex-1 ml-3 text-base"
        style={{ color: C.text }}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard || 'default'}
        secureTextEntry={secure && !showPassword}
        autoCapitalize="none"
      />
      {secure && (
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
          {showPassword ? <EyeOff color={C.muted} size={20} /> : <Eye color={C.muted} size={20} />}
        </TouchableOpacity>
      )}
    </View>
    {error ? <Text className="text-xs mt-1 ml-1" style={{ color: '#EF4444' }}>{error}</Text> : null}
  </View>
);

const RegistrationScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const { isDark, toggleTheme, colors: C } = useTheme();

  // Prevent numbers from being typed in the name field
  const handleNameChange = (text) => {
    const lettersOnly = text.replace(/[^A-Za-z\s]/g, '');
    setName(lettersOnly);
    if (lettersOnly.trim().length > 0) {
      setErrors((prev) => ({ ...prev, name: null }));
    }
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (text.trim().length > 0) {
      setErrors((prev) => ({ ...prev, email: null }));
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (text.length >= 8) {
      setErrors((prev) => ({ ...prev, password: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required.';
    } else if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      newErrors.name = 'Name must contain letters only.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email (e.g. user@example.com).';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await registerApi({ name, email, phone, password });
      Alert.alert('Success', 'Account created successfully! Please login.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      if (error.errors) {
        const firstError = Object.values(error.errors)[0][0];
        Alert.alert('Registration Failed', firstError);
      } else {
        Alert.alert('Registration Failed', error.message || 'Registration failed.');
      }
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
            className="absolute top-12 right-5 z-10 w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            {isDark ? <Sun color="#F59E0B" size={20} /> : <Moon color="#FFFFFF" size={20} />}
          </TouchableOpacity>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, alignItems: 'center' }}
              showsVerticalScrollIndicator={false}
            >
              {/* Back button */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="self-start w-10 h-10 rounded-full items-center justify-center mb-5"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
              >
                <ChevronLeft color="#FFFFFF" size={24} />
              </TouchableOpacity>

              {/* Header */}
              <View className="items-center mb-8">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  <TrendingUp color="#F59E0B" size={32} />
                </View>
                <Text className="text-2xl font-bold text-white tracking-wider">Join NetGrow</Text>
                <Text className="text-sm text-gray-300 mt-1 opacity-80">Start your network marketing journey</Text>
              </View>

              {/* Form Card */}
              <View className="w-full rounded-3xl p-7 shadow-2xl" style={{ backgroundColor: C.surface }}>
                <Text className="text-xl font-bold text-center mb-6" style={{ color: C.text }}>Create Account</Text>

                <Field icon={User}  placeholder="Full Name"       value={name}     onChangeText={handleNameChange}     C={C} error={errors.name} />
                <Field icon={Mail}  placeholder="Email Address"   value={email}    onChangeText={handleEmailChange}    keyboard="email-address" C={C} error={errors.email} />
                <Field icon={Phone} placeholder="Phone Number"    value={phone}    onChangeText={(t) => { setPhone(t); setErrors((p) => ({ ...p, phone: null })); }} keyboard="phone-pad" C={C} error={errors.phone} />
                <Field icon={Lock}  placeholder="Create Password" value={password} onChangeText={handlePasswordChange} secure C={C} showPassword={showPassword} setShowPassword={setShowPassword} error={errors.password} />

                <TouchableOpacity
                  className="w-full h-14 rounded-xl overflow-hidden mt-2"
                  onPress={handleRegister}
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
                        <Text className="text-white text-base font-bold mr-3 tracking-widest">REGISTER NOW</Text>
                        <ArrowRight color="#FFFFFF" size={20} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View className="flex-row mt-8">
                <Text className="text-sm text-gray-300">Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text className="text-sm font-bold text-yellow-400">Sign In</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default RegistrationScreen;
