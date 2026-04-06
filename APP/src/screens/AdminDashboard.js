import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TextInput,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  BarChart2,
  Package,
  FileText,
  Home,
  Menu,
  X,
  LogOut,
  Bell,
  ShieldCheck,
  DollarSign,
  Activity,
  TrendingUp,
  ChevronRight,
  UserPlus,
  Search,
  Plus,
  Eye,
  Check,
  AlertCircle,
  Star,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = 260;
const API_BASE = 'https://nmms-backend.onrender.com/api';

// ─── Colour palette ───────────────────────────────────────────────
const C = {
  bg: '#0A0F1E',
  surface: '#111827',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  accent: '#6366F1',
  accentLight: 'rgba(99,102,241,0.15)',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  text: '#F9FAFB',
  muted: '#6B7280',
  sub: '#9CA3AF',
};

// ─── Sidebar menu items ───────────────────────────────────────────
const MENU = [
  { id: 'overview',   label: 'Overview',        icon: Home,     gradient: ['#6366F1','#818CF8'] },
  { id: 'admins',     label: 'Admins',          icon: ShieldCheck, gradient: ['#3B82F6','#60A5FA'] },
  { id: 'prospects',  label: 'View Prospects',  icon: Users,    gradient: ['#10B981','#34D399'] },
  { id: 'product',    label: 'Add Product',     icon: Package,  gradient: ['#F59E0B','#FCD34D'] },
  { id: 'report',     label: 'Report',          icon: BarChart2,gradient: ['#EC4899','#F472B6'] },
];

// ═══════════════════════════════════════════════════════════════════
//  SUB-SCREENS
// ═══════════════════════════════════════════════════════════════════

