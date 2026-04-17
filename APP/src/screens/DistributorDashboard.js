import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Home, Menu, X, LogOut, User, Users,
  DollarSign, Target, Sun, Moon,
  ShoppingBag, BookUser, Zap,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { logout as logoutApi, getUser } from '../api/authService';
import DistributorOverview from './distributor/DistributorOverview';
import MyNetwork          from './distributor/MyNetwork';
import EarningsScreen     from './distributor/EarningsScreen';
import GoalsScreen        from './distributor/GoalsScreen';
import ProfileScreen      from './distributor/ProfileScreen';
import ProductsScreen     from './distributor/ProductsScreen';
import ContactsScreen     from './distributor/ContactsScreen';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 270;

// ─── Menu definition ──────────────────────────────────────────────────────────
const MENU = [
  { id: 'overview',  label: 'Overview',    icon: Home,       gradient: ['#6366F1','#818CF8'],  section: 'main' },
  { id: 'network',   label: 'My Network',  icon: Users,      gradient: ['#10B981','#34D399'],  section: 'main' },
  { id: 'contacts',  label: 'Contacts',    icon: BookUser,   gradient: ['#F59E0B','#FBBF24'],  section: 'main' },
  { id: 'products',  label: 'Products',    icon: ShoppingBag,gradient: ['#8B5CF6','#A78BFA'],  section: 'main' },
  { id: 'earnings',  label: 'Earnings',    icon: DollarSign, gradient: ['#EF4444','#F97316'],  section: 'finance' },
  { id: 'goals',     label: 'Goals',       icon: Target,     gradient: ['#EC4899','#F472B6'],  section: 'finance' },
  { id: 'profile',   label: 'Profile',     icon: User,       gradient: ['#3B82F6','#60A5FA'],  section: 'account' },
];

