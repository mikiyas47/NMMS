import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Animated, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users, Search, ChevronRight, UserPlus,
  TrendingUp, ArrowUpRight, Network, RefreshCw,
} from 'lucide-react-native';
import { getMyTree, getWallet } from '../../api/authService';

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

const AVATAR_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#3B82F6','#EC4899'];

const RANK_COLORS = {
  None: '#9CA3AF', CT: '#9CA3AF',
  MT: '#FBBF24', TT: '#F97316',
  NTB: '#34D399', IBB: '#60A5FA', GEB: '#C084FC',
  CA: '#FBBF24', C_AWARD: '#F59E0B', AL: '#FCD34D'
};

/**
 * Recursively flatten a tree node into a flat member list.
 * @param {object} node   — current tree node
 * @param {boolean} isRoot — skip the root (that's the logged-in distributor)
 * @param {string}  level  — 'Direct' for depth-1 children, 'Team' for deeper
 * @param {number}  depth  — current depth from root
 */
const flattenTree = (node, isRoot = false, depth = 0) => {
  if (!node) return [];
  const members = [];

  if (!isRoot) {
    members.push({
      id:       node.id,
      name:     node.distributor_name || 'Unknown',
      email:    node.distributor_email || '—',
      phone:    node.distributor_phone || '—',
      rank:     node.rank === 'CT' || node.rank === 'None' || !node.rank ? 'Customer Trainee(CT)' : node.rank,
      points:   node.product_points || 0,
      leg:      node.leg,
      level:    depth === 1 ? 'Direct' : 'Team',
    });
  }

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      members.push(...flattenTree(child, false, depth + 1));
    }
  }

  return members;
};

