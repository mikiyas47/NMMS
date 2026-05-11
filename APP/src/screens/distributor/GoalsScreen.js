import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Target, Star, Trophy, Flame, Zap, Users, TrendingUp,
  Award, AlertTriangle, CheckCircle2, ChevronRight,
  BarChart2, Cpu, Calendar, ArrowUp, Shield,
} from 'lucide-react-native';
import { getGoalEngine } from '../../api/authService';

const { width } = Dimensions.get('window');

// ── Constants ─────────────────────────────────────────────────────────────────

const RANK_LABELS = {
  CT: 'Customer Trainee', MT: 'Market Trainee', TT: 'Team Trainee',
  NTB: 'Natl. Team Builder', IBB: 'Intl. Business Builder',
  GEB: 'Global Empire Builder', CA: 'Crown Achiever',
  C_AWARD: 'Crown Award', AL: 'Alpha Legend',
};

const RANK_COLORS = {
  CT: ['#6B7280','#4B5563'], MT: ['#3B82F6','#1D4ED8'],
  TT: ['#8B5CF6','#6D28D9'], NTB: ['#10B981','#059669'],
  IBB: ['#F59E0B','#D97706'], GEB: ['#EF4444','#B91C1C'],
  CA: ['#F97316','#C2410C'], C_AWARD: ['#EC4899','#BE185D'],
  AL: ['#6366F1','#4338CA'],
};

const PRIORITY_COLORS = { critical: '#EF4444', high: '#F59E0B', medium: '#3B82F6' };
const PRIORITY_BG     = { critical: 'rgba(239,68,68,0.12)', high: 'rgba(245,158,11,0.12)', medium: 'rgba(59,130,246,0.12)' };

const TASK_ICONS = {
  users: Users, phone: Target, share: Zap, book: Star,
  package: Trophy, target: Target, 'trending-up': TrendingUp,
  award: Award, 'user-plus': Users,
};

const TONE_COLORS = {
  success: '#10B981', positive: '#3B82F6',
  warning: '#F59E0B', urgent: '#EF4444', neutral: '#8B5CF6',
};

// ── Animated helpers ──────────────────────────────────────────────────────────

const FadeSlide = ({ delay = 0, children }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

const AnimatedBar = ({ pct, colors, height = 10, delay = 400 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 900, delay, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={{ height, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: height / 2, overflow: 'hidden' }}>
      <Animated.View style={{
        height, borderRadius: height / 2,
        width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        shadowOpacity: 0.5, shadowRadius: 6,
      }}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: height / 2 }} />
      </Animated.View>
    </View>
  );
};


// ── Coach Message Card ────────────────────────────────────────────────────────

const CoachCard = ({ message, C }) => {
  if (!message) return null;
  const color = TONE_COLORS[message.tone] || '#8B5CF6';
  return (
    <FadeSlide delay={0}>
      <View style={{
        borderRadius: 20, padding: 18, marginBottom: 16,
        backgroundColor: C.surface, borderWidth: 1.5, borderColor: color + '40',
        borderLeftWidth: 4, borderLeftColor: color,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Cpu color={color} size={16} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '800', color, letterSpacing: 1 }}>AI COACH</Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 }}>{message.title}</Text>
        <Text style={{ fontSize: 13, color: C.muted, lineHeight: 20 }}>{message.body}</Text>
      </View>
    </FadeSlide>
  );
};

// ── Rank Progress Card ────────────────────────────────────────────────────────

