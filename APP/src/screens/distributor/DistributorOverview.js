import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, Animated, Dimensions, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users, DollarSign, Target, Star, ArrowUpRight,
  Zap, TrendingUp, ChevronRight, Award, Bell, Network,
} from 'lucide-react-native';
import { getWallet, getUser } from '../../api/authService';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const RANK_ICONS = { None: '🌱', MT: '⭐', TT: '🔥', NTB: '🌿', IBB: '💎', GEB: '👑' };
const RANK_COLORS = { None: '#9CA3AF', MT: '#FBBF24', TT: '#F97316', NTB: '#34D399', IBB: '#60A5FA', GEB: '#C084FC' };

// Fade-in wrapper
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

const fmt = (n) => {
  const num = parseFloat(n ?? 0);
  if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
  return '$' + num.toFixed(2);
};

const DistributorOverview = ({ C }) => {
  const [walletData, setWalletData] = useState(null);
  const [userName, setUserName]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(false);
    try {
      const [userData, wData] = await Promise.all([getUser(), getWallet()]);
      if (userData?.name) setUserName(userData.name.split(' ')[0]);
      setWalletData(wData);
    } catch (e) {
      console.log('Overview load error:', e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(true); };

  const wallet = walletData?.wallet || { balance: 0, weekly_earnings: 0, total_earned: 0 };
  const stats  = walletData?.stats  || { left_points: 0, right_points: 0, rank: 'None', total_points: 0 };
  const team   = walletData?.team   || { direct_count: 0, total_team: 0 };
  const commissions = walletData?.recent_commissions || [];

  const rank      = stats.rank || 'None';
  const rankColor = RANK_COLORS[rank] || '#9CA3AF';
  const rankIcon  = RANK_ICONS[rank]  || '🌱';

  const cycleLeft  = stats.left_points  + (stats.carry_left  || 0);
  const cycleRight = stats.right_points + (stats.carry_right || 0);
  const cyclePct   = Math.min(100, (Math.min(cycleLeft, cycleRight) / 600) * 100);

  const statCards = [
    { label: 'Directs',      value: String(team.direct_count || 0), sub: 'referrals',        icon: Users,       grad: ['#6366F1','#818CF8'], glow: '#6366F1' },
    { label: 'Team',         value: String(team.total_team   || 0), sub: 'total members',    icon: Network,     grad: ['#10B981','#34D399'], glow: '#10B981' },
    { label: 'Balance',      value: fmt(wallet.balance),            sub: 'in wallet',         icon: DollarSign,  grad: ['#F59E0B','#FCD34D'], glow: '#F59E0B' },
    { label: 'This Week',    value: fmt(wallet.weekly_earnings),    sub: 'earned this wk',   icon: TrendingUp,  grad: ['#8B5CF6','#A78BFA'], glow: '#8B5CF6' },
  ];

  const quickActions = [
    { label: 'Network', icon: Users,       grad: ['#6366F1','#8B5CF6'] },
    { label: 'Tree',    icon: Network,     grad: ['#10B981','#059669'] },
    { label: 'Goals',   icon: Target,      grad: ['#F59E0B','#EF4444'] },
    { label: 'Rank',    icon: Award,       grad: ['#3B82F6','#6366F1'] },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >

      {/* ── Hero Banner ── */}
      <FadeIn delay={0}>
        <LinearGradient
          colors={['#4338CA', '#7C3AED', '#6366F1']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 22, marginBottom: 18, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <View style={{ position: 'absolute', right: 40, bottom: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 }}>WELCOME BACK</Text>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 }}>
                {userName ? `Hey, ${userName}! 👋` : 'Good day! 👋'}
              </Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={{ fontSize: 14 }}>{rankIcon}</Text>
              <Text style={{ color: rankColor === '#9CA3AF' ? '#FCD34D' : rankColor, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                {rank === 'None' ? 'UNRANKED' : rank}
              </Text>
            </View>
          </View>

          {/* Binary Cycle Progress */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' }}>Binary Cycle Progress</Text>
              <Text style={{ color: '#FCD34D', fontSize: 12, fontWeight: '800' }}>
                {Math.min(cycleLeft, cycleRight)} / 600 pts
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 }}>
              <View style={{ height: 6, width: `${cyclePct}%`, backgroundColor: '#FCD34D', borderRadius: 3 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <TrendingUp color="#86EFAC" size={13} />
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginLeft: 6 }}>
                Left: {cycleLeft} pts · Right: {cycleRight} pts
              </Text>
            </View>
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── Stats Grid ── */}
      <FadeIn delay={80}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 }}>PERFORMANCE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {statCards.map((s, i) => (
            <View key={i} style={{
              width: CARD_W, borderRadius: 20,
              backgroundColor: C.surface,
              borderWidth: 1, borderColor: C.border,
              padding: 16, overflow: 'hidden',
            }}>
              <View style={{ position: 'absolute', top: -18, right: -18, width: 64, height: 64, borderRadius: 32, backgroundColor: s.glow + '22' }} />
              <LinearGradient colors={s.grad} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <s.icon color="#fff" size={18} />
              </LinearGradient>
              <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <ArrowUpRight color={s.glow} size={11} />
                <Text style={{ fontSize: 10, color: s.glow, fontWeight: '700', marginLeft: 3 }}>{s.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </FadeIn>

      {/* ── Wallet Summary ── */}
      <FadeIn delay={140}>
        <LinearGradient
          colors={['#064E3B', '#065F46', '#10B981']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 18, marginBottom: 20, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>TOTAL WALLET</Text>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 4 }}>${parseFloat(wallet.balance).toFixed(2)}</Text>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 10 }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>This Week</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>${parseFloat(wallet.weekly_earnings).toFixed(2)}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>All Time</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>${parseFloat(wallet.total_earned).toFixed(2)}</Text>
            </View>
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── Streak / Motivational Banner ── */}
      <FadeIn delay={200}>
        <LinearGradient
          colors={['rgba(245,158,11,0.15)', 'rgba(239,68,68,0.10)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Zap color="#F59E0B" size={20} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 14 }}>Keep Growing! 🚀</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                {stats.total_points > 0
                  ? `${stats.total_points.toLocaleString()} total points accumulated`
                  : 'Refer your first member to start earning!'}
              </Text>
            </View>
            <View style={{ backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '800' }}>{rankIcon} {rank}</Text>
            </View>
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── Recent Commissions ── */}
      <FadeIn delay={260}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 1 }}>RECENT COMMISSIONS</Text>
        </View>
        <View style={{ backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          {commissions.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <DollarSign color={C.muted} size={28} />
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                No commissions yet.{'\n'}Make your first referral sale!
              </Text>
            </View>
          ) : commissions.slice(0, 5).map((item, i) => (
            <View key={item.id} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 16, paddingVertical: 14,
              borderBottomWidth: i < Math.min(commissions.length, 5) - 1 ? 1 : 0,
              borderBottomColor: C.border,
            }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#10B98122', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign color="#10B981" size={16} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{item.customer}</Text>
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#10B981' }}>+${parseFloat(item.commission).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </FadeIn>

    </ScrollView>
  );
};

export default DistributorOverview;
