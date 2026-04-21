import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  BarChart2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Users,
  Activity,
} from 'lucide-react-native';
import axios from 'axios';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const API_BASE = 'https://nmms-backend.onrender.com/api';

const ReportScreen = ({ C }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_BASE}/all-users`)
      .then(r => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = users.length;
  const paid = users.filter(u => u.isPaid).length;
  const unpaid = total - paid;
  const admins = users.filter(u => u.role === 'admin').length;
  const revenue = paid * 50;
  const convRate = total > 0 ? ((paid / total) * 100).toFixed(1) : '0';
  const paidPct = total > 0 ? (paid / total) * 100 : 0;
  const unpaidPct = total > 0 ? (unpaid / total) * 100 : 0;

  const kpis = [
    {
      label: 'Total Revenue',
      value: `$${revenue.toLocaleString()}`,
      icon: DollarSign,
      color: C.green,
      bg: 'rgba(16,185,129,0.15)',
    },
    {
      label: 'Conversion Rate',
      value: `${convRate}%`,
      icon: TrendingUp,
      color: C.blue,
      bg: 'rgba(59,130,246,0.15)',
    },
    {
      label: 'Paid Members',
      value: paid.toString(),
      icon: ShieldCheck,
      color: C.purple,
      bg: 'rgba(139,92,246,0.15)',
    },
    {
      label: 'Unpaid Members',
      value: unpaid.toString(),
      icon: AlertCircle,
      color: C.amber,
      bg: 'rgba(245,158,11,0.15)',
    },
    {
      label: 'Total Admins',
      value: admins.toString(),
      icon: Users,
      color: C.pink,
      bg: 'rgba(236,72,153,0.15)',
    },
    {
      label: 'Avg Rev/User',
      value: total > 0 ? `$${(revenue / total).toFixed(0)}` : '$0',
      icon: Activity,
      color: C.red,
      bg: 'rgba(239,68,68,0.15)',
    },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="flex-row items-center mb-1">
        <BarChart2 color={C.pink} size={26} />
        <Text className="text-xl font-bold ml-2" style={{ color: C.text }}>
          Analytics Report
        </Text>
      </View>
      <Text className="text-sm mb-5" style={{ color: C.muted }}>
        Overall system performance and key metrics
      </Text>

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* KPI Grid */}
          <View className="flex-row flex-wrap justify-between mb-5">
            {kpis.map((k, i) => (
              <View
                key={i}
                className="rounded-2xl p-4 mb-3 items-center"
                style={{
                  width: (width - 48) / 2,
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mb-2"
                  style={{ backgroundColor: k.bg }}
                >
                  <k.icon color={k.color} size={20} />
                </View>
                <Text
                  className="text-xl font-bold"
                  style={{ color: k.color }}
                >
                  {k.value}
                </Text>
                <Text
                  className="text-xs mt-0.5 text-center"
                  style={{ color: C.muted }}
                >
                  {k.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Membership Breakdown */}
          <Text
            className="text-base font-bold mb-3"
            style={{ color: C.text }}
          >
            Membership Breakdown
          </Text>
          <View
            className="rounded-2xl p-5 mb-4"
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            {[
              {
                label: 'Paid Members',
                pct: paidPct,
                color: C.green,
              },
              {
                label: 'Unpaid Members',
                pct: unpaidPct,
                color: C.amber,
              },
            ].map((b, i) => (
              <View key={i} style={{ marginTop: i > 0 ? 18 : 0 }}>
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-sm" style={{ color: C.text }}>
                    {b.label}
                  </Text>
                  <Text
                    className="text-sm font-bold"
                    style={{ color: b.color }}
                  >
                    {b.pct.toFixed(1)}%
                  </Text>
                </View>
                <View
                  className="h-2 rounded-full"
                  style={{ backgroundColor: C.border }}
                >
                  <View
                    className="h-2 rounded-full"
                    style={{
                      width: `${b.pct}%`,
                      backgroundColor: b.color,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Summary Table */}
          <Text
            className="text-base font-bold mb-3"
            style={{ color: C.text }}
          >
            Summary Table
          </Text>
          <View
            className="rounded-2xl overflow-hidden mb-6"
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            {[
              ['Total Users', total, C.text],
              ['Paid', paid, C.green],
              ['Unpaid', unpaid, C.amber],
              ['Admins', admins, C.blue],
              ['Revenue', `$${revenue}`, C.green],
              ['Conversion', `${convRate}%`, C.purple],
            ].map(([label, val, color], i, arr) => (
              <View
                key={i}
                className="flex-row justify-between px-5 py-3"
                style={{
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                }}
              >
                <Text className="text-sm" style={{ color: C.muted }}>
                  {label}
                </Text>
                <Text
                  className="text-sm font-bold"
                  style={{ color }}
                >
                  {val}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default ReportScreen;