const RankProgressCard = ({ data, C }) => {
  const { current_rank, next_rank, rank_progress, total_points, own_points, missing_items } = data;
  const currentColors = RANK_COLORS[current_rank] || RANK_COLORS.CT;
  const nextColors    = RANK_COLORS[next_rank]    || RANK_COLORS.MT;

  return (
    <FadeSlide delay={60}>
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4338CA']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 24, padding: 22, marginBottom: 16, overflow: 'hidden' }}
      >
        {/* Decorative orb */}
        <View style={{ position: 'absolute', right: -40, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)' }} />

        {/* Current → Next rank */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <LinearGradient colors={currentColors} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{current_rank}</Text>
          </LinearGradient>
          <ChevronRight color="rgba(255,255,255,0.4)" size={18} style={{ marginHorizontal: 8 }} />
          {next_rank ? (
            <LinearGradient colors={nextColors} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{next_rank}</Text>
            </LinearGradient>
          ) : (
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 13 }}>MAX RANK</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 22 }}>{rank_progress}%</Text>
        </View>

        {/* Progress bar */}
        <AnimatedBar pct={rank_progress} colors={['#FCD34D', '#F59E0B']} height={12} delay={300} />

        {/* Stats row */}
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
          {[
            { label: 'Total Points', value: total_points?.toLocaleString() },
            { label: 'Own Package', value: own_points?.toLocaleString() },
            { label: 'Progress', value: `${rank_progress}%` },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>{s.value}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Missing items */}
        {missing_items && missing_items.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.8 }}>WHAT YOU NEED</Text>
            {missing_items.map((item, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' }}>{item.label}</Text>
                  <Text style={{ color: '#FCD34D', fontSize: 12, fontWeight: '800' }}>
                    {item.current?.toLocaleString()} / {item.target?.toLocaleString()}
                  </Text>
                </View>
                <AnimatedBar pct={item.pct} colors={['#60A5FA', '#3B82F6']} height={6} delay={400 + i * 100} />
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </FadeSlide>
  );
};


// ── Leg Balance Card ──────────────────────────────────────────────────────────

const LegBalanceCard = ({ legPoints, weakLegs, C }) => {
  const maxPts = Math.max(...Object.values(legPoints), 200);
  return (
    <FadeSlide delay={120}>
      <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <LinearGradient colors={['#10B981','#059669']} style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <BarChart2 color="#fff" size={18} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>Leg Balance</Text>
            <Text style={{ fontSize: 12, color: C.muted }}>All 4 legs need ≥200 pts for MT</Text>
          </View>
          {weakLegs.length === 0 && (
            <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>BALANCED</Text>
            </View>
          )}
        </View>
        {[1, 2, 3, 4].map(leg => {
          const pts = legPoints[leg] || 0;
          const pct = Math.min(100, Math.round((pts / Math.max(maxPts, 1)) * 100));
          const isWeak = weakLegs.includes(leg);
          const barColors = isWeak ? ['#EF4444','#DC2626'] : ['#10B981','#059669'];
          return (
            <View key={leg} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Leg {leg}</Text>
                  {isWeak && (
                    <View style={{ backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800' }}>WEAK</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isWeak ? '#EF4444' : '#10B981' }}>
                  {pts.toLocaleString()} pts
                </Text>
              </View>
              <AnimatedBar pct={pct} colors={barColors} height={8} delay={200 + leg * 80} />
              {isWeak && (
                <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>
                  Needs {(200 - pts).toLocaleString()} more pts
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </FadeSlide>
  );
};

// ── Auto Goals List ───────────────────────────────────────────────────────────

const AutoGoalCard = ({ goal, C }) => {
  const priorityColor = PRIORITY_COLORS[goal.priority] || '#3B82F6';
  const priorityBg    = PRIORITY_BG[goal.priority]    || 'rgba(59,130,246,0.12)';
  const typeIcons = { rank: Trophy, leg: BarChart2, volume: TrendingUp, team: Users };
  const Icon = typeIcons[goal.type] || Target;

  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 3, borderLeftColor: priorityColor,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: priorityBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Icon color={priorityColor} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 2 }}>{goal.title}</Text>
          <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17 }}>{goal.description}</Text>
        </View>
        <View style={{ backgroundColor: priorityBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: priorityColor, textTransform: 'uppercase' }}>{goal.priority}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AnimatedBar pct={goal.progress} colors={[priorityColor, priorityColor + 'CC']} height={8} delay={300} />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '900', color: priorityColor, minWidth: 38, textAlign: 'right' }}>
          {goal.progress}%
        </Text>
      </View>

      {/* Current / target */}
      {goal.current !== undefined && goal.target !== undefined && (
        <Text style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
          {goal.current?.toLocaleString()} / {goal.target?.toLocaleString()}
          {goal.type === 'volume' || goal.type === 'leg' ? ' pts' : ''}
        </Text>
      )}
    </View>
  );
};


// ── Daily Tasks ───────────────────────────────────────────────────────────────

const TaskCard = ({ task, index, C }) => {
  const [done, setDone] = useState(false);
  const priorityColor = PRIORITY_COLORS[task.priority] || '#3B82F6';
  const priorityBg    = PRIORITY_BG[task.priority]    || 'rgba(59,130,246,0.12)';
  const Icon = TASK_ICONS[task.icon] || Target;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start(() => setDone(d => !d));
  };

  return (
    <FadeSlide delay={index * 60}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: done ? 'rgba(16,185,129,0.08)' : C.surface,
            borderRadius: 16, padding: 14, marginBottom: 10,
            borderWidth: 1,
            borderColor: done ? 'rgba(16,185,129,0.3)' : C.border,
          }}
        >
          {/* Check circle */}
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: done ? '#10B981' : priorityBg,
            alignItems: 'center', justifyContent: 'center', marginRight: 12,
          }}>
            {done
              ? <CheckCircle2 color="#fff" size={16} />
              : <Icon color={priorityColor} size={14} />}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 13, fontWeight: '700',
              color: done ? C.muted : C.text,
              textDecorationLine: done ? 'line-through' : 'none',
            }}>
              {task.title}
            </Text>
            {!done && (
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }} numberOfLines={1}>
                {task.description}
              </Text>
            )}
          </View>

          {task.priority === 'critical' && !done && (
            <View style={{ backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, marginLeft: 8 }}>
              <Text style={{ color: '#EF4444', fontSize: 9, fontWeight: '900' }}>CRITICAL</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </FadeSlide>
  );
};

