import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Home,
  Menu,
  X,
  LogOut,
  User,
  Users,
  DollarSign,
  Target,
  TrendingUp,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { logout as logoutApi } from '../api/authService';
import DistributorOverview from './distributor/DistributorOverview';
import MyNetwork from './distributor/MyNetwork';
import EarningsScreen from './distributor/EarningsScreen';
import GoalsScreen from './distributor/GoalsScreen';
import ProfileScreen from './distributor/ProfileScreen';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 260;

// ─── Sidebar menu items ───────────────────────────────────────────
const MENU = [
  { id: 'overview', label: 'Overview', icon: Home, gradient: ['#6366F1', '#818CF8'] },
  { id: 'network', label: 'My Network', icon: Users, gradient: ['#10B981', '#34D399'] },
  { id: 'earnings', label: 'Earnings', icon: DollarSign, gradient: ['#F59E0B', '#FCD34D'] },
  { id: 'goals', label: 'Goals', icon: Target, gradient: ['#EC4899', '#F472B6'] },
  { id: 'profile', label: 'Profile', icon: User, gradient: ['#3B82F6', '#60A5FA'] },
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN DISTRIBUTOR DASHBOARD (Sidebar Shell)
// ═══════════════════════════════════════════════════════════════════
const DistributorDashboard = ({ navigation }) => {
  const { isDark, toggleTheme, colors: C } = useTheme();
  const [active, setActive] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: false, bounciness: 4 }),
      Animated.timing(overlayAnim, { toValue: 0.55, duration: 250, useNativeDriver: false }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: -SIDEBAR_WIDTH, useNativeDriver: false }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => setSidebarOpen(false));
  };

  const navigate = (id) => { setActive(id); closeSidebar(); };
  const currentMenu = MENU.find(m => m.id === active);

  const renderContent = () => {
    switch (active) {
      case 'overview':
        return <DistributorOverview C={C} />;
      case 'network':
        return <MyNetwork C={C} />;
      case 'earnings':
        return <EarningsScreen C={C} />;
      case 'goals':
        return <GoalsScreen C={C} />;
      case 'profile':
        return <ProfileScreen C={C} />;
      default:
        return <DistributorOverview C={C} />;
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <LinearGradient colors={C.gradBg} className="flex-1">

        {/* ── Top Header ── */}
        <View
          className="flex-row items-center justify-between px-4 py-3"
          style={{ borderBottomWidth: 1, borderBottomColor: C.border }}
        >
          {/* Hamburger */}
          <TouchableOpacity
            onPress={sidebarOpen ? closeSidebar : openSidebar}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}
          >
            {sidebarOpen ? <X color={C.text} size={22} /> : <Menu color={C.text} size={22} />}
          </TouchableOpacity>

          {/* Title */}
          <View className="flex-row items-center">
            <LinearGradient colors={currentMenu?.gradient || [C.accent, C.purple]} className="w-8 h-8 rounded-lg items-center justify-center mr-2">
              {currentMenu && <currentMenu.icon color="#fff" size={16} />}
            </LinearGradient>
            <Text className="text-base font-bold" style={{ color: C.text }}>{currentMenu?.label || 'Dashboard'}</Text>
          </View>

          {/* Right Actions */}
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {/* Theme toggle */}
            <TouchableOpacity
              onPress={toggleTheme}
              className="w-9 h-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}
            >
              {isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color={C.muted} size={18} />}
            </TouchableOpacity>
            {/* Logout */}
            <TouchableOpacity
              onPress={async () => {
                              await logoutApi();
                              navigation.navigate('Login');
                            }}
              className="w-9 h-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}
            >
              <LogOut color={C.red} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Main Content ── */}
        <View className="flex-1 px-4 pt-3">
          {renderContent()}
        </View>

        {/* ── Sidebar Overlay ── */}
        {sidebarOpen && (
          <Animated.View
            style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#000', zIndex: 10 }, { opacity: overlayAnim }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity style={{ flex: 1 }} onPress={closeSidebar} activeOpacity={1} />
          </Animated.View>
        )}

        {/* ── Sidebar Panel ── */}
        <Animated.View
          style={{
            position: 'absolute', top: 0, bottom: 0,
            width: SIDEBAR_WIDTH, left: slideAnim,
            zIndex: 20, elevation: 20,
            shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20,
          }}
        >
          <LinearGradient
            colors={isDark ? ['#0F1629', '#161D35'] : ['#FFFFFF', '#F8FAFC']}
            className="flex-1"
          >
            {/* Brand */}
            <LinearGradient colors={['#6366F1', '#8B5CF6']} className="px-5 pb-6" style={{ paddingTop: 50 }} start={[0, 0]} end={[1, 1]}>
              <View className="flex-row items-center">
                <View className="w-11 h-11 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <User color="#fff" size={22} />
                </View>
                <View>
                  <Text className="text-white text-lg font-bold">NetGrow</Text>
                  <Text className="text-white/70 text-xs">Distributor Portal</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Menu */}
            <ScrollView className="flex-1 px-3 pt-4" showsVerticalScrollIndicator={false}>
              <Text className="text-xs font-bold mb-2 px-2" style={{ color: C.muted }}>NAVIGATION</Text>
              {MENU.map(item => {
                const isActive = active === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => navigate(item.id)}
                    className="flex-row items-center rounded-xl px-3 py-3 mb-1"
                    style={{
                      backgroundColor: isActive ? C.accentLight : 'transparent',
                      borderWidth: isActive ? 1 : 0,
                      borderColor: isActive ? C.accent : 'transparent',
                    }}
                    activeOpacity={0.75}
                  >
                    {isActive ? (
                      <LinearGradient colors={item.gradient} className="w-9 h-9 rounded-xl items-center justify-center" start={[0, 0]} end={[1, 1]}>
                        <item.icon color="#fff" size={18} />
                      </LinearGradient>
                    ) : (
                      <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: C.card }}>
                        <item.icon color={C.muted} size={18} />
                      </View>
                    )}
                    <Text
                      className="ml-3 text-sm font-semibold flex-1"
                      style={{ color: isActive ? C.text : C.muted }}
                    >
                      {item.label}
                    </Text>
                    {isActive && <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.accent }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <TouchableOpacity
              onPress={async () => {
                              await logoutApi();
                              navigation.navigate('Login');
                            }}
              className="flex-row items-center px-5 py-5 mx-3 mb-4 rounded-xl"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}
            >
              <LogOut color={C.red} size={18} />
              <Text className="ml-3 text-sm font-semibold" style={{ color: C.red }}>Sign Out</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

      </LinearGradient>
    </SafeAreaView>
  );
};

export default DistributorDashboard;
