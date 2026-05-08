import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DollarSign, Clock } from 'lucide-react-native';
import { getWallet } from '../../api/authService';

// ── Rank config ───────────────────────────────────────────────────────────────
const RANK_CONFIG = {
  None:    { label: 'Customer Trainee (CT)',  colors: ['#4B5563','#6B7280'], icon: '🌱', requirement: 'Unranked / New' },
  CT:      { label: 'Customer Trainee (CT)',  colors: ['#4B5563','#6B7280'], icon: '🌱', requirement: 'Unranked / New' },
  MT:      { label: 'Market Trainee',         colors: ['#FBBF24','#D97706'], icon: '⭐', requirement: 'All 4 legs ≥ 200 pts & 5,000 total' },
  TT:      { label: 'Team Trainee',           colors: ['#F97316','#C2410C'], icon: '🔥', requirement: '2 MT legs & 10,000 total' },
  NTB:     { label: 'National Team Builder',  colors: ['#34D399','#059669'], icon: '🌿', requirement: '4 TT legs & 50,000 total' },
  IBB:     { label: 'Intl. Business Builder', colors: ['#60A5FA','#2563EB'], icon: '💎', requirement: '4 NTB legs & 200,000 total' },
  GEB:     { label: 'Global Empire Builder',  colors: ['#C084FC','#7E22CE'], icon: '👑', requirement: '4 IBB legs & 800,000 total' },
  CA:      { label: 'Crown Achiever',         colors: ['#FBBF24','#D97706'], icon: '🏆', requirement: '4 GEB legs ($50K Award)' },
  C_AWARD: { label: 'Crown Award',            colors: ['#F59E0B','#B45309'], icon: '🏅', requirement: '2+ CA legs ($100K Award)' },
  AL:      { label: 'Alpha Legend',           colors: ['#FCD34D','#B45309'], icon: '🌟', requirement: '4 CA legs ($500K Award)' },
};

const RANK_ORDER = ['CT','MT','TT','NTB','IBB','GEB','CA','C_AWARD','AL'];

// ── Animated fade-in ──────────────────────────────────────────────────────────
const FadeIn = ({ delay = 0, children }) => {
  const anim  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
};

// ── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ label, value, color, C }) => (
  <View style={{
    flex: 1, backgroundColor: C.surface, borderWidth: 1,
    borderColor: C.border, borderRadius: 16, padding: 14, alignItems: 'center',
  }}>
    <Text style={{ fontSize: 18, fontWeight: '900', color }}>{value}</Text>
    <Text style={{ fontSize: 10, color: C.muted, marginTop: 3, textAlign: 'center' }}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