// ── Weekly Momentum Card ──────────────────────────────────────────────────────

const MomentumCard = ({ momentum, directCount, totalTeam, C }) => (
  <FadeSlide delay={80}>
    <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <LinearGradient colors={['#F59E0B','#D97706']} style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <Flame color="#fff" size={18} />
        </LinearGradient>
        <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>Weekly Momentum</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { label: 'New Recruits', value: momentum?.recruits ?? 0, color: '#10B981', icon: Users },
          { label: 'Earnings', value: `$${(momentum?.earnings ?? 0).toLocaleString()}`, color: '#F59E0B', icon: TrendingUp },
          { label: 'Direct Team', value: directCount ?? 0, color: '#3B82F6', icon: Shield },
          { label: 'Total Network', value: totalTeam ?? 0, color: '#8B5CF6', icon: Award },
        ].map(s => {
          const SIcon = s.icon;
          return (
            <View key={s.label} style={{
              flex: 1, backgroundColor: s.color + '12', borderRadius: 14,
              padding: 10, alignItems: 'center', borderWidth: 1, borderColor: s.color + '25',
            }}>
              <SIcon color={s.color} size={16} />
              <Text style={{ color: s.color, fontWeight: '900', fontSize: 15, marginTop: 4 }}>{s.value}</Text>
              <Text style={{ color: C.muted, fontSize: 9, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  </FadeSlide>
);

// ── Section Header ────────────────────────────────────────────────────────────

const SectionHeader = ({ title, subtitle, icon: Icon, color, C }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 }}>
    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
      <Icon color={color} size={16} />
    </View>
    <View>
      <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 11, color: C.muted }}>{subtitle}</Text>}
    </View>
  </View>
);