// ── Overview ──────────────────────────────────────────────────────
const OverviewScreen = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/all-users`);
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const paid  = users.filter(u => u.isPaid).length;
  const admins = users.filter(u => u.role === 'admin').length;
  const revenue = paid * 50;

  const stats = [
    { label: 'Total Users', value: users.length.toString(), icon: Users,      color: C.blue,   bg: 'rgba(59,130,246,0.15)',   trend: '+12%' },
    { label: 'Paid Users',  value: paid.toString(),         icon: ShieldCheck, color: C.green,  bg: 'rgba(16,185,129,0.15)',   trend: '+8%'  },
    { label: 'Revenue',     value: `$${revenue.toLocaleString()}`, icon: DollarSign, color: C.amber, bg: 'rgba(245,158,11,0.15)', trend: '+23%' },
    { label: 'Admins',      value: admins.toString(),       icon: Activity,    color: C.purple, bg: 'rgba(139,92,246,0.15)',   trend: '0%'   },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor={C.accent} />}
    >
      {/* Welcome Banner */}
      <LinearGradient colors={['#4F46E5','#7C3AED']} style={st.banner} start={[0,0]} end={[1,1]}>
        <View>
          <Text style={st.bannerTitle}>Welcome back, Admin 👋</Text>
          <Text style={st.bannerSub}>Here's what's happening today</Text>
        </View>
        <View style={st.bannerBadge}>
          <Star color="#FCD34D" size={16} />
          <Text style={st.bannerBadgeText}>Super Admin</Text>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={st.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={st.statCard}>
            <View style={[st.statIcon, { backgroundColor: s.bg }]}>
              <s.icon color={s.color} size={22} />
            </View>
            {loading ? <ActivityIndicator color={s.color} size="small" style={{ marginVertical: 8 }} />
              : <Text style={[st.statVal, { color: s.color }]}>{s.value}</Text>}
            <Text style={st.statLabel}>{s.label}</Text>
            <View style={st.trendRow}>
              <ArrowUp color={C.green} size={12} />
              <Text style={st.trendText}>{s.trend}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Users */}
      <Text style={st.secTitle}>Recent Users</Text>
      <View style={st.card}>
        {loading ? <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
          : users.slice(0, 5).map((u, i) => (
            <View key={u.userid || i} style={[st.row, i < 4 && st.rowBorder]}>
              <View style={[st.avatar, { backgroundColor: u.role === 'admin' ? C.red : C.accent }]}>
                <Text style={st.avatarTxt}>{u.name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={st.rowName}>{u.name}</Text>
                <Text style={st.rowSub}>{u.email}</Text>
              </View>
              <View style={[st.pill, { backgroundColor: u.isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                <Text style={{ color: u.isPaid ? C.green : C.amber, fontSize: 10, fontWeight: '700' }}>
                  {u.isPaid ? 'PAID' : 'UNPAID'}
                </Text>
              </View>
            </View>
          ))
        }
      </View>
    </ScrollView>
  );
};

// ── Admins ────────────────────────────────────────────────────────
const AdminsScreen = () => {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    axios.get(`${API_BASE}/all-users`)
      .then(r => setUsers(r.data.filter(u => u.role === 'admin')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={st.pageHeader}>
        <ShieldCheck color={C.blue} size={28} />
        <Text style={st.pageTitle}>Administrators</Text>
      </View>
      <Text style={st.pageDesc}>Manage system administrators and their permissions</Text>

      {/* Search */}
      <View style={st.searchBox}>
        <Search color={C.muted} size={18} />
        <TextInput
          style={st.searchInput}
          placeholder="Search admins..."
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Count badge */}
      <View style={st.countBadge}>
        <Text style={st.countText}>{filtered.length} admin{filtered.length !== 1 ? 's' : ''} found</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={st.emptyState}>
          <AlertCircle color={C.muted} size={48} />
          <Text style={st.emptyText}>No admins found</Text>
        </View>
      ) : (
        filtered.map((u, i) => (
          <View key={u.userid || i} style={st.adminCard}>
            <LinearGradient colors={['rgba(59,130,246,0.2)','rgba(59,130,246,0.05)']} style={st.adminCardGrad} start={[0,0]} end={[1,1]}>
              <View style={st.adminTop}>
                <View style={st.adminAvatar}>
                  <Text style={st.adminAvatarTxt}>{u.name?.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={st.adminName}>{u.name}</Text>
                  <Text style={st.adminEmail}>{u.email}</Text>
                </View>
                <View style={st.adminBadge}>
                  <ShieldCheck color={C.blue} size={14} />
                  <Text style={st.adminBadgeTxt}>Admin</Text>
                </View>
              </View>
              <View style={st.adminMetaRow}>
                <View style={st.adminMeta}>
                  <Text style={st.adminMetaLabel}>Status</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <View style={[st.dot, { backgroundColor: C.green }]} />
                    <Text style={[st.adminMetaVal, { color: C.green }]}>Active</Text>
                  </View>
                </View>
                <View style={st.adminMeta}>
                  <Text style={st.adminMetaLabel}>Role</Text>
                  <Text style={st.adminMetaVal}>Super Admin</Text>
                </View>
                <View style={st.adminMeta}>
                  <Text style={st.adminMetaLabel}>ID</Text>
                  <Text style={st.adminMetaVal}>#{u.userid || '—'}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        ))
      )}
    </ScrollView>
  );
};

// ── View Prospects ────────────────────────────────────────────────
const ProspectsScreen = () => {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    axios.get(`${API_BASE}/all-users`)
      .then(r => setUsers(r.data.filter(u => u.role !== 'admin')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'all',   label: 'All' },
    { key: 'paid',  label: 'Paid' },
    { key: 'unpaid',label: 'Unpaid' },
  ];

  const filtered = users
    .filter(u => filter === 'all' ? true : filter === 'paid' ? u.isPaid : !u.isPaid)
    .filter(u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={st.pageHeader}>
        <Users color={C.green} size={28} />
        <Text style={st.pageTitle}>Prospects</Text>
      </View>
      <Text style={st.pageDesc}>Monitor and manage all registered prospects</Text>

      {/* Search */}
      <View style={st.searchBox}>
        <Search color={C.muted} size={18} />
        <TextInput
          style={st.searchInput}
          placeholder="Search prospects..."
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter tabs */}
      <View style={st.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setFilter(t.key)}
            style={[st.tab, filter === t.key && st.tabActive]}
          >
            <Text style={[st.tabTxt, filter === t.key && st.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <View style={st.countBadge}>
        <Text style={st.countText}>{filtered.length} prospect{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={st.emptyState}>
          <Users color={C.muted} size={48} />
          <Text style={st.emptyText}>No prospects found</Text>
        </View>
      ) : (
        filtered.map((u, i) => (
          <View key={u.userid || i} style={st.prospectCard}>
            <View style={[st.prospectAvatar, { backgroundColor: u.isPaid ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)' }]}>
              <Text style={[st.prospectAvatarTxt, { color: u.isPaid ? C.green : C.amber }]}>
                {u.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={st.rowName}>{u.name}</Text>
              <Text style={st.rowSub}>{u.email}</Text>
              <Text style={[st.rowSub, { marginTop: 2 }]}>Phone: {u.phone || '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={[st.pill, { backgroundColor: u.isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', marginBottom: 6 }]}>
                <Text style={{ color: u.isPaid ? C.green : C.amber, fontSize: 10, fontWeight: '700' }}>
                  {u.isPaid ? '✓ PAID' : 'UNPAID'}
                </Text>
              </View>
              <ChevronRight color={C.muted} size={16} />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

// ── Add Product ───────────────────────────────────────────────────
const AddProductScreen = () => {
  const [form, setForm] = useState({
    name: '', price: '', category: '', description: '', stock: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);

  const categories = ['Electronics', 'Clothing', 'Health', 'Food', 'Digital', 'Other'];
  const [selCat, setSelCat] = useState('');

  const handleSubmit = () => {
    if (!form.name || !form.price || !selCat) {
      Alert.alert('Missing Fields', 'Please fill in Name, Price, and Category.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setForm({ name: '', price: '', category: '', description: '', stock: '' });
        setSelCat('');
      }, 2500);
    }, 1500);
  };

  if (submitted) {
    return (
      <View style={st.successContainer}>
        <LinearGradient colors={['rgba(16,185,129,0.2)','rgba(16,185,129,0.05)']} style={st.successCard}>
          <View style={st.successIcon}>
            <Check color={C.green} size={40} />
          </View>
          <Text style={st.successTitle}>Product Added!</Text>
          <Text style={st.successSub}>Your product has been successfully added to the catalog.</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={st.pageHeader}>
        <Package color={C.amber} size={28} />
        <Text style={st.pageTitle}>Add Product</Text>
      </View>
      <Text style={st.pageDesc}>Add a new product to the system catalog</Text>

      <View style={st.formCard}>
        <Text style={st.formLabel}>Product Name *</Text>
        <TextInput
          style={st.formInput}
          placeholder="e.g. Premium Health Kit"
          placeholderTextColor={C.muted}
          value={form.name}
          onChangeText={v => setForm(p => ({ ...p, name: v }))}
        />

        <Text style={st.formLabel}>Price (USD) *</Text>
        <TextInput
          style={st.formInput}
          placeholder="0.00"
          placeholderTextColor={C.muted}
          keyboardType="decimal-pad"
          value={form.price}
          onChangeText={v => setForm(p => ({ ...p, price: v }))}
        />

        <Text style={st.formLabel}>Category *</Text>
        <View style={st.catGrid}>
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              style={[st.catChip, selCat === c && st.catChipActive]}
              onPress={() => setSelCat(c)}
            >
              <Text style={[st.catChipTxt, selCat === c && st.catChipTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={st.formLabel}>Stock Quantity</Text>
        <TextInput
          style={st.formInput}
          placeholder="0"
          placeholderTextColor={C.muted}
          keyboardType="number-pad"
          value={form.stock}
          onChangeText={v => setForm(p => ({ ...p, stock: v }))}
        />

        <Text style={st.formLabel}>Description</Text>
        <TextInput
          style={[st.formInput, st.formTextArea]}
          placeholder="Describe the product..."
          placeholderTextColor={C.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={form.description}
          onChangeText={v => setForm(p => ({ ...p, description: v }))}
        />

        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <LinearGradient colors={['#F59E0B','#D97706']} style={st.submitBtn} start={[0,0]} end={[1,0]}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Plus color="#fff" size={20} />
                <Text style={st.submitTxt}>Add Product</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ── Report ────────────────────────────────────────────────────────
const ReportScreen = () => {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/all-users`)
      .then(r => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total   = users.length;
  const paid    = users.filter(u => u.isPaid).length;
  const unpaid  = total - paid;
  const admins  = users.filter(u => u.role === 'admin').length;
  const revenue = paid * 50;
  const convRate = total > 0 ? ((paid / total) * 100).toFixed(1) : '0';

  const kpis = [
    { label: 'Total Revenue',    value: `$${revenue.toLocaleString()}`, icon: DollarSign, color: C.green,  bg: 'rgba(16,185,129,0.15)'  },
    { label: 'Conversion Rate',  value: `${convRate}%`,                icon: TrendingUp,  color: C.blue,   bg: 'rgba(59,130,246,0.15)'  },
    { label: 'Paid Members',     value: paid.toString(),               icon: ShieldCheck, color: C.purple, bg: 'rgba(139,92,246,0.15)'  },
    { label: 'Unpaid Members',   value: unpaid.toString(),             icon: AlertCircle, color: C.amber,  bg: 'rgba(245,158,11,0.15)'  },
    { label: 'Total Admins',     value: admins.toString(),             icon: Users,       color: C.pink,   bg: 'rgba(236,72,153,0.15)'  },
    { label: 'Avg Revenue/User', value: total > 0 ? `$${(revenue/total).toFixed(0)}` : '$0', icon: Activity, color: C.red, bg: 'rgba(239,68,68,0.15)' },
  ];

  // Simple bar for paid vs unpaid
  const paidPct  = total > 0 ? (paid  / total) * 100 : 0;
  const unpaidPct = total > 0 ? (unpaid / total) * 100 : 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={st.pageHeader}>
        <BarChart2 color={C.pink} size={28} />
        <Text style={st.pageTitle}>Analytics Report</Text>
      </View>
      <Text style={st.pageDesc}>Overall system performance and key metrics</Text>

      {loading ? <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} /> : (
        <>
          {/* KPI Grid */}
          <View style={st.kpiGrid}>
            {kpis.map((k, i) => (
              <View key={i} style={st.kpiCard}>
                <View style={[st.kpiIcon, { backgroundColor: k.bg }]}>
                  <k.icon color={k.color} size={20} />
                </View>
                <Text style={[st.kpiVal, { color: k.color }]}>{k.value}</Text>
                <Text style={st.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </View>

          {/* Membership breakdown */}
          <Text style={[st.secTitle, { marginTop: 8 }]}>Membership Breakdown</Text>
          <View style={st.card}>
            <View style={st.barRow}>
              <Text style={st.barLabel}>Paid Members</Text>
              <Text style={[st.barPct, { color: C.green }]}>{paidPct.toFixed(1)}%</Text>
            </View>
            <View style={st.barTrack}>
              <View style={[st.barFill, { width: `${paidPct}%`, backgroundColor: C.green }]} />
            </View>

            <View style={[st.barRow, { marginTop: 18 }]}>
              <Text style={st.barLabel}>Unpaid Members</Text>
              <Text style={[st.barPct, { color: C.amber }]}>{unpaidPct.toFixed(1)}%</Text>
            </View>
            <View style={st.barTrack}>
              <View style={[st.barFill, { width: `${unpaidPct}%`, backgroundColor: C.amber }]} />
            </View>
          </View>

          {/* Summary table */}
          <Text style={[st.secTitle, { marginTop: 8 }]}>Summary Table</Text>
          <View style={st.card}>
            {[
              ['Total Users',   total,            C.text  ],
              ['Paid',          paid,             C.green ],
              ['Unpaid',        unpaid,           C.amber ],
              ['Admins',        admins,           C.blue  ],
              ['Revenue',       `$${revenue}`,    C.green ],
              ['Conversion',    `${convRate}%`,   C.purple],
            ].map(([label, val, color], i, arr) => (
              <View key={i} style={[st.tableRow, i < arr.length - 1 && st.rowBorder]}>
                <Text style={st.tableLbl}>{label}</Text>
                <Text style={[st.tableVal, { color }]}>{val}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN ADMIN DASHBOARD (Sidebar Shell)
// ═══════════════════════════════════════════════════════════════════
const AdminDashboard = ({ navigation }) => {
  const [active, setActive]         = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: false, bounciness: 4 }),
      Animated.timing(overlayAnim, { toValue: 0.6, duration: 250, useNativeDriver: false }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: -SIDEBAR_WIDTH, useNativeDriver: false }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => setSidebarOpen(false));
  };

  const navigate = (id) => {
    setActive(id);
    closeSidebar();
  };

  const currentMenu = MENU.find(m => m.id === active);

  const renderContent = () => {
    switch (active) {
      case 'overview':  return <OverviewScreen />;
      case 'admins':    return <AdminsScreen />;
      case 'prospects': return <ProspectsScreen />;
      case 'product':   return <AddProductScreen />;
      case 'report':    return <ReportScreen />;
      default:          return <OverviewScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <LinearGradient colors={[C.bg, '#0D1321']} style={styles.flex}>

        {/* ── Top Header ── */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.menuBtn} onPress={sidebarOpen ? closeSidebar : openSidebar}>
            {sidebarOpen
              ? <X color={C.text} size={22} />
              : <Menu color={C.text} size={22} />}
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <LinearGradient colors={currentMenu?.gradient || [C.accent, C.purple]} style={styles.topIconBg}>
              {currentMenu && <currentMenu.icon color="#fff" size={16} />}
            </LinearGradient>
            <Text style={styles.topTitle}>{currentMenu?.label || 'Dashboard'}</Text>
          </View>

          <View style={styles.topRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Bell color={C.text} size={20} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={() => navigation.navigate('Login')}>
              <LogOut color={C.red} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Main Content ── */}
        <View style={[styles.flex, { paddingHorizontal: 16, paddingTop: 8 }]}>
          {renderContent()}
        </View>

        {/* ── Sidebar Overlay ── */}
        {sidebarOpen && (
          <Animated.View
            style={[styles.overlay, { opacity: overlayAnim }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity style={styles.flex} onPress={closeSidebar} activeOpacity={1} />
          </Animated.View>
        )}

        {/* ── Sidebar Panel ── */}
        <Animated.View style={[styles.sidebar, { left: slideAnim }]}>
          <LinearGradient colors={['#0F1629','#161D35']} style={styles.sidebarInner}>
            {/* Brand */}
            <LinearGradient colors={['#6366F1','#8B5CF6']} style={styles.brand} start={[0,0]} end={[1,1]}>
              <View style={styles.brandIcon}>
                <ShieldCheck color="#fff" size={22} />
              </View>
              <View>
                <Text style={styles.brandTitle}>NetGrow</Text>
                <Text style={styles.brandSub}>Admin Console</Text>
              </View>
            </LinearGradient>

            {/* Menu */}
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.menuSection}>NAVIGATION</Text>
              {MENU.map(item => {
                const isActive = active === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => navigate(item.id)}
                    activeOpacity={0.75}
                  >
                    {isActive
                      ? <LinearGradient colors={item.gradient} style={styles.menuIconActive} start={[0,0]} end={[1,1]}>
                          <item.icon color="#fff" size={18} />
                        </LinearGradient>
                      : <View style={styles.menuIconInactive}>
                          <item.icon color={C.muted} size={18} />
                        </View>
                    }
                    <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                      {item.label}
                    </Text>
                    {isActive && <View style={styles.menuActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.navigate('Login')}>
              <LogOut color={C.red} size={18} />
              <Text style={styles.logoutTxt}>Sign Out</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

      </LinearGradient>
    </SafeAreaView>
  );
};

export default AdminDashboard;

// ═══════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  flex:   { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  topCenter: { flexDirection: 'row', alignItems: 'center' },
  topIconBg: {
    width: 30, height: 30, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  topTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  notifDot: {
    position: 'absolute', top: 7, right: 7,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.red, borderWidth: 1, borderColor: C.bg,
  },

  // Sidebar
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 10,
  },
  sidebar: {
    position: 'absolute', top: 0, bottom: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 20,
    elevation: 20,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20,
  },
  sidebarInner: { flex: 1 },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 55,
    paddingBottom: 24,
  },
  brandIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  brandTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  brandSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },

  menuScroll: { flex: 1, paddingHorizontal: 12 },
  menuSection: {
    color: C.muted, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.5, marginBottom: 10, marginTop: 10, paddingLeft: 8,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 14, marginBottom: 4,
  },
  menuItemActive: { backgroundColor: 'rgba(99,102,241,0.12)' },
  menuIconActive: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  menuIconInactive: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  menuLabel:      { color: C.muted, fontSize: 14, fontWeight: '500', flex: 1 },
  menuLabelActive:{ color: C.text,  fontWeight: '700' },
  menuActiveDot:  {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.accent,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    marginBottom: 30,
  },
  logoutTxt: { color: C.red, marginLeft: 12, fontWeight: '600', fontSize: 14 },
});

// Shared sub-screen styles
const st = StyleSheet.create({
  // Banner
  banner: {
    borderRadius: 20, padding: 22,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  bannerSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  bannerBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  bannerBadgeText: { color: '#FCD34D', fontSize: 12, fontWeight: '700', marginLeft: 4 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: C.card, borderRadius: 18,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  statIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statVal:  { fontSize: 22, fontWeight: '800', color: C.text },
  statLabel:{ fontSize: 12, color: C.sub, marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  trendText:{ color: C.green, fontSize: 11, fontWeight: '600', marginLeft: 3 },

  // Sections
  secTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
  card:     { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 16, overflow: 'hidden' },

  // Rows
  row:      { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowBorder:{ borderBottomWidth: 1, borderBottomColor: C.border },
  rowName:  { color: C.text, fontSize: 14, fontWeight: '600' },
  rowSub:   { color: C.sub, fontSize: 12, marginTop: 1 },
  avatar:   { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:{ color: '#fff', fontSize: 17, fontWeight: '800' },
  pill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  // Page header
  pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginTop: 4 },
  pageTitle:  { fontSize: 22, fontWeight: '800', color: C.text, marginLeft: 10 },
  pageDesc:   { fontSize: 13, color: C.sub, marginBottom: 16 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border, marginBottom: 14,
  },
  searchInput:{ flex: 1, marginLeft: 10, color: C.text, fontSize: 14 },

  // Count badge
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.accentLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 14,
  },
  countText: { color: C.accent, fontSize: 12, fontWeight: '700' },

  // Tabs
  tabRow: { flexDirection: 'row', marginBottom: 14 },
  tab:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabActive:  { backgroundColor: C.accentLight, borderColor: C.accent },
  tabTxt:     { color: C.muted, fontSize: 13, fontWeight: '600' },
  tabTxtActive:{ color: C.accent },

  // Admin cards
  adminCard: { borderRadius: 18, marginBottom: 12, overflow: 'hidden' },
  adminCardGrad: { padding: 16 },
  adminTop:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  adminAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(59,130,246,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  adminAvatarTxt: { color: C.blue, fontSize: 20, fontWeight: '800' },
  adminName:  { color: C.text, fontSize: 16, fontWeight: '700' },
  adminEmail: { color: C.sub, fontSize: 12, marginTop: 2 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  adminBadgeTxt: { color: C.blue, fontSize: 11, fontWeight: '700', marginLeft: 4 },
  adminMetaRow: { flexDirection: 'row' },
  adminMeta: { flex: 1 },
  adminMetaLabel: { color: C.muted, fontSize: 11, fontWeight: '600' },
  adminMetaVal:   { color: C.text, fontSize: 13, fontWeight: '600', marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },

  // Prospect cards
  prospectCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  prospectAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  prospectAvatarTxt: { fontSize: 18, fontWeight: '800' },

  // Add product form
  formCard: { backgroundColor: C.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  formLabel: { color: C.sub, fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    color: C.text, fontSize: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 16,
  },
  formTextArea: { height: 110, paddingTop: 14 },
  catGrid:  { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  catChip:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, marginRight: 8, marginBottom: 8 },
  catChipActive: { backgroundColor: C.accentLight, borderColor: C.accent },
  catChipTxt:    { color: C.muted, fontSize: 13, fontWeight: '600' },
  catChipTxtActive: { color: C.accent },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 14, paddingVertical: 14 },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  // Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  successCard: { borderRadius: 24, padding: 32, alignItems: 'center', width: width - 32, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16,185,129,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  successSub:   { color: C.sub, fontSize: 14, textAlign: 'center' },

  // Report
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  kpiCard: {
    width: (width - 48) / 2,
    backgroundColor: C.card, borderRadius: 18,
    padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  kpiIcon:  { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  kpiVal:   { fontSize: 20, fontWeight: '800' },
  kpiLabel: { color: C.sub, fontSize: 11, marginTop: 3 },

  barRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  barLabel:{ color: C.text, fontSize: 13, fontWeight: '600' },
  barPct:  { fontSize: 13, fontWeight: '700' },
  barTrack:{ height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, marginHorizontal: 16, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },

  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  tableLbl: { color: C.sub, fontSize: 13 },
  tableVal: { fontSize: 13, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText:  { color: C.muted, marginTop: 12, fontSize: 14 },
});
