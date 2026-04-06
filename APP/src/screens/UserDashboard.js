import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  TrendingUp,
  LogOut,
  CreditCard,
  Target,
  Users,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const UserDashboard = ({ navigation }) => {
  const { isDark, toggleTheme, colors: C } = useTheme();

  const stats = [
    { icon: Target,     color: C.amber,  label: 'Directs',   value: '8'    },
    { icon: Users,      color: C.blue,   label: 'Team Size', value: '42'   },
    { icon: CreditCard, color: C.green,  label: 'Earnings',  value: '$2.4k' },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }}>
      <LinearGradient colors={C.gradBg} className="flex-1">

        {/* Header */}
        <View className="flex-row justify-between items-center px-6 pt-8 pb-5">
          <View>
            <Text className="text-2xl font-bold" style={{ color: C.text }}>Member Portal</Text>
            <Text className="text-sm mt-1" style={{ color: C.muted }}>Welcome to the Network</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 10 }}>
            {/* Theme Toggle */}
            <TouchableOpacity
              onPress={toggleTheme}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}
            >
              {isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color={C.muted} size={18} />}
            </TouchableOpacity>
            {/* Logout */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}
            >
              <LogOut color={C.red} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}>

          {/* User Card */}
          <View
            className="rounded-3xl p-5 mb-6"
            style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}
          >
            <View className="flex-row items-center">
              <View
                className="w-14 h-14 rounded-full items-center justify-center"
                style={{ backgroundColor: C.accentLight }}
              >
                <User color={C.accent} size={28} />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-xl font-bold" style={{ color: C.text }}>Mikiyas</Text>
                <Text className="text-sm mt-0.5" style={{ color: C.muted }}>Standard Member</Text>
              </View>
              <View className="px-3 py-1 rounded-lg" style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
                <Text className="text-xs font-bold" style={{ color: C.green }}>ACTIVE</Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View className="flex-row justify-between mb-6">
            {stats.map((s, i) => (
              <View
                key={i}
                className="items-center rounded-2xl p-4"
                style={{ width: (width - 64) / 3, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
              >
                <s.icon color={s.color} size={24} />
                <Text className="text-lg font-bold mt-2" style={{ color: C.text }}>{s.value}</Text>
                <Text className="text-xs mt-0.5" style={{ color: C.muted }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Call to Action */}
          <TouchableOpacity className="rounded-2xl overflow-hidden mb-6">
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="p-6 flex-row justify-between items-center"
            >
              <View>
                <Text className="text-white text-lg font-bold">Network Growth</Text>
                <Text className="text-white/70 text-sm mt-1">Invite new members to grow</Text>
              </View>
              <TrendingUp color="#FFFFFF" size={28} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Info Cards */}
          {[
            { label: 'My Rank',        value: 'Silver',    color: C.amber  },
            { label: 'Pending Bonus',  value: '$320',      color: C.green  },
            { label: 'Next Goal',      value: '50 members',color: C.purple },
          ].map((item, i) => (
            <View
              key={i}
              className="flex-row justify-between items-center rounded-2xl px-5 py-4 mb-3"
              style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
            >
              <Text className="text-base font-medium" style={{ color: C.text }}>{item.label}</Text>
              <Text className="text-base font-bold" style={{ color: item.color }}>{item.value}</Text>
            </View>
          ))}

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default UserDashboard;