// ── Priority Banner ───────────────────────────────────────────────────────────

const PriorityBanner = ({ bottleneck, nextRank, C }) => {
  const messages = {
    legs:     { title: 'Balance Your Legs', body: 'Your volume is strong but legs are uneven. Recruit into your weakest leg.', color: '#EF4444', icon: AlertTriangle },
    volume:   { title: 'Build More Volume', body: 'You need more total points. Push for new package sales across all legs.', color: '#F59E0B', icon: TrendingUp },
    leg_rank: { title: 'Develop Leg Leaders', body: 'You need higher-ranked distributors in your legs. Coach your top recruits.', color: '#8B5CF6', icon: Award },
    recruitment: { title: 'Recruit More Members', body: 'Growing your direct team is the fastest path to your next rank.', color: '#3B82F6', icon: Users },
    none:     { title: 'All Requirements Met!', body: nextRank ? `You qualify for ${nextRank}. The system will promote you automatically.` : 'You have reached the highest rank!', color: '#10B981', icon: CheckCircle2 },
  };

  const msg = messages[bottleneck] || messages.volume;
  const BIcon = msg.icon;

  return (
    <FadeSlide delay={0}>
      <View style={{
        borderRadius: 16, padding: 14, marginBottom: 16,
        backgroundColor: msg.color + '12',
        borderWidth: 1.5, borderColor: msg.color + '35',
        flexDirection: 'row', alignItems: 'center',
      }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: msg.color + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <BIcon color={msg.color} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: msg.color, marginBottom: 2 }}>
            PRIORITY: {msg.title.toUpperCase()}
          </Text>
          <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17 }}>{msg.body}</Text>
        </View>
      </View>
    </FadeSlide>
  );
};

// ── Tab Bar ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', icon: Target },
  { id: 'goals',    label: 'Goals',    icon: Trophy },
  { id: 'tasks',    label: 'Tasks',    icon: CheckCircle2 },
  { id: 'legs',     label: 'Legs',     icon: BarChart2 },
];