const EarningsScreen = ({ C }) => {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getWallet();
      setData(res);
      setError(null);
    } catch (e) {
      if (e?.response?.status === 404) { setData(null); setError(null); }
      else setError(e.message || 'Failed to load earnings data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading && !data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.muted, marginTop: 12, fontSize: 13 }}>Loading your earnings…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <DollarSign color={C.muted} size={48} />
        <Text style={{ color: C.red, textAlign: 'center', marginTop: 12, fontWeight: '600' }}>{error}</Text>
        <TouchableOpacity onPress={() => load()} style={{ marginTop: 20, backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const wallet      = data?.wallet  || { balance: 0, weekly_earnings: 0, total_earned: 0 };
  const stats       = data?.stats   || { rank: 'CT', own_points: 0, total_points: 0 };
  const team        = data?.team    || { direct_count: 0, total_team: 0, legs: [] };
  const commissions = data?.recent_commissions || [];

  let activeRank = stats.rank;
  if (!activeRank || activeRank === 'None') activeRank = 'CT';
  const currentRankCfg = RANK_CONFIG[activeRank] || RANK_CONFIG['CT'];
  const rankIdx        = RANK_ORDER.indexOf(activeRank);
  const nextRank       = RANK_ORDER[rankIdx + 1];
  const nextRankCfg    = nextRank ? RANK_CONFIG[nextRank] : null;

  const totalPoints = stats.total_points || 0;
  const ownPoints   = stats.own_points   || 0;

  const fmt = (n) => {
    const num = parseFloat(n ?? 0);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >

      {/* ── Wallet Header ── */}
      <FadeIn delay={0}>
        <LinearGradient
          colors={['#064E3B','#065F46','#10B981']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 22, marginBottom: 16, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <View style={{ position: 'absolute', left: -20, bottom: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.04)' }} />
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>TOTAL WALLET BALANCE</Text>
          <Text style={{ color: '#fff', fontSize: 38, fontWeight: '900', marginTop: 4 }}>${fmt(wallet.balance)}</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>This Week</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>${fmt(wallet.weekly_earnings)}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Total Earned</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>${fmt(wallet.total_earned)}</Text>
            </View>
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── Stats Row ── */}
      <FadeIn delay={60}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <StatPill label="Total Points" value={totalPoints.toLocaleString()} color={C.blue}  C={C} />
          <StatPill label="Own Packages" value={ownPoints.toLocaleString()}   color={C.green} C={C} />
          <StatPill label="Team Size"    value={team.total_team}              color={C.purple} C={C} />
        </View>
      </FadeIn>

      {/* ── Current Rank Card ── */}
      <FadeIn delay={100}>
        <LinearGradient
          colors={currentRankCfg.colors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 20, marginBottom: 16, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 36 }}>{currentRankCfg.icon}</Text>
            <View style={{ marginLeft: 14 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 }}>CURRENT RANK</Text>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{currentRankCfg.label}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{activeRank}</Text>
            </View>
          </View>

          {/* ── Total Points inside rank card ── */}
          <View style={{ marginTop: 16, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 14, padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>TOTAL POINTS</Text>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 2 }}>
                  {totalPoints.toLocaleString()}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}> pts</Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>OWN PACKAGES</Text>
                <Text style={{ color: '#FCD34D', fontSize: 20, fontWeight: '900', marginTop: 2 }}>
                  {ownPoints.toLocaleString()}
                  <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(252,211,77,0.8)' }}> pts</Text>
                </Text>
              </View>
            </View>
          </View>

          {nextRankCfg && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                Next: {nextRankCfg.label} — {nextRankCfg.requirement}
              </Text>
            </View>
          )}
        </LinearGradient>
      </FadeIn>

      {/* ── Leg Breakdown ── */}
      <FadeIn delay={140}>
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 16 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginBottom: 14 }}>Your 4 Legs</Text>
          {team.legs.length === 0 ? (
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
              No downlines yet. Refer someone to build your tree.
            </Text>
          ) : (
            [1, 2, 3, 4].map(legNum => {
              const leg     = team.legs.find(l => l.leg === legNum);
              const rankCfg = leg?.rank ? (RANK_CONFIG[leg.rank] || RANK_CONFIG['None']) : RANK_CONFIG['None'];
              return (
                <View key={legNum} style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: legNum < 4 ? 1 : 0,
                  borderBottomColor: C.border,
                }}>
                  <LinearGradient
                    colors={leg ? rankCfg.colors : ['#374151','#4B5563']}
                    style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                  >
                    <Text style={{ fontSize: 16 }}>{leg ? rankCfg.icon : '⬜'}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>Leg {legNum}</Text>
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>
                      {leg ? `${(leg.points || 0).toLocaleString()} pts · ${leg.rank || 'CT'}` : 'Empty slot'}
                    </Text>
                  </View>
                  {leg && (
                    <View style={{ backgroundColor: rankCfg.colors[0] + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                      <Text style={{ color: rankCfg.colors[0], fontSize: 11, fontWeight: '700' }}>{leg.rank || 'CT'}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </FadeIn>

      {/* ── Rank Ladder ── */}
      <FadeIn delay={180}>
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 16 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginBottom: 14 }}>Rank Ladder</Text>
          {RANK_ORDER.map((rank, idx) => {
            const cfg      = RANK_CONFIG[rank];
            const achieved = RANK_ORDER.indexOf(activeRank) >= RANK_ORDER.indexOf(rank) && activeRank !== 'None';
            return (
              <View key={rank} style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: idx < RANK_ORDER.length - 1 ? 1 : 0,
                borderBottomColor: C.border,
                opacity: achieved ? 1 : 0.5,
              }}>
                <LinearGradient
                  colors={achieved ? cfg.colors : ['#374151','#4B5563']}
                  style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                >
                  <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: achieved ? C.text : C.muted, fontWeight: '700', fontSize: 13 }}>{cfg.label}</Text>
                  <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>{cfg.requirement}</Text>
                </View>
                {achieved && (
                  <View style={{ backgroundColor: cfg.colors[0] + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                    <Text style={{ color: cfg.colors[0], fontSize: 10, fontWeight: '800' }}>✓ Achieved</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </FadeIn>

      {/* ── Recent Commissions ── */}
      <FadeIn delay={220}>
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 16 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginBottom: 14 }}>Recent Commissions</Text>
          {commissions.length === 0 ? (
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
              No commissions yet. Make your first referral sale!
            </Text>
          ) : commissions.map((c, i) => (
            <View key={c.id} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: i < commissions.length - 1 ? 1 : 0,
              borderBottomColor: C.border,
            }}>
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <DollarSign color="#10B981" size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{c.customer}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Clock color={C.muted} size={10} />
                  <Text style={{ color: C.muted, fontSize: 10 }}>
                    {new Date(c.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 14 }}>+${fmt(c.commission)}</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>Sale: ${fmt(c.amount)}</Text>
              </View>
            </View>
          ))}
        </View>
      </FadeIn>

    </ScrollView>
  );
};

export default EarningsScreen;
