import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  DollarSign,
  Target,
  TrendingUp,
  Star,
  ArrowUp,
  ChevronRight,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const DistributorOverview = ({ C }) => {
  const stats = [
    {
      label: 'Direct Referrals',
      value: '8',
      icon: Users,
      color: C.green,
      bg: 'rgba(16,185,129,0.15)',
      trend: '+3 this week',
    },
    {
      label: 'Team Size',
      value: '42',
      icon: Users,
      color: C.blue,
      bg: 'rgba(59,130,246,0.15)',
      trend: '+12 this month',
    },
    {
      label: 'Total Earnings',
      value: '$2,450',
      icon: DollarSign,
      color: C.amber,
      bg: 'rgba(245,158,11,0.15)',
      trend: '+$320 this week',
    },
    {
      label: 'Current Rank',
      value: 'Silver',
      icon: Star,
      color: C.purple,
      bg: 'rgba(139,92,246,0.15)',
      trend: 'Next: Gold',
    },
  ];

  const recentActivity = [
    { id: 1, type: 'referral', text: 'New referral: John Doe', date: '2 hours ago', color: C.green },
    { id: 2, type: 'earning', text: 'Commission earned: $45', date: '5 hours ago', color: C.amber },
    { id: 3, type: 'milestone', text: 'Reached 40 team members!', date: '1 day ago', color: C.blue },
    { id: 4, type: 'referral', text: 'New referral: Jane Smith', date: '2 days ago', color: C.green },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Welcome Banner */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        className="rounded-2xl p-5 mb-5"
        start={[0, 0]}
        end={[1, 1]}
      >
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-white text-xl font-bold">Welcome, Miki! 👋</Text>
            <Text className="text-white/70 text-sm mt-1">Keep growing your network</Text>
          </View>
          <View className="px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <Text className="text-yellow-300 text-xs font-bold">Silver Member</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <TrendingUp color="#FCD34D" size={16} />
          <Text className="text-white/90 text-xs ml-2">You're in the top 30% of distributors!</Text>
        </View>
      </LinearGradient>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap justify-between mb-5">
        {stats.map((s, i) => (
          <View
            key={i}
            className="rounded-2xl p-4 mb-3"
            style={{
              width: (width - 48) / 2,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: s.bg }}>
                <s.icon color={s.color} size={20} />
              </View>
              <View className="flex-row items-center">
                <ArrowUp color={C.green} size={12} />
              </View>
            </View>
            <Text className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</Text>
            <Text className="text-xs mb-1" style={{ color: C.muted }}>{s.label}</Text>
            <Text className="text-xs" style={{ color: C.sub }}>{s.trend}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text className="text-base font-bold mb-3" style={{ color: C.text }}>Quick Actions</Text>
      <View className="flex-row flex-wrap justify-between mb-5">
        {[
          { label: 'Invite Friends', icon: Users, gradient: ['#10B981', '#34D399'] },
          { label: 'View Team', icon: Target, gradient: ['#3B82F6', '#60A5FA'] },
          { label: 'Withdraw', icon: DollarSign, gradient: ['#F59E0B', '#FCD34D'] },
        ].map((action, i) => (
          <TouchableOpacity
            key={i}
            className="rounded-2xl p-4 mb-3 items-center"
            style={{ width: (width - 48) / 2, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
          >
            <LinearGradient colors={action.gradient} className="w-12 h-12 rounded-xl items-center justify-center mb-2">
              <action.icon color="#fff" size={24} />
            </LinearGradient>
            <Text className="text-sm font-semibold" style={{ color: C.text }}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity */}
      <Text className="text-base font-bold mb-3" style={{ color: C.text }}>Recent Activity</Text>
      <View className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
        {recentActivity.map((activity, i) => (
          <View
            key={activity.id}
            className="flex-row items-center px-4 py-3"
            style={{ borderBottomWidth: i < recentActivity.length - 1 ? 1 : 0, borderBottomColor: C.border }}
          >
            <View className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: activity.color }} />
            <View className="flex-1">
              <Text className="text-sm" style={{ color: C.text }}>{activity.text}</Text>
              <Text className="text-xs mt-0.5" style={{ color: C.muted }}>{activity.date}</Text>
            </View>
            <ChevronRight color={C.muted} size={16} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default DistributorOverview;