const TabBar = ({ active, onPress, C }) => (
  <View style={{
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 16, padding: 4, marginBottom: 18,
    borderWidth: 1, borderColor: C.border,
  }}>
    {TABS.map(tab => {
      const isActive = active === tab.id;
      const TIcon = tab.icon;
      return (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onPress(tab.id)}
          style={{
            flex: 1, paddingVertical: 8, borderRadius: 12,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: isActive ? '#4338CA' : 'transparent',
          }}
        >
          <TIcon color={isActive ? '#fff' : C.muted} size={14} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? '#fff' : C.muted, marginTop: 2 }}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);


// ── Main Screen ───────────────────────────────────────────────────────────────

const GoalsScreen = ({ C }) => {
  const [engineData, setEngineData] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState('overview');

  const fetchEngine = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await getGoalEngine();
      setEngineData(res.data);
    } catch (e) {
      console.error('Goal engine error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEngine(); }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#4338CA" size="large" />
        <Text style={{ color: C.muted, marginTop: 12, fontSize: 13 }}>Analyzing your network...</Text>
      </View>
    );
  }

  if (!engineData) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AlertTriangle color={C.muted} size={40} />
        <Text style={{ color: C.muted, marginTop: 12, fontSize: 14, textAlign: 'center' }}>
          Could not load goal engine. Pull down to retry.
        </Text>
        <TouchableOpacity onPress={() => fetchEngine()} style={{ marginTop: 16, backgroundColor: '#4338CA', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    current_rank, next_rank, rank_progress, bottleneck,
    auto_goals, daily_tasks, coach_message, weekly_momentum,
    leg_points, weak_legs, direct_count, total_team,
    missing_items, total_points, own_points, wallet_balance,
  } = engineData;

  const renderOverview = () => (
    <>
      <CoachCard message={coach_message} C={C} />
      <PriorityBanner bottleneck={bottleneck} nextRank={next_rank} C={C} />
      <RankProgressCard data={engineData} C={C} />
      <MomentumCard momentum={weekly_momentum} directCount={direct_count} totalTeam={total_team} C={C} />
    </>
  );

  const renderGoals = () => (
    <>
      <SectionHeader
        title="Auto-Generated Goals"
        subtitle="System-detected based on your rank & network"
        icon={Cpu}
        color="#4338CA"
        C={C}
      />
      {auto_goals && auto_goals.length > 0
        ? auto_goals.map(g => <AutoGoalCard key={g.id} goal={g} C={C} />)
        : (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <CheckCircle2 color="#10B981" size={40} />
            <Text style={{ color: C.muted, marginTop: 12, fontSize: 14, textAlign: 'center' }}>
              All goals met! Keep building your network.
            </Text>
          </View>
        )
      }
    </>
  );

  const renderTasks = () => (
    <>
      <SectionHeader
        title="Today's Priority Tasks"
        subtitle={`${daily_tasks?.length ?? 0} actions to move you forward`}
        icon={Calendar}
        color="#F59E0B"
        C={C}
      />
      <View style={{
        backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 14,
        padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Cpu color="#F59E0B" size={14} style={{ marginRight: 8 }} />
        <Text style={{ color: C.muted, fontSize: 12, flex: 1 }}>
          Tasks are auto-generated based on your bottleneck: <Text style={{ color: '#F59E0B', fontWeight: '700' }}>{bottleneck?.toUpperCase()}</Text>
        </Text>
      </View>
      {daily_tasks && daily_tasks.map((task, i) => (
        <TaskCard key={task.id} task={task} index={i} C={C} />
      ))}
    </>
  );

  const renderLegs = () => (
    <>
      <SectionHeader
        title="Leg Analysis"
        subtitle="Balance all 4 legs to unlock MT rank"
        icon={BarChart2}
        color="#10B981"
        C={C}
      />
      <LegBalanceCard legPoints={leg_points} weakLegs={weak_legs || []} C={C} />

      {/* Leg tips */}
      {weak_legs && weak_legs.length > 0 && (
        <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 10 }}>How to fix weak legs</Text>
          {weak_legs.map(leg => (
            <View key={leg} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 }}>
                <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '900' }}>{leg}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Recruit into Leg {leg}</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  Direct new recruits or customer referrals specifically into leg {leg} to build its volume.
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchEngine(true); }}
          tintColor="#4338CA"
        />
      }
    >
      {/* ── Header ── */}
      <FadeSlide delay={0}>
        <LinearGradient
          colors={['#0F0A2E', '#1E1B4B', '#312E81']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 20, marginBottom: 16, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)' }} />
          <View style={{ position: 'absolute', left: -20, bottom: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(99,102,241,0.1)' }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <LinearGradient colors={['#6366F1','#4338CA']} style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Cpu color="#fff" size={20} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 }}>INTELLIGENT GOAL ENGINE</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 1 }}>Your Growth Dashboard</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Balance</Text>
              <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 16 }}>${wallet_balance?.toLocaleString()}</Text>
            </View>
          </View>

          {/* Rank pill row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LinearGradient colors={RANK_COLORS[current_rank] || ['#6B7280','#4B5563']} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{current_rank} — {RANK_LABELS[current_rank]}</Text>
            </LinearGradient>
            {next_rank && (
              <>
                <ArrowUp color="rgba(255,255,255,0.4)" size={14} />
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 12 }}>{next_rank} ({rank_progress}%)</Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>
      </FadeSlide>

      {/* ── Tab Bar ── */}
      <TabBar active={activeTab} onPress={setActiveTab} C={C} />

      {/* ── Tab Content ── */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'goals'    && renderGoals()}
      {activeTab === 'tasks'    && renderTasks()}
      {activeTab === 'legs'     && renderLegs()}
    </ScrollView>
  );
};

export default GoalsScreen;