// ─── Bottom tab bar items (most-used) ────────────────────────────────────────
const TABS = [
  { id: 'overview',  icon: Home,       label: 'Home' },
  { id: 'contacts',  icon: BookUser,   label: 'Contacts' },
  { id: 'products',  icon: ShoppingBag,label: 'Products' },
  { id: 'earnings',  icon: DollarSign, label: 'Earnings' },
  { id: 'profile',   icon: User,       label: 'Profile' },
];

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ label, C }) => (
  <Text style={{
    fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.35)', paddingHorizontal: 14,
    marginTop: 20, marginBottom: 6,
  }}>
    {label}
  </Text>
);

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD SHELL
// ═════════════════════════════════════════════════════════════════════════════
const DistributorDashboard = ({ navigation }) => {
  const { isDark, toggleTheme, colors: C } = useTheme();
  const [active, setActive]           = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName]       = useState('');
  const slideAnim   = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Load user name from storage
  useEffect(() => {
    getUser().then(u => { if (u?.name) setUserName(u.name.split(' ')[0]); });
  }, []);

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim,   { toValue: 0,    useNativeDriver: false, bounciness: 3, speed: 14 }),
      Animated.timing(overlayAnim, { toValue: 0.6,  duration: 240, useNativeDriver: false }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.spring(slideAnim,   { toValue: -SIDEBAR_WIDTH, useNativeDriver: false, speed: 18 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => setSidebarOpen(false));
  };

  const navigate = (id) => { setActive(id); closeSidebar(); };
  const currentMenu = MENU.find(m => m.id === active);

  const handleLogout = async () => {
    await logoutApi();
    navigation.navigate('Login');
  };

  const renderContent = () => {
    switch (active) {
      case 'overview':  return <DistributorOverview C={C} />;
      case 'network':   return <MyNetwork C={C} />;
      case 'contacts':  return <ContactsScreen C={C} />;
      case 'products':  return <ProductsScreen C={C} />;
      case 'earnings':  return <EarningsScreen C={C} />;
      case 'goals':     return <GoalsScreen C={C} />;
      case 'profile':   return <ProfileScreen C={C} />;
      default:          return <DistributorOverview C={C} />;
    }
  };

  // Group menu by section
  const sections = [
    { key: 'main',    label: 'MAIN',    items: MENU.filter(m => m.section === 'main') },
    { key: 'finance', label: 'FINANCE', items: MENU.filter(m => m.section === 'finance') },
    { key: 'account', label: 'ACCOUNT', items: MENU.filter(m => m.section === 'account') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <LinearGradient colors={C.gradBg} style={{ flex: 1 }}>

        {/* ── Top Header ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingVertical: 12,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          {/* Hamburger */}
          <TouchableOpacity
            onPress={sidebarOpen ? closeSidebar : openSidebar}
            style={{
              width: 42, height: 42, borderRadius: 14,
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {sidebarOpen
              ? <X color={C.text} size={20} />
              : <Menu color={C.text} size={20} />}
          </TouchableOpacity>

          {/* Centre title with gradient icon */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LinearGradient
              colors={currentMenu?.gradient || ['#6366F1','#8B5CF6']}
              style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
            >
              {currentMenu && <currentMenu.icon color="#fff" size={16} />}
            </LinearGradient>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>
              {currentMenu?.label || 'Dashboard'}
            </Text>
          </View>

          {/* Right actions */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={{
                width: 38, height: 38, borderRadius: 12,
                backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isDark
                ? <Sun color="#F59E0B" size={17} />
                : <Moon color={C.muted} size={17} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                width: 38, height: 38, borderRadius: 12,
                backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <LogOut color={C.red} size={17} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Main Content ── */}
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14 }}>
          {renderContent()}
        </View>

        {/* ── Bottom Tab Bar ── */}
        <View style={{
          flexDirection: 'row', backgroundColor: C.surface,
          borderTopWidth: 1, borderTopColor: C.border,
          paddingBottom: 8, paddingTop: 8, paddingHorizontal: 4,
        }}>
          {TABS.map(tab => {
            const isActive = active === tab.id;
            const meta = MENU.find(m => m.id === tab.id);
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActive(tab.id)}
                activeOpacity={0.7}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
              >
                {isActive ? (
                  <LinearGradient
                    colors={meta?.gradient || ['#6366F1','#8B5CF6']}
                    style={{ width: 40, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}
                  >
                    <tab.icon color="#fff" size={16} />
                  </LinearGradient>
                ) : (
                  <View style={{ width: 40, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <tab.icon color={C.muted} size={18} />
                  </View>
                )}
                <Text style={{
                  fontSize: 10, fontWeight: isActive ? '800' : '500',
                  color: isActive ? C.accent : C.muted,
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Sidebar Overlay ── */}
        {sidebarOpen && (
          <Animated.View
            style={[{
              position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
              backgroundColor: '#000', zIndex: 10,
            }, { opacity: overlayAnim }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity style={{ flex: 1 }} onPress={closeSidebar} activeOpacity={1} />
          </Animated.View>
        )}

        {/* ── Sidebar Panel ── */}
        <Animated.View style={{
          position: 'absolute', top: 0, bottom: 0,
          width: SIDEBAR_WIDTH, left: slideAnim,
          zIndex: 20, elevation: 24,
          shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24,
        }}>
          <LinearGradient
            colors={isDark ? ['#080D1A', '#0D1321', '#111827'] : ['#FFFFFF', '#F1F5F9']}
            style={{ flex: 1 }}
          >
            {/* ── Sidebar Brand Header ── */}
            <LinearGradient
              colors={['#4338CA','#6366F1','#8B5CF6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, overflow: 'hidden' }}
            >
              {/* Decorative blob */}
              <View style={{ position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.07)' }} />
              <View style={{ position: 'absolute', left: 20, bottom: -30, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.05)' }} />

              {/* Avatar + brand */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 46, height: 46, borderRadius: 23,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
                  marginRight: 12,
                }}>
                  <User color="#fff" size={22} />
                </View>
                <View>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
                    {userName ? `Hi, ${userName}!` : 'NetGrow'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>
                    Distributor Portal
                  </Text>
                </View>
              </View>

              {/* Rank badge */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', marginTop: 16,
                backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12,
                paddingHorizontal: 12, paddingVertical: 8,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
              }}>
                <Zap color="#FCD34D" size={14} />
                <Text style={{ color: '#FCD34D', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>
                  ⭐ Silver Member
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Next: Gold →</Text>
              </View>
            </LinearGradient>

            {/* ── Menu sections ── */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {sections.map(section => (
                <View key={section.key}>
                  <SectionLabel label={section.label} C={C} />
                  {section.items.map(item => {
                    const isActive = active === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => navigate(item.id)}
                        activeOpacity={0.75}
                        style={{
                          flexDirection: 'row', alignItems: 'center',
                          marginHorizontal: 10, borderRadius: 14,
                          paddingHorizontal: 12, paddingVertical: 12,
                          marginBottom: 2,
                          backgroundColor: isActive
                            ? (isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.10)')
                            : 'transparent',
                          borderWidth: isActive ? 1 : 0,
                          borderColor: isActive ? 'rgba(99,102,241,0.3)' : 'transparent',
                        }}
                      >
                        {/* Icon */}
                        {isActive ? (
                          <LinearGradient
                            colors={item.gradient}
                            style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          >
                            <item.icon color="#fff" size={17} />
                          </LinearGradient>
                        ) : (
                          <View style={{
                            width: 36, height: 36, borderRadius: 11,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <item.icon color={C.muted} size={17} />
                          </View>
                        )}

                        {/* Label */}
                        <Text style={{
                          marginLeft: 12, fontSize: 14,
                          fontWeight: isActive ? '800' : '600',
                          color: isActive ? C.text : C.muted,
                          flex: 1,
                        }}>
                          {item.label}
                        </Text>

                        {/* Active dot */}
                        {isActive && (
                          <View style={{
                            width: 6, height: 6, borderRadius: 3,
                            backgroundColor: item.gradient[0],
                          }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* ── Sidebar Footer ── */}
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                flexDirection: 'row', alignItems: 'center',
                marginHorizontal: 12, marginBottom: 28,
                paddingHorizontal: 16, paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: 'rgba(239,68,68,0.08)',
                borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)',
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 11,
                backgroundColor: 'rgba(239,68,68,0.12)',
                alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                <LogOut color={C.red} size={17} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.red }}>Sign Out</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

      </LinearGradient>
    </SafeAreaView>
  );
};

export default DistributorDashboard;