// ─────────────────────────────────────────────────────────────────────────────
const MyNetwork = ({ C }) => {
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [members,    setMembers]    = useState([]);
  const [teamStats,  setTeamStats]  = useState({ direct: 0, total: 0 });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noTree,     setNoTree]     = useState(false);
  const [error,      setError]      = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setNoTree(false);
    setError(null);
    try {
      // Both calls are auth-scoped — each distributor gets only their own tree/wallet
      const [treeRes, walletRes] = await Promise.allSettled([
        getMyTree(),
        getWallet(),
      ]);

      // ── Parse tree ──────────────────────────────────────────────────────
      if (treeRes.status === 'fulfilled') {
        const flat = flattenTree(treeRes.value.tree, true, 0);
        setMembers(flat);
      } else {
        const status = treeRes.reason?.response?.status;
        if (status === 404) {
          // Distributor hasn't joined the network yet
          setNoTree(true);
          setMembers([]);
        } else {
          setError(treeRes.reason?.message || 'Failed to load network.');
        }
      }

      // ── Parse wallet team stats ──────────────────────────────────────────
      if (walletRes.status === 'fulfilled') {
        const team = walletRes.value?.team || {};
        setTeamStats({
          direct: team.direct_count ?? 0,
          total:  team.total_team   ?? 0,
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(true); };

  // ── Derived data ──────────────────────────────────────────────────────────
  const directCount = members.filter(m => m.level === 'Direct').length;
  const activeCount = members.length; // all visible members count as active

  const filtered = members.filter(m => {
    const matchFilter =
      filter === 'all'   ||
      (filter === 'direct' && m.level === 'Direct') ||
      (filter === 'team'   && m.level === 'Team');
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const tabs = [
    { key: 'all',    label: 'All',    count: members.length },
    { key: 'direct', label: 'Direct', count: directCount },
    { key: 'team',   label: 'Team',   count: members.length - directCount },
  ];

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.muted, marginTop: 12, fontSize: 13 }}>
          Loading your network…
        </Text>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Network color={C.muted} size={48} />
        <Text style={{ color: C.red, textAlign: 'center', marginTop: 12, fontWeight: '600' }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={() => load()}
          style={{ marginTop: 20, backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      {/* ── Header banner ── */}
      <FadeIn delay={0}>
        <LinearGradient
          colors={['#064E3B','#065F46','#10B981']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 20, marginBottom: 18, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>YOUR NETWORK</Text>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 }}>My Team</Text>
            </View>
            <TouchableOpacity
              onPress={onRefresh}
              style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
            >
              <RefreshCw color="#fff" size={15} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 6 }}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Mini stats row */}
          <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
            {[
              { label: 'Direct',     value: String(teamStats.direct), icon: ArrowUpRight },
              { label: 'Total Team', value: String(teamStats.total),  icon: Users },
              { label: 'Downlines',  value: String(members.length),   icon: TrendingUp },
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{s.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 3 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── No tree yet ── */}
      {noTree ? (
        <FadeIn delay={80}>
          <View style={{ alignItems: 'center', paddingTop: 40, paddingBottom: 30 }}>
            <Network color={C.muted} size={52} />
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, marginTop: 14 }}>
              No Network Yet
            </Text>
            <Text style={{ fontSize: 13, color: C.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
              Purchase a product package to activate your{'\n'}account and start building your team.
            </Text>
          </View>
        </FadeIn>
      ) : (
        <>
          {/* ── Search ── */}
          <FadeIn delay={80}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 46, marginBottom: 14 }}>
              <Search color={C.muted} size={16} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, email or phone…"
                placeholderTextColor={C.muted}
                style={{ flex: 1, marginLeft: 10, color: C.text, fontSize: 14 }}
              />
            </View>
          </FadeIn>

          {/* ── Filter tabs ── */}
          <FadeIn delay={120}>
            <View style={{ flexDirection: 'row', backgroundColor: C.inputBg, borderRadius: 14, padding: 4, marginBottom: 16 }}>
              {tabs.map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setFilter(t.key)}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    paddingVertical: 9, borderRadius: 11, gap: 6,
                    backgroundColor: filter === t.key ? C.accent : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: filter === t.key ? '#fff' : C.muted }}>{t.label}</Text>
                  <View style={{ backgroundColor: filter === t.key ? 'rgba(255,255,255,0.25)' : C.card, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: filter === t.key ? '#fff' : C.muted }}>{t.count}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </FadeIn>

          {/* ── Member cards ── */}
          <FadeIn delay={180}>
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 50, paddingBottom: 30 }}>
                <Users color={C.muted} size={44} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginTop: 12 }}>
                  {search ? 'No members found' : 'No downlines yet'}
                </Text>
                <Text style={{ fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center' }}>
                  {search ? 'Try a different search or filter' : 'Refer someone to grow your network'}
                </Text>
              </View>
            ) : (
              filtered.map((member, i) => {
                const avatarColor  = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const rankColor    = RANK_COLORS[member.rank === 'Customer Trainee(CT)' ? 'CT' : member.rank] || RANK_COLORS['CT'];
                const isDirect     = member.level === 'Direct';

                return (
                  <View
                    key={member.id}
                    style={{
                      backgroundColor: C.surface, borderRadius: 20,
                      borderWidth: 1, borderColor: C.border,
                      padding: 16, marginBottom: 10,
                      flexDirection: 'row', alignItems: 'center',
                    }}
                  >
                    {/* Avatar */}
                    <View style={{ position: 'relative' }}>
                      <LinearGradient
                        colors={[avatarColor, avatarColor + 'BB']}
                        style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>
                          {(member.name || '?').charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                      {/* Level dot */}
                      <View style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 13, height: 13, borderRadius: 7,
                        backgroundColor: isDirect ? '#10B981' : '#6366F1',
                        borderWidth: 2, borderColor: C.surface,
                      }} />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{member.name}</Text>
                      <Text style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{member.email}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        {/* Level badge */}
                        <View style={{ backgroundColor: isDirect ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isDirect ? '#10B981' : '#6366F1' }}>
                            {member.level} · Leg {member.leg}
                          </Text>
                        </View>
                        {/* Rank badge */}
                        <View style={{ backgroundColor: rankColor + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: rankColor }}>
                            {member.rank}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Right — points */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: C.accent }}>
                        {(member.points || 0).toLocaleString()} pts
                      </Text>
                      <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>product pts</Text>
                    </View>
                  </View>
                );
              })
            )}
          </FadeIn>
        </>
      )}
    </ScrollView>
  );
};

export default MyNetwork;
