/**
 * EarningsScreen.js  — Live data from payments API
 * Shows real commissions earned from Chapa-verified sales.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DollarSign, TrendingUp, Wallet, CreditCard,
  ArrowUpRight, RefreshCw, Package, CheckCircle, AlertCircle,
} from 'lucide-react-native';
import { getUser, getSalesHistory } from '../../api/authService';

const { width } = Dimensions.get('window');

const FadeIn = ({ delay = 0, children }) => {
  const anim  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
};

const EarningsScreen = ({ C }) => {
  const [sales, setSales]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);
  const [userId, setUserId]       = useState(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const user = await getUser();
      const did  = user?.distributor_id;
      setUserId(did);
      const res  = await getSalesHistory(did);
      setSales(res?.data ?? []);
    } catch (e) {
      setError('Could not load earnings. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  // ── Computed totals ────────────────────────────────────────────────────────
  const totalCommission = sales.reduce((s, p) => s + parseFloat(p.commission ?? 0), 0);
  const totalSales      = sales.reduce((s, p) => s + parseFloat(p.amount ?? 0), 0);
  const salesCount      = sales.length;

  // This week
  const now       = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
  const thisWeek  = sales.filter(p => new Date(p.created_at) >= weekStart);
  const weekComm  = thisWeek.reduce((s, p) => s + parseFloat(p.commission ?? 0), 0);

  // ── Bar chart (last 7 days) ────────────────────────────────────────────────
  const days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const dayMap = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const total = sales
      .filter(p => {
        const pd = new Date(p.created_at);
        return pd >= d && pd < next;
      })
      .reduce((s, p) => s + parseFloat(p.commission ?? 0), 0);
    return { label: days[d.getDay() === 0 ? 6 : d.getDay() - 1], value: total };
  });
  const maxBar = Math.max(...dayMap.map(d => d.value), 1);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ color: C.muted, marginTop: 14, fontSize: 14 }}>Loading earnings…</Text>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <AlertCircle color="#EF4444" size={40} />
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, marginTop: 14, marginBottom: 8 }}>
          Could not load earnings
        </Text>
        <Text style={{ color: C.muted, textAlign: 'center', marginBottom: 24 }}>{error}</Text>
        <TouchableOpacity onPress={() => fetchData()} style={{ borderRadius: 14, overflow: 'hidden' }}>
          <LinearGradient colors={['#10B981', '#059669']} start={[0,0]} end={[1,0]}
            style={{ paddingVertical: 12, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center' }}>
            <RefreshCw color="#fff" size={16} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 8 }}>Retry</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(false); }}
          tintColor="#10B981"
          colors={['#10B981']}
        />
      }
    >
      {/* ── Hero balance card ── */}
      <FadeIn delay={0}>
        <LinearGradient
          colors={['#064E3B', '#065F46', '#10B981']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 26, padding: 24, marginBottom: 18, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', right: -40, top: -40, width: 140, height: 140,
            borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <View style={{ position: 'absolute', left: 60, bottom: -30, width: 100, height: 100,
            borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.04)' }} />

          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>
            TOTAL COMMISSION EARNED
          </Text>
          <Text style={{ color: '#fff', fontSize: 38, fontWeight: '900', marginTop: 6, marginBottom: 4 }}>
            ETB {totalCommission.toFixed(2)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 18 }}>
            From {salesCount} verified sale{salesCount !== 1 ? 's' : ''}
          </Text>

          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12,
            flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <CheckCircle color="#A7F3D0" size={16} />
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginLeft: 8 }}>
              All commissions verified by Chapa webhook
            </Text>
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── Stat cards ── */}
      <FadeIn delay={80}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 }}>
          EARNINGS OVERVIEW
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'This Week', value: `ETB ${weekComm.toFixed(2)}`,
              icon: TrendingUp, grad: ['#3B82F6', '#6366F1'], bg: 'rgba(59,130,246,0.12)' },
            { label: 'Total Sales Volume', value: `ETB ${totalSales.toFixed(2)}`,
              icon: DollarSign, grad: ['#10B981', '#059669'], bg: 'rgba(16,185,129,0.12)' },
            { label: 'Sales Count', value: String(salesCount),
              icon: Package, grad: ['#F59E0B', '#EF4444'], bg: 'rgba(245,158,11,0.12)' },
            { label: 'Avg Commission', value: salesCount
                ? `ETB ${(totalCommission / salesCount).toFixed(2)}` : 'ETB 0',
              icon: CreditCard, grad: ['#8B5CF6', '#EC4899'], bg: 'rgba(139,92,246,0.12)' },
          ].map((card, i) => (
            <View key={i} style={{ width: (width - 48) / 2, borderRadius: 20,
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, padding: 16 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: card.bg,
                alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <card.icon color={card.grad[0]} size={20} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{card.value}</Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{card.label}</Text>
            </View>
          ))}
        </View>
      </FadeIn>

      {/* ── 7-day bar chart ── */}
      <FadeIn delay={160}>
        <View style={{ backgroundColor: C.surface, borderRadius: 20, borderWidth: 1,
          borderColor: C.border, padding: 18, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>Daily Commissions (7d)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ArrowUpRight color="#10B981" size={14} />
              <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '700', marginLeft: 3 }}>
                ETB {weekComm.toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80 }}>
            {dayMap.map((d, i) => {
              const h       = Math.max((d.value / maxBar) * 70, d.value > 0 ? 6 : 2);
              const isToday = i === 6;
              return (
                <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                  <View style={{ width: '60%', height: h, borderRadius: 6,
                    backgroundColor: isToday ? '#10B981' : C.accent + '55' }} />
                  <Text style={{ fontSize: 9, color: isToday ? '#10B981' : C.muted,
                    marginTop: 6, fontWeight: isToday ? '800' : '400' }}>
                    {d.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </FadeIn>

      {/* ── Sales history ── */}
      <FadeIn delay={240}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 }}>
          SALE HISTORY
        </Text>
        {sales.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, backgroundColor: C.surface,
            borderRadius: 20, borderWidth: 1, borderColor: C.border }}>
            <Package color={C.muted} size={36} />
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 16, marginTop: 14 }}>No sales yet</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 24 }}>
              Share product payment links with customers.{'\n'}Your commissions appear here instantly.
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: C.surface, borderRadius: 20, borderWidth: 1,
            borderColor: C.border, overflow: 'hidden' }}>
            {sales.map((tx, i) => (
              <View key={tx.id}
                style={{ flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderBottomWidth: i < sales.length - 1 ? 1 : 0,
                  borderBottomColor: C.border }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center',
                  justifyContent: 'center', backgroundColor: 'rgba(16,185,129,0.12)' }}>
                  <ArrowUpRight color="#10B981" size={18} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{tx.product}</Text>
                  <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {tx.customer_name} · qty {tx.quantity} · {formatDate(tx.created_at)}
                  </Text>
                  <Text style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                    Ref: {tx.tx_ref?.slice(-10)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#10B981' }}>
                    +ETB {parseFloat(tx.commission).toFixed(2)}
                  </Text>
                  <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>commission</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </FadeIn>
    </ScrollView>
  );
};

export default EarningsScreen;
