import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Users as UsersIcon, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  Settings, 
  Bell,
  Search,
  LogOut,
  ChevronRight,
  ShieldCheck
} from 'lucide-react-native';
import axios from 'axios';

const { width } = Dimensions.get('window');

const AdminDashboard = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState([
    { label: 'Total Users', value: '-', icon: UsersIcon, color: '#3B82F6' },
    { label: 'Paid Users', value: '-', icon: ShieldCheck, color: '#10B981' },
    { label: 'Revenue', value: '-', icon: DollarSign, color: '#F59E0B' },
    { label: 'Active Now', value: '-', icon: Activity, color: '#EF4444' },
  ]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('https://nmms-backend.onrender.com/api/all-users');
      const allUsers = response.data;
      setUsers(allUsers);
      
      // Calculate real stats
      const paidCount = allUsers.filter(u => u.isPaid).length;
      const activeCount = allUsers.filter(u => u.status === 'active').length;
      
      setStats([
        { label: 'Total Users', value: allUsers.length.toString(), icon: UsersIcon, color: '#3B82F6' },
        { label: 'Paid Users', value: paidCount.toString(), icon: ShieldCheck, color: '#10B981' },
        { label: 'Revenue', value: `$${(paidCount * 50).toLocaleString()}`, icon: DollarSign, color: '#F59E0B' }, // Assuming $50/user
        { label: 'Active Now', value: activeCount.toString(), icon: Activity, color: '#EF4444' },
      ]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#111827', '#1F2937']} style={styles.background}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Console</Text>
            <Text style={styles.subtitle}>NetGrow Management System</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn}>
              <Bell color="#FFFFFF" size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Login')}>
              <LogOut color="#EF4444" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
          }
        >
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}20` }]}>
                  <stat.icon color={stat.color} size={24} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Activity Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>User Directory</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.viewAll}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            {loading ? (
              <ActivityIndicator color="#3B82F6" style={{ marginVertical: 20 }} />
            ) : users.length === 0 ? (
              <Text style={{ color: '#9CA3AF', textAlign: 'center', marginVertical: 20 }}>No users found</Text>
            ) : (
              users.map((user, index) => (
                <View key={user.userid} style={[styles.userRow, index === users.length - 1 && styles.lastRow]}>
                  <View style={[styles.userAvatar, { backgroundColor: user.role === 'admin' ? '#EF4444' : '#3B82F6' }]}>
                    <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View style={styles.userMeta}>
                    <View style={[styles.badge, user.isPaid ? styles.paidBadge : styles.pendingBadge]}>
                      <Text style={[styles.badgeText, user.isPaid ? styles.paidText : styles.pendingText]}>
                        {user.isPaid ? 'PAID' : 'UNPAID'}
                      </Text>
                    </View>
                    <ChevronRight color="#4B5563" size={18} />
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionItem}>
              <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.actionGradient}>
                 <TrendingUp color="#FFFFFF" size={24} />
              </LinearGradient>
              <Text style={styles.actionLabel}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.actionGradient}>
                 <Settings color="#FFFFFF" size={24} />
              </LinearGradient>
              <Text style={styles.actionLabel}>System</Text>
            </TouchableOpacity>
             <TouchableOpacity style={styles.actionItem}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.actionGradient}>
                 <Search color="#FFFFFF" size={24} />
              </LinearGradient>
              <Text style={styles.actionLabel}>Audit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default AdminDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollContent: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    width: (width - 55) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewAll: {
    color: '#3B82F6',
    fontSize: 14,
  },
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    paddingVertical: 10,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  userAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  paidBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paidText: {
    color: '#10B981',
  },
  pendingText: {
    color: '#F59E0B',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    alignItems: 'center',
    width: (width - 60) / 3,
  },
  actionGradient: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '500',
  },
});
