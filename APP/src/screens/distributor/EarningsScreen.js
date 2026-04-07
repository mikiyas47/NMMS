import React from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DollarSign, TrendingUp, ArrowUp, CreditCard, Wallet } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const EarningsScreen = ({ C }) => {
  const earnings = [
    { label: 'Total Earnings', value: '$2,450', icon: DollarSign, color: C.green, bg: 'rgba(16,185,129,0.15)' },
    { label: 'This Week', value: '$320', icon: TrendingUp, color: C.blue, bg: 'rgba(59,130,246,0.15)' },
    { label: 'Pending', value: '$150', icon: Wallet, color: C.amber, bg: 'rgba(245,158,11,0.15)' },
    { label: 'Withdrawn', value: '$1,980', icon: CreditCard, color: C.purple, bg: 'rgba(139,92,246,0.15)' },
  ];

  const transactions = [
    { id: 1, type: 'Commission', amount: '+$45', date: 'Today, 2:30 PM', status: 'completed' },
    { id: 2, type: 'Bonus', amount: '+$100', date: 'Yesterday, 10:00 AM', status: 'completed' },
    { id: 3, type: 'Withdrawal', amount: '-$200', date: 'Dec 15, 2024', status: 'completed' },
    { id: 4, type: 'Commission', amount: '+$75', date: 'Dec 14, 2024', status: 'completed' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="flex-row items-center mb-1">
        <DollarSign color={C.green} size={26} />
        <Text className="text-xl font-bold ml-2" style={{ color: C.text }}>Earnings</Text>
      </View>
      <Text className="text-sm mb-5" style={{ color: C.muted }}>Track your income and withdrawals</Text>

      {/* Earnings Cards */}
      <View className="flex-row flex-wrap justify-between mb-5">
        {earnings.map((item, i) => (
          <View
            key={i}
            className="rounded-2xl p-4 mb-3"
            style={{ width: (width - 48) / 2, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: item.bg }}>
              <item.icon color={item.color} size={20} />
            </View>
            <Text className="text-2xl font-bold mb-1" style={{ color: item.color }}>{item.value}</Text>
            <Text className="text-xs" style={{ color: C.muted }}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Withdraw Button */}
      <TouchableOpacity className="rounded-2xl overflow-hidden mb-5">
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={[0, 0]}
          end={[1, 0]}
          className="p-4 flex-row justify-center items-center"
        >
          <Wallet color="#fff" size={20} />
          <Text className="text-white text-base font-bold ml-2">Withdraw Funds</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Transaction History */}
      <Text className="text-base font-bold mb-3" style={{ color: C.text }}>Transaction History</Text>
      <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
        {transactions.map((tx, i) => (
          <View
            key={tx.id}
            className="flex-row items-center justify-between px-4 py-3"
            style={{ borderBottomWidth: i < transactions.length - 1 ? 1 : 0, borderBottomColor: C.border }}
          >
            <View className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: C.text }}>{tx.type}</Text>
              <Text className="text-xs mt-0.5" style={{ color: C.muted }}>{tx.date}</Text>
            </View>
            <Text
              className="text-sm font-bold"
              style={{ color: tx.amount.startsWith('+') ? C.green : C.red }}
            >
              {tx.amount}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default EarningsScreen;
