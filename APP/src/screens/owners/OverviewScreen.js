import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  ShieldCheck,
  DollarSign,
  Activity,
  ArrowUp,
  Star,
} from 'lucide-react-native';
import apiClient from '../../api/authService';

const { width } = Dimensions.get('window');

const OverviewScreen = ({ C }) => {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [userRes, prodRes] = await Promise.all([
        apiClient.get('/all-users'),
        apiClient.get('/products')
      ]);
      const nonAdmins = userRes.data.filter(u => u.role !== 'admin');
      setUsers(nonAdmins);
      if (prodRes.data && prodRes.data.data) {
        setProducts(prodRes.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const paid = users.filter(u => u.isPaid).length;
  const revenue = paid * 50;

  const stats = [
    {
      label: 'Total Users',
      value: users.length.toString(),
      icon: Users,
      color: C.blue,
      bg: 'rgba(59,130,246,0.15)',
      trend: '+12%',
    },
    {
      label: 'Paid Users',
      value: paid.toString(),
      icon: ShieldCheck,
      color: C.green,
      bg: 'rgba(16,185,129,0.15)',
      trend: '+8%',
    },
    {
      label: 'Revenue',
      value: `$${revenue.toLocaleString()}`,
      icon: DollarSign,
      color: C.amber,
      bg: 'rgba(245,158,11,0.15)',
      trend: '+23%',
    },
    {
      label: 'Products',
      value: products.length.toString(),
      icon: Activity,
      color: C.purple,
      bg: 'rgba(139,92,246,0.15)',
      trend: '0%',
    },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }}
          tintColor={C.accent}
        />
      }
    >
      {/* Welcome Banner */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        className="rounded-2xl p-5 mb-5 flex-row justify-between items-center"
        start={[0, 0]}
        end={[1, 1]}
      >
        <View>
          <Text className="text-white text-xl font-bold">
            Welcome back, Admin 👋
          </Text>
          <Text className="text-white/70 text-sm mt-1">
            Here's what's happening today
          </Text>
        </View>
        <View
          className="flex-row items-center px-3 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <Star color="#FCD34D" size={14} />
          <Text className="text-yellow-300 text-xs font-bold ml-1">
            Super Admin
          </Text>
        </View>
      </LinearGradient>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap justify-between mb-4">
        {stats.map((s, i) => (
          <View
            key={i}
            className="rounded-2xl p-4 mb-3 items-start"
            style={{
              width: (width - 48) / 2,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mb-3"
              style={{ backgroundColor: s.bg }}
            >
              <s.icon color={s.color} size={20} />
            </View>
            {loading ? (
              <ActivityIndicator
                color={s.color}
                size="small"
                style={{ marginVertical: 8 }}
              />
            ) : (
              <Text
                className="text-2xl font-bold"
                style={{ color: s.color }}
              >
                {s.value}
              </Text>
            )}
            <Text className="text-xs mt-1" style={{ color: C.muted }}>
              {s.label}
            </Text>
            <View className="flex-row items-center mt-1">
              <ArrowUp color={C.green} size={10} />
              <Text className="text-xs ml-1" style={{ color: C.green }}>
                {s.trend}
              </Text>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );
};

export default OverviewScreen;
