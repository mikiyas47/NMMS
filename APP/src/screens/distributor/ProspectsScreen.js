import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, RefreshControl, Alert,
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  Linking, AppState,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as CalendarAPI from 'expo-calendar';
import { InvitationBehaviorService, InvitationNextActionService } from '../../services/InvitationIntelligence';

import { LinearGradient } from 'expo-linear-gradient';
import {
  Target, Users, Flame, TrendingUp, Clock, CheckCircle2,
  Plus, Search, X, ChevronRight, AlertTriangle, Star,
  MessageSquare, Phone, ArrowRight, BarChart2, Zap,
  User, Calendar, Award, Filter, Info,
} from 'lucide-react-native';
import {
  getProspectDashboard, getProspects, createProspect,
  moveProspectStage, addProspectFollowup, addProspectClosing,
  createInvitation, getPresentations, assignPresentation,
  getProspectInvitations, getProspectAssignments,
  getFollowups, getClosings, initEcho, getProspectWatchingStatus,
  getProspectScoreBreakdown,
} from '../../api/authService';
import { FollowupWizardContent, ClosingWizardContent } from '../../components/WizardModals';
const { width } = Dimensions.get('window');

// ΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const STAGES = [
  'New Lead', 'Contacted', 'Invited', 'Awaiting Response',
  'Presentation Scheduled', 'Presentation Completed',
  'Follow-Up Needed', 'Closing', 'Joined', 'Rejected', 'Inactive',
];

const STAGE_COLORS = {
  'New Lead': ['#6366F1', '#818CF8'],
  'Contacted': ['#3B82F6', '#60A5FA'],
  'Invited': ['#8B5CF6', '#A78BFA'],
  'Awaiting Response': ['#F59E0B', '#FCD34D'],
  'Presentation Scheduled': ['#EC4899', '#F472B6'],
  'Presentation Completed': ['#06B6D4', '#67E8F9'],
  'Follow-Up Needed': ['#EF4444', '#F87171'],
  'Closing': ['#F97316', '#FB923C'],
  'Joined': ['#10B981', '#34D399'],
  'Rejected': ['#6B7280', '#9CA3AF'],
  'Inactive': ['#374151', '#6B7280'],
};

const INTEREST_META = {
  hot: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: '≡ƒöÑ Hot', score: 70 },
  warm: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: '≡ƒîí Warm', score: 35 },
  cold: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', label: 'Γ¥ä∩╕Å Cold', score: 0 },
};

const PRIORITY_COLORS = {
  urgent: '#EF4444', high: '#F59E0B', normal: '#6366F1', low: '#6B7280',
};

const fmt = (iso) => {
  if (!iso) return 'ΓÇö';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return d < today;
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

// ΓöÇΓöÇ Animated helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const FadeIn = ({ delay = 0, children }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: op, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
};

const ScoreBar = ({ score, C }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: score, duration: 700, delay: 200, useNativeDriver: false }).start();
  }, [score]);
  const color = score >= 70 ? '#EF4444' : score >= 35 ? '#F59E0B' : '#6B7280';
  return (
    <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
      <Animated.View style={{
        height: 6, borderRadius: 3, backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
      }} />
    </View>
  );
};


// ΓöÇΓöÇ Dashboard Section ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const DashboardView = ({ data, onNavigate, C }) => {
  if (!data) return null;
  const { analytics, hot_leads, follow_ups_due, overdue, closing_opps, newly_joined, stage_counts } = data;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Hero banner */}
      <FadeIn delay={0}>
        <LinearGradient colors={['#1E1B4B', '#312E81', '#4338CA']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, padding: 20, marginBottom: 16, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)' }} />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 }}>PROSPECT ENGINE</Text>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 2, marginBottom: 14 }}>Recruitment Dashboard</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Total', value: analytics?.total ?? 0, color: '#60A5FA' },
              { label: 'Joined', value: analytics?.joined ?? 0, color: '#34D399' },
              { label: 'Conv. Rate', value: `${analytics?.conversion_rate ?? 0}%`, color: '#FCD34D' },
              { label: 'Avg Score', value: analytics?.avg_score ?? 0, color: '#F472B6' },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <Text style={{ color: s.color, fontWeight: '900', fontSize: 16 }}>{s.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </FadeIn>

      {/* Interest breakdown */}
      <FadeIn delay={60}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'hot', label: '≡ƒöÑ Hot', value: analytics?.hot_count ?? 0, color: '#EF4444' },
            { key: 'warm', label: '≡ƒîí Warm', value: analytics?.warm_count ?? 0, color: '#F59E0B' },
            { key: 'cold', label: 'Γ¥ä∩╕Å Cold', value: analytics?.cold_count ?? 0, color: '#6B7280' },
          ].map(s => (
            <TouchableOpacity key={s.key} onPress={() => onNavigate('list', { interest_level: s.key })}
              style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: s.color, fontWeight: '900', fontSize: 22 }}>{s.value}</Text>
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </FadeIn>

      {/* Overdue alert */}
      {overdue?.length > 0 && (
        <FadeIn delay={80}>
          <TouchableOpacity onPress={() => onNavigate('list', { overdue: true })}
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)', flexDirection: 'row', alignItems: 'center' }}>
            <AlertTriangle color="#EF4444" size={20} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 14 }}>{overdue.length} Overdue Follow-Up{overdue.length > 1 ? 's' : ''}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>These prospects need immediate attention</Text>
            </View>
            <ChevronRight color="#EF4444" size={16} />
          </TouchableOpacity>
        </FadeIn>
      )}

      {/* Follow-ups due today */}
      {follow_ups_due?.length > 0 && (
        <FadeIn delay={100}>
          <SectionCard title="≡ƒôà Follow-Ups Due Today" count={follow_ups_due.length} color="#F59E0B" C={C}>
            {follow_ups_due.slice(0, 3).map(p => (
              <ProspectRow key={p.prospect_id} prospect={p} onPress={() => onNavigate('profile', p)} C={C} />
            ))}
          </SectionCard>
        </FadeIn>
      )}

      {/* Hot leads */}
      {hot_leads?.length > 0 && (
        <FadeIn delay={120}>
          <SectionCard title="≡ƒöÑ Hot Leads" count={hot_leads.length} color="#EF4444" C={C}>
            {hot_leads.slice(0, 3).map(p => (
              <ProspectRow key={p.prospect_id} prospect={p} onPress={() => onNavigate('profile', p)} C={C} />
            ))}
          </SectionCard>
        </FadeIn>
      )}

      {/* Closing opportunities */}
      {closing_opps?.length > 0 && (
        <FadeIn delay={140}>
          <SectionCard title="≡ƒÄ» Closing Opportunities" count={closing_opps.length} color="#F97316" C={C}>
            {closing_opps.slice(0, 3).map(p => (
              <ProspectRow key={p.prospect_id} prospect={p} onPress={() => onNavigate('profile', p)} C={C} />
            ))}
          </SectionCard>
        </FadeIn>
      )}

      {/* Newly joined */}
      {newly_joined?.length > 0 && (
        <FadeIn delay={160}>
          <SectionCard title="≡ƒÄë Newly Joined" count={newly_joined.length} color="#10B981" C={C}>
            {newly_joined.slice(0, 3).map(p => (
              <ProspectRow key={p.prospect_id} prospect={p} onPress={() => onNavigate('profile', p)} C={C} />
            ))}
          </SectionCard>
        </FadeIn>
      )}

      {/* Stage counts */}
      <FadeIn delay={180}>
        <View style={{ backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 12 }}>Pipeline Overview</Text>
          {STAGES.filter(s => (stage_counts?.[s] ?? 0) > 0).map(stage => {
            const count = stage_counts?.[stage] ?? 0;
            const colors = STAGE_COLORS[stage] || ['#6366F1', '#818CF8'];
            return (
              <TouchableOpacity key={stage} onPress={() => onNavigate('list', { stage })}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors[0], marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: '600' }}>{stage}</Text>
                <View style={{ backgroundColor: colors[0] + '22', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                  <Text style={{ color: colors[0], fontWeight: '800', fontSize: 12 }}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </FadeIn>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const SectionCard = ({ title, count, color, children, C }) => (
  <View style={{ backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: C.text }}>{title}</Text>
      <View style={{ backgroundColor: color + '22', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
        <Text style={{ color, fontWeight: '800', fontSize: 12 }}>{count}</Text>
      </View>
    </View>
    {children}
  </View>
);

const ProspectRow = ({ prospect, onPress, C }) => {
  const im = INTEREST_META[prospect.interest_level] || INTEREST_META.cold;
  const overdue = isOverdue(prospect.next_action_date);
  const dueToday = isToday(prospect.next_action_date);
  return (
    <TouchableOpacity onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: im.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Text style={{ color: im.color, fontWeight: '800', fontSize: 15 }}>{prospect.name?.charAt(0)?.toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{prospect.name}</Text>
        <Text style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{prospect.stage}</Text>
        {prospect.next_action && (
          <Text style={{ fontSize: 11, color: overdue ? '#EF4444' : dueToday ? '#F59E0B' : C.muted, marginTop: 1 }} numberOfLines={1}>
            {overdue ? 'ΓÜá∩╕Å ' : dueToday ? '≡ƒôà ' : 'ΓåÆ '}{prospect.next_action}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={{ backgroundColor: im.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
          <Text style={{ color: im.color, fontSize: 10, fontWeight: '800' }}>{prospect.interest_score ?? 0}</Text>
        </View>
        <ChevronRight color={C.muted} size={14} />
      </View>
    </TouchableOpacity>
  );
};


// ΓöÇΓöÇ List View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const ListView = ({ prospects, loading, onPress, onAdd, onRefresh, refreshing, filter, C }) => {
  const [search, setSearch] = useState('');
  const filtered = prospects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, height: 42, marginBottom: 12 }}>
        <Search color={C.muted} size={15} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search prospects..."
          placeholderTextColor={C.muted} style={{ flex: 1, marginLeft: 8, color: C.text, fontSize: 14 }} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><X color={C.muted} size={14} /></TouchableOpacity>}
      </View>

      {/* Filter badge */}
      {filter?.stage && (
        <View style={{ backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)' }}>
          <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '700' }}>Stage: {filter.stage}</Text>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Users color={C.muted} size={40} />
              <Text style={{ color: C.muted, fontSize: 14, fontWeight: '600', marginTop: 12 }}>No prospects found</Text>
              <TouchableOpacity onPress={onAdd} style={{ marginTop: 16, backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>+ Add First Prospect</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.map(p => (
            <TouchableOpacity key={p.prospect_id} onPress={() => onPress(p)}
              style={{ backgroundColor: C.surface, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Avatar with interest color */}
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: (INTEREST_META[p.interest_level]?.bg || 'rgba(99,102,241,0.15)'), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ color: (INTEREST_META[p.interest_level]?.color || '#6366F1'), fontWeight: '800', fontSize: 18 }}>
                    {p.name?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>{p.name}</Text>
                    {p.priority === 'urgent' && <Text style={{ fontSize: 10 }}>≡ƒÜ¿</Text>}
                    {p.priority === 'high' && <Text style={{ fontSize: 10 }}>ΓÜí</Text>}
                  </View>
                  <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.phone}</Text>
                  {/* Stage badge */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 }}>
                    <View style={{ backgroundColor: (STAGE_COLORS[p.stage]?.[0] || '#6366F1') + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: (STAGE_COLORS[p.stage]?.[0] || '#6366F1'), fontSize: 10, fontWeight: '700' }}>{p.stage}</Text>
                    </View>
                    {p.next_action_date && (
                      <Text style={{ fontSize: 10, color: isOverdue(p.next_action_date) ? '#EF4444' : isToday(p.next_action_date) ? '#F59E0B' : C.muted }}>
                        {isOverdue(p.next_action_date) ? 'ΓÜá∩╕Å Overdue' : isToday(p.next_action_date) ? '≡ƒôà Today' : fmt(p.next_action_date)}
                      </Text>
                    )}
                  </View>
                </View>
                {/* Score */}
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: (INTEREST_META[p.interest_level]?.color || C.muted) }}>
                    {p.interest_score ?? 0}
                  </Text>
                  <Text style={{ fontSize: 9, color: C.muted }}>score</Text>
                </View>
              </View>
              {/* Next action */}
              {p.next_action && (
                <View style={{ marginTop: 10, backgroundColor: C.inputBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}>
                  <ArrowRight color={C.muted} size={12} />
                  <Text style={{ fontSize: 12, color: C.muted, marginLeft: 6, flex: 1 }} numberOfLines={1}>{p.next_action}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
};



// ΓöÇΓöÇ Profile View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const ProfileView = ({ prospect, onBack, onUpdate, autoOpen, C }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showStageModal, setShowStageModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const watchPulse = useRef(new Animated.Value(1)).current;

  // ── Poll watching status every 5s (DB-backed, works without WebSockets) ──
  const [recentlyClosed, setRecentlyClosed] = useState(false);

  useEffect(() => {
    if (!prospect?.prospect_id) return;
    let mounted = true;
    let pollTimer = null;

    const checkWatching = async () => {
      try {
        const res = await getProspectWatchingStatus(prospect.prospect_id);
        if (!mounted) return;

        const wasWatching = isWatching;
        const nowWatching = res.is_watching === true;
        const nowClosed = res.recently_closed === true;

        setIsWatching(nowWatching);
        setRecentlyClosed(nowClosed && !nowWatching);

        if (nowWatching && !wasWatching) {
          // Started watching — start pulse
          Animated.loop(
            Animated.sequence([
              Animated.timing(watchPulse, { toValue: 1.25, duration: 700, useNativeDriver: true }),
              Animated.timing(watchPulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
            ])
          ).start();
        } else if (!nowWatching && wasWatching) {
          // Stopped watching — stop pulse
          watchPulse.stopAnimation();
          watchPulse.setValue(1);
        }
      } catch (_) { }
    };

    // Poll immediately then every 5 seconds
    checkWatching();
    pollTimer = setInterval(checkWatching, 5000);

    return () => {
      mounted = false;
      clearInterval(pollTimer);
      watchPulse.stopAnimation();
    };
  }, [prospect?.prospect_id]);

  // Invite form
  const [inviteType, setInviteType] = useState('zoom');
  const [presentations, setPresentations] = useState([]);
  const [selectedPresId, setSelectedPresId] = useState(null);  // Stage move form
  const [newStage, setNewStage] = useState(prospect.stage);
  const [nextAction, setNextAction] = useState(prospect.next_action || '');
  const [nextDate, setNextDate] = useState(prospect.next_action_date ? prospect.next_action_date.toString().split('T')[0] : '');

  // Followup form
  const [fuType, setFuType] = useState('');
  const [fuOutcome, setFuOutcome] = useState('');
  const [fuNotes, setFuNotes] = useState('');

  // Closing form
  const [clMethod, setClMethod] = useState('');
  const [clOutcome, setClOutcome] = useState('');
  const [clNotes, setClNotes] = useState('');

  // Note
  const [noteText, setNoteText] = useState('');

  const im = INTEREST_META[prospect.interest_level] || INTEREST_META.cold;
  const stageColors = STAGE_COLORS[prospect.stage] || ['#6366F1', '#818CF8'];

  const handleMoveStage = async () => {
    setSaving(true);
    try {
      const updated = await moveProspectStage(prospect.prospect_id, {
        stage: newStage,
        next_action: nextAction || undefined,
        next_action_date: nextDate || undefined,
      });
      setShowStageModal(false);
      onUpdate(updated.data);
    } catch (e) { Alert.alert('Error', e?.message || 'Failed to update stage'); }
    finally { setSaving(false); }
  };

  const handleFollowup = async () => {
    setSaving(true);
    try {
      await addProspectFollowup(prospect.prospect_id, {
        followup_type: fuType || 'General',
        outcome: fuOutcome,
        notes: fuNotes,
        next_action: nextAction || undefined,
        next_action_date: nextDate || undefined,
      });
      setShowFollowupModal(false);
      setFuType(''); setFuOutcome(''); setFuNotes('');
      onUpdate(null); // trigger refresh
    } catch (e) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleClosing = async () => {
    setSaving(true);
    try {
      await addProspectClosing(prospect.prospect_id, {
        closing_method: clMethod,
        outcome: clOutcome,
        notes: clNotes,
      });
      setShowClosingModal(false);
      setClMethod(''); setClOutcome(''); setClNotes('');
      onUpdate(null);
    } catch (e) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      await addProspectNote(prospect.prospect_id, noteText.trim());
      setShowNoteModal(false);
      setNoteText('');
      onUpdate(null);
    } catch (e) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const openShareModal = () => {
    setShowAssignModal(true);
  };

  useEffect(() => {
    if (!autoOpen) return;
    if (autoOpen === 'action_invite') setShowInviteModal(true);
    else if (autoOpen === 'action_present') openShareModal();
    else if (autoOpen === 'action_followup') setShowFollowupModal(true);
    else if (autoOpen === 'action_close') setShowClosingModal(true);
  }, [autoOpen, prospect.prospect_id]);

  return (
    <View style={{ flex: 1 }}>
      {/* ── Compact Profile Header ── */}
      <LinearGradient colors={stageColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, padding: 14, marginBottom: 12, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -20, top: -20, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{prospect.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>{prospect.name}</Text>
              {isWatching ? (
                <Animated.View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.35)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, transform: [{ scale: watchPulse }], borderWidth: 1, borderColor: 'rgba(16,185,129,0.6)' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 5 }} />
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>WATCHING NOW</Text>
                </Animated.View>
              ) : recentlyClosed ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.3)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 5 }} />
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>CLOSED VIDEO</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>{prospect.phone}</Text>
          </View>
          <TouchableOpacity onPress={async () => {
            setShowScoreInfo(true);
            if (!scoreBreakdown) {
              setScoreLoading(true);
              try {
                const res = await getProspectScoreBreakdown(prospect.prospect_id);
                setScoreBreakdown(res.data);
              } catch (e) {
                setScoreBreakdown(null);
              } finally {
                setScoreLoading(false);
              }
            }
          }} style={{ alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 18 }}>{prospect.interest_score ?? 0}</Text>
              <Info color="rgba(255,255,255,0.6)" size={12} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '800', marginTop: 2 }}>SCORE</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Next Best Action (compact inline) ── */}
      <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Zap color="#F59E0B" size={15} />
        <Text style={{ flex: 1, fontSize: 12, color: C.text, lineHeight: 16 }} numberOfLines={2}>
          {prospect.interest_score > 60
            ? `${prospect.name.split(' ')[0]} is highly engaged — send the Closing Script!`
            : `Send a presentation to ${prospect.name.split(' ')[0]} to start tracking engagement.`}
        </Text>
        {prospect.interest_score > 60 ? (
          <TouchableOpacity onPress={() => setShowClosingModal(true)} style={{ backgroundColor: '#10B981', paddingVertical: 6, paddingHorizontal: 11, borderRadius: 9 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Close</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={openShareModal} style={{ backgroundColor: '#3B82F6', paddingVertical: 6, paddingHorizontal: 11, borderRadius: 9 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Present</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Action Buttons (2×2 grid) ── */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Invite', icon: <Target size={13} color="#fff" />, bg: '#8B5CF6', action: () => setShowInviteModal(true) },
          { label: 'Move Stage', icon: <ArrowRight size={13} color="#fff" />, bg: '#6366F1', action: () => setShowStageModal(true) },
          { label: 'Add Note', icon: <User size={13} color="#fff" />, bg: '#F59E0B', action: () => setShowNoteModal(true) },
          { label: 'Follow-up', icon: <MessageSquare size={13} color="#fff" />, bg: '#10B981', action: () => setShowFollowupModal(true) },
        ].map(btn => (
          <TouchableOpacity key={btn.label} onPress={btn.action}
            style={{
              flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              backgroundColor: btn.bg, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 11, gap: 6
            }}>
            {btn.icon}
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: C.inputBg, borderRadius: 16, padding: 4, marginBottom: 16 }}>
        {['overview', 'activity', 'notes'].map(t => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(t)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: activeTab === t ? C.surface : 'transparent', alignItems: 'center', shadowColor: activeTab === t ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: activeTab === t ? '800' : '600', color: activeTab === t ? C.text : C.muted, textTransform: 'capitalize' }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <View>
            {[
              ['Email', prospect.email],
              ['Source', prospect.source],
              ['Relationship', prospect.relationship],
              ['Occupation', prospect.occupation],
              ['Location', prospect.location],
              ['Age Range', prospect.age_range],
              ['Telegram', prospect.telegram],
              ['WhatsApp', prospect.whatsapp],
            ].filter(([, v]) => v).map(([label, value]) => (
              <View key={label} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border }}>
                <Text style={{ width: 110, fontSize: 13, color: C.muted, fontWeight: '600' }}>{label}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: C.text }}>{value}</Text>
              </View>
            ))}
            {/* Tags */}
            {prospect.tags?.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 8 }}>TAGS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {prospect.tags.map(tag => (
                    <View key={tag} style={{ backgroundColor: 'rgba(99,102,241,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)' }}>
                      <Text style={{ color: '#6366F1', fontSize: 11, fontWeight: '700' }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}


        {/* Activity tab */}
        {activeTab === 'activity' && (
          <View>
            <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 12 }}>Engagement Analytics</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 8, paddingBottom: 10 }}>
                {/* Fake Analytics Bars based on activity count */}
                {[10, 25, 40, 30, 60, Math.min(100, prospect.activities?.length * 15 || 5)].map((h, i) => (
                  <View key={i} style={{ flex: 1, height: h + '%', backgroundColor: i === 5 ? '#10B981' : 'rgba(99,102,241,0.2)', borderRadius: 4 }} />
                ))}
              </View>
              <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 4 }}>Activity intensity over last 6 interactions</Text>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 12, marginLeft: 4 }}>Recent Interactions</Text>
            {prospect.activities?.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 32 }}>
                <Clock color={C.muted} size={32} />
                <Text style={{ color: C.muted, marginTop: 10, fontSize: 13 }}>No activity yet</Text>
              </View>
            ) : prospect.activities?.map((act, i) => {
              let IconObj = Clock;
              let color = '#6B7280';
              if (act.activity_type === 'created') { IconObj = Plus; color = '#3B82F6'; }
              if (act.activity_type === 'stage_change') { IconObj = ArrowRight; color = '#8B5CF6'; }
              if (act.activity_type === 'followup') { IconObj = MessageSquare; color = '#F59E0B'; }
              if (act.activity_type === 'closing') { IconObj = Target; color = '#10B981'; }
              if (act.activity_type === 'note') { IconObj = User; color = '#EC4899'; }

              return (
                <View key={act.id ?? i} style={{ flexDirection: 'row', marginBottom: 16 }}>
                  <View style={{ width: 44, alignItems: 'center' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                      <IconObj color={color} size={14} />
                    </View>
                    {i < (prospect.activities.length - 1) && <View style={{ width: 2, flex: 1, backgroundColor: C.border, marginTop: -4, marginBottom: -16, zIndex: 1 }} />}
                  </View>
                  <View style={{ flex: 1, backgroundColor: C.inputBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, marginLeft: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{act.title}</Text>
                    {act.description ? <Text style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 18 }}>{act.description}</Text> : null}
                    <Text style={{ fontSize: 10, color: C.muted, marginTop: 8, fontWeight: '600' }}>{fmt(act.created_at)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Notes tab */}

        {activeTab === 'notes' && (
          <View>
            {prospect.notes ? (
              <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 13, color: C.text, lineHeight: 20 }}>{prospect.notes}</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingTop: 32 }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>No notes yet. Tap "Note" to add one.</Text>
              </View>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Score Explanation Modal */}
      <BottomSheet visible={showScoreInfo} onClose={() => setShowScoreInfo(false)} title="Interest Score Breakdown" C={C}>
        {scoreLoading ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <ActivityIndicator color="#6366F1" size="large" />
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>Computing score…</Text>
          </View>
        ) : scoreBreakdown ? (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 44, fontWeight: '900', color: '#FCD34D' }}>
                {scoreBreakdown.final_score ?? 0}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginTop: 4 }}>
                {scoreBreakdown.classification ?? 'Cold'}
              </Text>
            </View>

            {/* Invitation Score */}
            <View style={{ backgroundColor: C.inputBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#8B5CF6' }}>Invitation Score</Text>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#8B5CF6' }}>{scoreBreakdown.invitation?.score ?? 0}</Text>
              </View>
              {scoreBreakdown.invitation?.breakdown?.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12, color: C.text, fontWeight: '500' }}>• {item.label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: item.value >= 0 ? '#10B981' : '#EF4444' }}>
                    {item.value >= 0 ? `+${item.value}` : item.value}
                  </Text>
                </View>
              ))}
              {(!scoreBreakdown.invitation?.breakdown || scoreBreakdown.invitation.breakdown.length === 0) && (
                <Text style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No invitation activity yet</Text>
              )}
            </View>

            {/* Presentation Score */}
            <View style={{ backgroundColor: C.inputBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#06B6D4' }}>Presentation Score</Text>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#06B6D4' }}>{scoreBreakdown.presentation?.score ?? 0}</Text>
              </View>
              {scoreBreakdown.presentation?.breakdown?.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12, color: C.text, fontWeight: '500' }}>• {item.label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: item.value >= 0 ? '#10B981' : '#EF4444' }}>
                    {item.value >= 0 ? `+${item.value}` : item.value}
                  </Text>
                </View>
              ))}
              {(!scoreBreakdown.presentation?.breakdown || scoreBreakdown.presentation.breakdown.length === 0) && (
                <Text style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No presentation activity yet</Text>
              )}
            </View>

            {/* Formula */}
            <View style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#6366F1', marginBottom: 6, textTransform: 'uppercase' }}>Combined Formula</Text>
              <Text style={{ fontSize: 13, color: C.text, lineHeight: 18, fontWeight: '600' }}>
                ({scoreBreakdown.invitation?.score ?? 0} × 0.4) + ({scoreBreakdown.presentation?.score ?? 0} × 0.6) = {scoreBreakdown.final_score ?? 0}
              </Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                Invitation counts for 40% and Presentation counts for 60% of the final score.
              </Text>
            </View>
          </ScrollView>
        ) : (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              Could not load score breakdown.
            </Text>
            <TouchableOpacity onPress={async () => {
              setScoreLoading(true);
              try {
                const res = await getProspectScoreBreakdown(prospect.prospect_id);
                setScoreBreakdown(res.data);
              } catch (e) {
                setScoreBreakdown(null);
              } finally {
                setScoreLoading(false);
              }
            }} style={{ backgroundColor: '#6366F1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>

      {/* Stage Modal */}
      <BottomSheet visible={showStageModal} onClose={() => setShowStageModal(false)} title="Move to Stage" C={C}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {STAGES.map(s => {
            const colors = STAGE_COLORS[s] || ['#6366F1', '#818CF8'];
            const active = newStage === s;
            return (
              <TouchableOpacity key={s} onPress={() => setNewStage(s)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
                  backgroundColor: active ? colors[0] : 'transparent',
                  borderWidth: 1.5, borderColor: active ? colors[0] : C.border
                }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : C.muted }}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <FormField label="Next Action" value={nextAction} onChange={setNextAction} placeholder="e.g. Call tomorrow" C={C} />
        <DatePickerField label="Next Action Date" value={nextDate} onChange={setNextDate} placeholder="Select Date" C={C} />
        <ActionBtn label="Move Stage" onPress={handleMoveStage} saving={saving} color="#6366F1" />
      </BottomSheet>

      {/* Followup Modal (Advanced Wizard) */}
      <BottomSheet visible={showFollowupModal} onClose={() => setShowFollowupModal(false)} title={`Log Follow-up with ${prospect.name}`} C={C}>
        <FollowupWizardContent
          contact={prospect}
          onClose={() => setShowFollowupModal(false)}
          onSaved={() => onUpdate(null)}
          createFollowup={addProspectFollowup}
          C={C}
        />
      </BottomSheet>

      {/* Closing Modal (Advanced Wizard) */}
      <BottomSheet visible={showClosingModal} onClose={() => setShowClosingModal(false)} title={`Closing Attempt for ${prospect.name}`} C={C}>
        <ClosingWizardContent
          contact={prospect}
          onClose={() => setShowClosingModal(false)}
          onSaved={() => onUpdate(null)}
          createClosing={addProspectClosing}
          C={C}
        />
      </BottomSheet>

      {/* Note Modal */}
      <BottomSheet visible={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note" C={C}>
        <FormField label="Note" value={noteText} onChange={setNoteText} placeholder="Write your note..." C={C} multiline />
        <ActionBtn label="Save Note" onPress={handleNote} saving={saving} color="#8B5CF6" />
      </BottomSheet>

      {/* ΓòÉΓòÉ INVITE MODAL ΓÇö Full Multi-Step Flow ΓòÉΓòÉ */}
      <InviteFlowModal
        visible={showInviteModal}
        prospect={prospect}
        onClose={() => setShowInviteModal(false)}
        onSaved={() => { setShowInviteModal(false); onUpdate(null); }}
        C={C}
      />

      {/* Smart Send Presentation Modal */}
      <SmartSendModal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        prospectId={prospect.prospect_id}
        prospectName={prospect.name}
        prospectPhone={prospect.phone}
        prospectInterest={prospect.interest_level}
        onShared={() => onUpdate(null)}
        C={C}
      />
    </View>
  );
};



// ── SmartSendModal ──────────────────────────────────────────────────────
const SHARE_PLATFORMS = [
  {
    key: 'whatsapp', label: 'WhatsApp', emoji: '📱', color: '#25D366',
    getUrl: (phone, msg) => `whatsapp://send?phone=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`
  },
  {
    key: 'telegram', label: 'Telegram', emoji: '✈️', color: '#0088CC',
    getUrl: (phone, msg) => `tg://msg?to=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`
  },
  {
    key: 'sms', label: 'SMS', emoji: '📲', color: '#4CAF50',
    getUrl: (phone, msg) => `sms:${phone}?body=${encodeURIComponent(msg)}`
  },
  {
    key: 'copy', label: 'Copy Link', emoji: '🔗', color: '#6366F1',
    getUrl: null
  },
];

const CONTENT_TYPE_ICONS = {
  video: '🎬', pdf: '📄', compensation_plan: '💰',
  testimonial: '⭐', webinar_replay: '🎙️', explainer_video: '📽️',
};

const SmartSendModal = ({ visible, onClose, prospectId, prospectName, prospectPhone, prospectInterest, onShared, C }) => {
  const [videoLink, setVideoLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [library, setLibrary] = useState([]);
  const [loadingLib, setLoadingLib] = useState(false);
  const [selectedLib, setSelectedLib] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [filterMode, setFilterMode] = useState('All'); // 'All', 'Recent', 'High Conv'

  // Load library when modal opens
  useEffect(() => {
    if (!visible) return;
    setVideoLink(''); setSelectedLib(null); setCopied(false);
    setLoadingLib(true);
    getPresentations()
      .then(res => setLibrary(res.data ?? []))
      .catch(() => setLibrary([]))
      .finally(() => setLoadingLib(false));
  }, [visible]);

  const handleLibSelect = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLib(item === selectedLib ? null : item);
    setVideoLink('');
  };

  const manualLink = videoLink.trim();
  const isLibraryMode = !!selectedLib && !manualLink;
  const hasContent = isLibraryMode || !!manualLink;

  const buildMessage = (link) =>
    `Hi${prospectName ? ' ' + prospectName.split(' ')[0] : ''}! I wanted to share this with you — take a look when you get a chance 😊\n\n${link}`;

  const handleShare = async (platform) => {
    if (!hasContent) {
      Alert.alert('Nothing selected', 'Please select a presentation or paste a link first.');
      return;
    }

    let linkToShare = manualLink;

    if (isLibraryMode) {
      if (!prospectId) {
        Alert.alert('Error', 'No prospect selected.');
        return;
      }
      setAssigning(true);
      try {
        const res = await assignPresentation({ presentation_id: selectedLib.id, prospect_id: prospectId });
        linkToShare = res.tracked_link;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onShared && onShared();
      } catch (e) {
        linkToShare = selectedLib.external_url || selectedLib.file_url || '';
        if (!linkToShare) {
          Alert.alert('No link', 'This presentation has no URL attached.');
          setAssigning(false);
          return;
        }
      } finally {
        setAssigning(false);
      }
    }

    if (!linkToShare) {
      Alert.alert('No link', 'Could not get a link to share.');
      return;
    }

    const messageText = buildMessage(linkToShare);

    if (platform.key === 'copy') {
      await Clipboard.setStringAsync(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }

    const url = platform.getUrl(prospectPhone || '', messageText);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        await Clipboard.setStringAsync(messageText);
        Alert.alert(`${platform.label} not installed`, 'Message copied to clipboard instead.');
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      await Clipboard.setStringAsync(messageText);
      Alert.alert('Could not open app', 'Message copied to clipboard instead.');
    }
  };

  // Mock conversion rates for visual effect
  const getConvRate = (id) => (40 + (id % 40)) + '%';
  const getDuration = (type) => type === 'video' ? '4m 12s' : type === 'pdf' ? '12 Pages' : 'Short';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={40} tint="dark" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ maxHeight: '90%' }}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20 }}>

            {/* Header */}
            <View style={{ paddingTop: 24, paddingHorizontal: 24, paddingBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: C.text }}>Smart Send</Text>
                  <Text style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Select presentation to generate a tracked link</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={{ backgroundColor: C.inputBg, padding: 8, borderRadius: 20 }}>
                  <X color={C.muted} size={20} />
                </TouchableOpacity>
              </View>

              {/* AI Suggestion Card */}
              <FadeIn delay={100}>
                <LinearGradient colors={['rgba(99,102,241,0.15)', 'rgba(139,92,246,0.05)']} style={{ borderRadius: 16, padding: 16, marginTop: 20, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Zap color="#8B5CF6" size={18} />
                    <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '700', color: '#8B5CF6' }}>AI Recommendation</Text>
                  </View>
                  <Text style={{ marginTop: 6, fontSize: 13, color: C.text, lineHeight: 18 }}>
                    Since <Text style={{ fontWeight: '800' }}>{prospectName?.split(' ')[0]}</Text> is a {prospectInterest === 'hot' ? 'Hot' : 'Warm'} prospect, we recommend sending the <Text style={{ fontWeight: '800' }}>3-Min Explainer Video</Text>.
                  </Text>
                </LinearGradient>
              </FadeIn>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}>

              {/* Segmented Control */}
              <View style={{ flexDirection: 'row', backgroundColor: C.inputBg, borderRadius: 12, padding: 4, marginBottom: 20 }}>
                {['All', 'Recent', 'High Conv'].map(mode => (
                  <TouchableOpacity key={mode} onPress={() => { Haptics.selectionAsync(); setFilterMode(mode); }}
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: filterMode === mode ? C.surface : 'transparent', shadowColor: filterMode === mode ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: filterMode === mode ? '800' : '600', color: filterMode === mode ? C.text : C.muted }}>{mode}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Grid of Presentations */}
              {loadingLib ? (
                <ActivityIndicator color={C.accent} style={{ marginVertical: 40 }} />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  {library.map((item, idx) => {
                    const isSelected = selectedLib?.id === item.id;
                    return (
                      <Animated.View key={item.id} style={{ width: '48%', marginBottom: 16 }}>
                        <TouchableOpacity onPress={() => handleLibSelect(item)} activeOpacity={0.8}>
                          <View style={{ height: 120, backgroundColor: C.inputBg, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: isSelected ? '#3B82F6' : C.border }}>
                            {/* Fake thumbnail gradient */}
                            <LinearGradient colors={[C.inputBg, 'rgba(0,0,0,0.6)']} style={{ flex: 1, padding: 12, justifyContent: 'flex-end' }}>
                              {/* Badges */}
                              <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 }}>
                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>⚡ {getConvRate(item.id)}</Text>
                              </View>
                              <Text style={{ color: '#fff', fontSize: 24, position: 'absolute', top: 8, left: 8 }}>
                                {CONTENT_TYPE_ICONS[item.content_type] || '🎬'}
                              </Text>

                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} numberOfLines={2}>
                                {item.title || item.content_type?.replace('_', ' ')}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <Clock color="rgba(255,255,255,0.7)" size={10} />
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginLeft: 4, fontWeight: '600' }}>{getDuration(item.content_type)}</Text>
                              </View>
                            </LinearGradient>
                          </View>
                        </TouchableOpacity>

                        {/* Inline Actions (Slide down when selected) */}
                        {isSelected && (
                          <FadeIn delay={0}>
                            <View style={{ backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 12, padding: 10, marginTop: 8, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' }}>
                              {assigning ? (
                                <ActivityIndicator color="#3B82F6" size="small" />
                              ) : (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  {SHARE_PLATFORMS.map(p => (
                                    <TouchableOpacity key={p.key} onPress={() => handleShare(p)}
                                      style={{ backgroundColor: p.color, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}>
                                      {p.key === 'copy' ? <Text style={{ color: '#fff', fontSize: 14 }}>🔗</Text> : <Text style={{ fontSize: 16 }}>{p.emoji}</Text>}
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
                            </View>
                          </FadeIn>
                        )}
                      </Animated.View>
                    );
                  })}
                </View>
              )}

              {/* Custom Link Option */}
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                  <Text style={{ fontSize: 11, color: C.muted, marginHorizontal: 10, fontWeight: '700' }}>OR CUSTOM LINK (UNTRACKED)</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <TextInput value={videoLink} onChangeText={(t) => { setVideoLink(t); setSelectedLib(null); }} placeholder="https://youtube.com/watch?v=..." placeholderTextColor={C.muted} style={{ flex: 1, color: C.text, fontSize: 14 }} autoCapitalize="none" keyboardType="url" />
                  {videoLink.length > 0 && (
                    <TouchableOpacity onPress={() => { setVideoLink(''); setSelectedLib(null); }}><X color={C.muted} size={16} /></TouchableOpacity>
                  )}
                </View>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
};

// ── Add Prospect Modal ────────────────────────────────────────────────────────
const AddProspectModal = ({ visible, onClose, onSaved, C }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [stage, setStage] = useState('New Lead');
  const [nextAction, setNextAction] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);

  const PRESET_TAGS = ['Warm Lead', 'Cold Lead', 'Entrepreneur', 'Student', 'High Potential', 'Friend', 'Colleague'];

  const toggleTag = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) { Alert.alert('Required', 'Name and phone are required.'); return; }
    setSaving(true);
    try {
      await createProspect({
        name: name.trim(), phone: phone.trim(),
        email: email.trim() || undefined,
        source: source.trim() || undefined,
        stage, next_action: nextAction || undefined,
        next_action_date: nextDate || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      setName(''); setPhone(''); setEmail(''); setSource('');
      setStage('New Lead'); setNextAction(''); setNextDate(''); setTags([]);
      onSaved();
      onClose();
    } catch (e) { Alert.alert('Error', e?.message || 'Failed to create prospect'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, maxHeight: '90%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, flex: 1 }}>New Prospect</Text>
              <TouchableOpacity onPress={onClose}><X color={C.muted} size={20} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <FormField label="Full Name *" value={name} onChange={setName} placeholder="e.g. John Doe" C={C} />
              <FormField label="Phone *" value={phone} onChange={setPhone} placeholder="+251 9..." C={C} />
              <FormField label="Email" value={email} onChange={setEmail} placeholder="john@example.com" C={C} />
              <FormField label="Source" value={source} onChange={setSource} placeholder="Referral, Event, Social..." C={C} />
              <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 8 }}>Initial Stage</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {['New Lead', 'Contacted', 'Invited'].map(s => (
                  <TouchableOpacity key={s} onPress={() => setStage(s)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
                      backgroundColor: stage === s ? '#6366F1' : 'transparent',
                      borderWidth: 1.5, borderColor: stage === s ? '#6366F1' : C.border
                    }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: stage === s ? '#fff' : C.muted }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <FormField label="Next Action" value={nextAction} onChange={setNextAction} placeholder="e.g. Call tomorrow" C={C} />
              <DatePickerField label="Next Action Date" value={nextDate} onChange={setNextDate} placeholder="Select Date" C={C} />
              <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 8 }}>Tags</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {PRESET_TAGS.map(t => {
                  const active = tags.includes(t);
                  return (
                    <TouchableOpacity key={t} onPress={() => toggleTag(t)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                        backgroundColor: active ? '#6366F1' : 'transparent',
                        borderWidth: 1.5, borderColor: active ? '#6366F1' : C.border
                      }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : C.muted }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <ActionBtn label="Create Prospect" onPress={handleSave} saving={saving} color="#6366F1" />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ΓöÇΓöÇ InviteFlowModal ΓÇö Full multi-step invitation workflow ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const INVITE_SCRIPTS = [
  { id: 's1', text: "Hey {name}! I want to share something with you that I think you'll find really interesting. Are you open to it? ≡ƒÿè" },
  { id: 's2', text: "Hi {name}, can I send you a short video? It's only 5 minutes and I think it could change things for you." },
  { id: 's3', text: "Hey {name}! Are you open to seeing a simple business idea? No pressure at all ΓÇö just want to share something exciting." },
  { id: 's4', text: "Hi {name}, I've been thinking about you. I have something I'd love to show you when you have a few minutes. When are you free?" },
  { id: 's5', text: "Hey {name}! Quick question ΓÇö are you open to earning extra income from your phone? I have something to show you." },
];

const MESSAGING_APPS = [
  { key: 'whatsapp', label: 'WhatsApp', emoji: '≡ƒƒó', scheme: (phone, msg) => `whatsapp://send?phone=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}` },
  { key: 'telegram', label: 'Telegram', emoji: 'Γ£ê∩╕Å', scheme: (phone, msg) => `tg://resolve?phone=${phone.replace(/\D/g, '').replace(/^\+/, '')}` },
  { key: 'sms', label: 'SMS', emoji: '≡ƒÆ¼', scheme: (phone, msg) => `sms:${phone}?body=${encodeURIComponent(msg)}` },
  { key: 'imo', label: 'IMO', emoji: '≡ƒô▒', scheme: (phone, msg) => `imo://chat?phone=${phone.replace(/\D/g, '')}` },
  { key: 'messenger', label: 'Messenger', emoji: '≡ƒÆÖ', scheme: (phone, msg) => `fb-messenger://` },
];

const CALL_OUTCOMES = [
  { key: 'success', label: 'Invitation successful', emoji: 'Γ£à', color: '#10B981' },
  { key: 'not_interested', label: 'Not interested', emoji: 'Γ¥î', color: '#EF4444' },
  { key: 'call_later', label: 'Asked to call later', emoji: '≡ƒôå', color: '#F59E0B' },
  { key: 'no_answer', label: 'Did not answer', emoji: '≡ƒöç', color: '#6B7280' },
  { key: 'wrong_number', label: 'Wrong number', emoji: 'ΓÜá∩╕Å', color: '#F97316' },
];

const TEXT_OUTCOMES = [
  { key: 'delivered', label: 'Message delivered ΓÇö prospect is aware', emoji: 'Γ£à', color: '#10B981' },
  { key: 'waiting', label: 'Waiting for reply', emoji: 'ΓÅ│', color: '#F59E0B' },
  { key: 'not_interested', label: 'Prospect not interested', emoji: 'Γ¥î', color: '#EF4444' },
  { key: 'not_active', label: 'Number not active', emoji: '≡ƒô╡', color: '#6B7280' },
];

const InviteFlowModal = ({ visible, prospect, onClose, onSaved, C }) => {
  const [step, setStep] = useState('method');
  const [selectedScript, setSelectedScript] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [saving, setSaving] = useState(false);

  const [successType, setSuccessType] = useState('in_person');
  const [locInput, setLocInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [platformInput, setPlatformInput] = useState('');
  const [callLaterDate, setCallLaterDate] = useState('');
  const [callLaterTime, setCallLaterTime] = useState('');
  const [callAgainDate, setCallAgainDate] = useState('');
  const [callAgainTime, setCallAgainTime] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const phone = prospect?.phone || '';
  const name = prospect?.name || 'there';

  useEffect(() => {
    if (step !== 'calling') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setStep('call_outcome');
    });
    return () => sub.remove();
  }, [step]);

  useEffect(() => {
    if (visible) {
      setStep('method'); setSelectedScript(null);
      setSelectedApp(null); setSelectedOutcome(null); setSaving(false);
      setSuccessType('in_person'); setLocInput(''); setTimeInput('');
      setPlatformInput(''); setCallLaterDate(''); setCallLaterTime('');
      setCallAgainDate(''); setCallAgainTime(''); setNewPhone(phone);
    }
  }, [visible, phone]);

  const personalizeScript = (text) => text.replace('{name}', name.split(' ')[0]);

  const handleCall = async () => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (!cleanPhone) { Alert.alert('No phone number', 'This prospect has no phone number.'); return; }
    try {
      const canOpen = await Linking.canOpenURL(`tel:${cleanPhone}`);
      if (!canOpen) { Alert.alert('Cannot make call', 'Phone calls are not supported on this device.'); return; }
      await Linking.openURL(`tel:${cleanPhone}`);
      setStep('calling');
    } catch (e) { Alert.alert('Error', 'Could not open the phone dialer.'); }
  };

  const handleCallOutcomeSelect = (outcome) => {
    setSelectedOutcome(outcome);
    if (outcome === 'success') setStep('success_details');
    else if (outcome === 'not_interested') submitFinalOutcome('not_interested', 'call', 'Rejected');
    else if (outcome === 'call_later') setStep('call_later_details');
    else if (outcome === 'no_answer') setStep('no_answer_details');
    else if (outcome === 'wrong_number') setStep('wrong_number_details');
  };

  const submitFinalOutcome = async (outcome, type, overrideStage = null, extraData = {}) => {
    setSaving(true);
    try {
      let finalNotes = `${type === 'call' ? 'Call' : 'Text'} invitation — outcome: ${outcome}. `;
      if (extraData.notes) finalNotes += extraData.notes;

      // --- INVITATION INTELLIGENCE LAYER ---
      const intelligence = InvitationBehaviorService.analyze(
        outcome, 
        type, 
        { ...extraData, scriptUsed: selectedScript?.text, platform: selectedApp?.key, notes: finalNotes }, 
        prospect.interest_score || 0
      );
      const nextStep = InvitationNextActionService.generate(intelligence.newTotalScore);
      
      finalNotes += `\n[AI Intent: ${intelligence.intent.level} | Score: ${intelligence.newTotalScore} | Suggested: ${nextStep.action}]`;
      
      let intelligentStage = overrideStage || intelligence.intent.stage;
      let intelligentAction = extraData.next_action || nextStep.action;
      
      let intelligentActionDate = extraData.next_action_date;
      if (!intelligentActionDate && nextStep.days !== undefined) {
          const d = new Date();
          d.setDate(d.getDate() + nextStep.days);
          intelligentActionDate = d.toISOString().split('T')[0];
      }
      // -------------------------------------

      const { createInvitation, moveProspectStage, updateProspect } = require('../../api/authService');

      await createInvitation({
        prospect_id: prospect.prospect_id,
        invitation_type: type === 'call' ? 'one_on_one_call' : 'one_on_one_call',
        notes: finalNotes,
      });

      // Update the prospect with intelligent insights
      const updatePayload = { 
          interest_score: intelligence.newTotalScore 
      };
      if (extraData.new_phone) {
          updatePayload.phone = extraData.new_phone;
      }
      await updateProspect(prospect.prospect_id, updatePayload);

      // Advance pipeline stage
      await moveProspectStage(prospect.prospect_id, { 
          stage: intelligentStage, 
          notes: finalNotes,
          next_action: intelligentAction,
          next_action_date: intelligentActionDate
      });

      setStep('done');
      setTimeout(() => { onSaved(); }, 1500);
    } catch (e) { Alert.alert('Error', e?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 44, maxHeight: '90%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 20 }}>📨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: C.text }}>Invite {name.split(' ')[0]}</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{phone}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X color={C.muted} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {step === 'method' && (
                <View>
                  <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 20 }}>How do you want to invite <Text style={{ color: C.text, fontWeight: '700' }}>{name.split(' ')[0]}</Text>?</Text>
                  <TouchableOpacity onPress={() => setStep('call_confirm')} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1.5, borderColor: 'rgba(59,130,246,0.3)' }}>
                    <Text style={{ fontSize: 32, marginRight: 16 }}>📞</Text>
                    <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>Call Invitation</Text><Text style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Make a live phone call</Text></View>
                    <ChevronRight color="#3B82F6" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('script_select')} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 18, padding: 18, borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.3)' }}>
                    <Text style={{ fontSize: 32, marginRight: 16 }}>💬</Text>
                    <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>Text / Chat Invitation</Text><Text style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>WhatsApp, Telegram, SMS</Text></View>
                    <ChevronRight color="#10B981" size={20} />
                  </TouchableOpacity>
                </View>
              )}

              {step === 'call_confirm' && (
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Text style={{ fontSize: 40 }}>📞</Text></View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 6 }}>Call {name.split(' ')[0]}</Text>
                  <Text style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>{phone}</Text>
                  <TouchableOpacity onPress={handleCall} style={{ backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, width: '100%', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>📞</Text><Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Start Call Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('method')} style={{ paddingVertical: 10 }}><Text style={{ color: C.muted, fontSize: 13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'calling' && (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Text style={{ fontSize: 40 }}>📞</Text></View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 8 }}>Calling {name.split(' ')[0]}…</Text>
                  <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 28 }}>Return to the app once the call ends to log the outcome.</Text>
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Call Ended — Log Outcome</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 'call_outcome' && (
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 16, textAlign: 'center' }}>How did the call with {name.split(' ')[0]} go?</Text>
                  {CALL_OUTCOMES.map(o => (
                    <TouchableOpacity key={o.key} onPress={() => handleCallOutcomeSelect(o.key)} disabled={saving} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: o.color + '12', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: o.color + '30' }}>
                      <Text style={{ fontSize: 22, marginRight: 14 }}>{o.emoji}</Text><Text style={{ fontSize: 14, fontWeight: '700', color: C.text, flex: 1 }}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {step === 'success_details' && (
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#10B981', marginBottom: 16 }}>✅ Awesome! How are you meeting?</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <TouchableOpacity onPress={() => setSuccessType('in_person')} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: successType === 'in_person' ? '#10B981' : C.border, backgroundColor: successType === 'in_person' ? 'rgba(16,185,129,0.1)' : C.inputBg, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: successType === 'in_person' ? '#10B981' : C.muted }}>🤝 In Person</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setSuccessType('platform')} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: successType === 'platform' ? '#10B981' : C.border, backgroundColor: successType === 'platform' ? 'rgba(16,185,129,0.1)' : C.inputBg, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: successType === 'platform' ? '#10B981' : C.muted }}>💻 Via Platform</Text></TouchableOpacity>
                  </View>
                  {successType === 'in_person' ? (
                    <View>
                      <FormField label="Location" value={locInput} onChange={setLocInput} placeholder="e.g. Starbucks downtown" C={C} />
                      <FormField label="Time" value={timeInput} onChange={setTimeInput} placeholder="e.g. Tomorrow at 3 PM" C={C} />
                    </View>
                  ) : (
                    <View>
                      <FormField label="Platform (Zoom, WhatsApp, etc)" value={platformInput} onChange={setPlatformInput} placeholder="e.g. Zoom link / Telegram call" C={C} />
                      <FormField label="Time" value={timeInput} onChange={setTimeInput} placeholder="e.g. Tomorrow at 3 PM" C={C} />
                    </View>
                  )}
                  <ActionBtn label="Save Meeting" color="#10B981" saving={saving} onPress={() => {
                    if ((successType === 'in_person' && (!locInput || !timeInput)) || (successType === 'platform' && (!platformInput || !timeInput))) {
                      Alert.alert('Required', 'Please fill out all meeting details.'); return;
                    }
                    const details = successType === 'in_person' ? `In person at ${locInput} (${timeInput})` : `Via ${platformInput} (${timeInput})`;
                    submitFinalOutcome('success', 'call', 'Presentation Scheduled', { notes: details, next_action: 'Meeting', next_action_date: '' });
                  }} />
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: C.muted, fontSize: 13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'call_later_details' && (
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#F59E0B', marginBottom: 16 }}>📆 When should we call back?</Text>
                  <DatePickerField label="Date" value={callLaterDate} onChange={setCallLaterDate} placeholder="Select Date" C={C} />
                  <DatePickerField label="Time" value={callLaterTime} onChange={setCallLaterTime} placeholder="Select Time" mode="time" C={C} />
                  <ActionBtn label="Set Reminder" color="#F59E0B" saving={saving} onPress={() => {
                    if (!callLaterDate || !callLaterTime) { Alert.alert('Required', 'Please enter date and time.'); return; }
                    submitFinalOutcome('call_later', 'call', 'Follow-Up Needed', { notes: `Call back at ${callLaterTime}`, next_action: 'Call back', next_action_date: callLaterDate });
                    addCalendarEvent(`Follow up with ${name.split(' ')[0]}`, callLaterDate, callLaterTime);
                  }} />
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: C.muted, fontSize: 13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'no_answer_details' && (
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#6B7280', marginBottom: 16 }}>📴 Are you going to call again?</Text>
                  <DatePickerField label="Date to call again" value={callAgainDate} onChange={setCallAgainDate} placeholder="Select Date" C={C} />
                  <DatePickerField label="Time" value={callAgainTime} onChange={setCallAgainTime} placeholder="Select Time" mode="time" C={C} />
                  <ActionBtn label="Save Reminder" color="#6B7280" saving={saving} onPress={() => {
                    if (!callAgainDate) { Alert.alert('Required', 'Date is required to set a reminder.'); return; }
                    submitFinalOutcome('no_answer', 'call', 'Follow-Up Needed', { notes: `Will call again at ${callAgainTime}`, next_action: 'Call again', next_action_date: callAgainDate });
                    addCalendarEvent(`Call ${name.split(' ')[0]} again`, callAgainDate, callAgainTime);
                  }} />
                  <TouchableOpacity onPress={() => submitFinalOutcome('no_answer', 'call')} style={{ paddingVertical: 16, alignItems: 'center' }}><Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700' }}>No, do not remind me</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: C.muted, fontSize: 13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'wrong_number_details' && (
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#F97316', marginBottom: 16 }}>⚠️ Wrong Number</Text>
                  <Text style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Do you have the correct number? Edit it below to update the prospect and call again.</Text>
                  <FormField label="Correct Phone Number" value={newPhone} onChange={setNewPhone} placeholder="+123..." C={C} />
                  <ActionBtn label="Update & Save" color="#F97316" saving={saving} onPress={() => {
                    if (!newPhone || newPhone === phone) { Alert.alert('Wait', 'Update the phone number first.'); return; }
                    submitFinalOutcome('wrong_number', 'call', null, { new_phone: newPhone, notes: `Number corrected to ${newPhone}` });
                  }} />
                  <TouchableOpacity onPress={() => submitFinalOutcome('wrong_number', 'call', 'Rejected')} style={{ paddingVertical: 16, alignItems: 'center' }}><Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700' }}>No, move to Rejected</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: C.muted, fontSize: 13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'script_select' && (
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 14 }}>Choose a script for {name.split(' ')[0]}:</Text>
                  {INVITE_SCRIPTS.map(s => {
                    const isSelected = selectedScript?.id === s.id;
                    return (
                      <TouchableOpacity key={s.id} onPress={() => setSelectedScript(s)} style={{ backgroundColor: isSelected ? 'rgba(16,185,129,0.12)' : C.inputBg, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: isSelected ? '#10B981' : C.border }}>
                        <Text style={{ fontSize: 13, color: isSelected ? '#10B981' : C.text, lineHeight: 20, fontStyle: 'italic' }}>"${personalizeScript(s.text)}"</Text>
                        {isSelected && <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700', marginTop: 6 }}>✅ Selected</Text>}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity onPress={() => { if (!selectedScript) { Alert.alert('Select a script first'); return; } setStep('app_select'); }} style={{ backgroundColor: '#10B981', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Next — Choose App →</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('method')} style={{ paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: C.muted, fontSize: 13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'app_select' && (
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 12 }}>Send via:</Text>
                  {MESSAGING_APPS.map(app => (
                    <TouchableOpacity key={app.key} onPress={async () => {
                      setSelectedApp(app);
                      const cleanPhone = phone.replace(/\s/g, '');
                      const msg = personalizeScript(selectedScript?.text || '');
                      const url = app.scheme(cleanPhone, msg);
                      try {
                        const canOpen = await Linking.canOpenURL(url);
                        if (!canOpen) { await Clipboard.setStringAsync(msg); Alert.alert(`${app.label} not found`, 'Message copied to clipboard.', [{ text: 'OK', onPress: () => setStep('text_confirm') }]); return; }
                        await Linking.openURL(url);
                        if (['telegram', 'imo', 'messenger'].includes(app.key)) {
                          await Clipboard.setStringAsync(msg); Alert.alert('📝 Script copied!', `Paste it in the ${app.label} chat.`, [{ text: 'Got it', onPress: () => setStep('text_confirm') }]);
                        } else setStep('text_confirm');
                      } catch (e) { Alert.alert('Error', `Could not open ${app.label}.`); }
                    }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: C.border }}>
                      <Text style={{ fontSize: 26, marginRight: 14 }}>{app.emoji}</Text>
                      <View style={{ flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{app.label}</Text></View>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setStep('script_select')} style={{ paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: C.muted, fontSize: 13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'text_confirm' && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: C.text, marginBottom: 8 }}>Message sent via {selectedApp?.label}</Text>
                  <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 24 }}>Was the invitation delivered successfully?</Text>
                  <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                    <TouchableOpacity onPress={() => setStep('text_outcome')} style={{ flex: 1, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.3)' }}><Text style={{ color: '#10B981', fontWeight: '800', fontSize: 14 }}>Yes, delivered</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setStep('text_outcome')} style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)' }}><Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 14 }}>No, failed</Text></TouchableOpacity>
                  </View>
                </View>
              )}

              {step === 'text_outcome' && (
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 16, textAlign: 'center' }}>What was the response from {name.split(' ')[0]}?</Text>
                  {TEXT_OUTCOMES.map(o => (
                    <TouchableOpacity key={o.key} onPress={() => submitFinalOutcome(o.key, 'text')} disabled={saving} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: o.color + '12', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: o.color + '30' }}>
                      <Text style={{ fontSize: 22, marginRight: 14 }}>{o.emoji}</Text><Text style={{ fontSize: 14, fontWeight: '700', color: C.text, flex: 1 }}>{o.label}</Text>
                      {saving && <ActivityIndicator color={o.color} size="small" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {step === 'done' && (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 8 }}>Invitation Logged!</Text>
                  <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>The outcome has been saved to {name.split(' ')[0]}'s profile and their score updated.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ── Shared sub-components ───────────────────────────────────────────────────────────────────────

const DatePickerField = ({ label, value, onChange, placeholder, C, mode = 'date' }) => {
  const [show, setShow] = useState(false);

  const handleConfirm = (event, selectedDate) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      if (mode === 'date') {
        const d = new Date(selectedDate);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        onChange(d.toISOString().split('T')[0]);
      } else {
        const t = new Date(selectedDate);
        const hrs = t.getHours() % 12 || 12;
        const mins = t.getMinutes().toString().padStart(2, '0');
        const ampm = t.getHours() >= 12 ? 'PM' : 'AM';
        onChange(`${hrs}:${mins} ${ampm}`);
      }
    }
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, height: 46, justifyContent: 'center' }}>
        <Text style={{ color: value ? C.text : C.muted, fontSize: 14 }}>{value || placeholder}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value && mode === 'date' ? new Date(value) : new Date()}
          mode={mode}
          display="default"
          onChange={handleConfirm}
        />
      )}
    </View>
  );
};

const addCalendarEvent = async (title, dateStr, timeStr) => {
  try {
    const { status } = await CalendarAPI.requestCalendarPermissionsAsync();
    if (status === 'granted') {
      const calendars = await CalendarAPI.getCalendarsAsync(CalendarAPI.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(c => c.isPrimary) || calendars[0];
      if (!defaultCalendar) return;

      let startDate = new Date();
      if (dateStr) {
        startDate = new Date(dateStr);
      }

      if (timeStr) {
        const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          let [_, h, m, ampm] = timeMatch;
          h = parseInt(h);
          if (ampm && ampm.toUpperCase() === 'PM' && h < 12) h += 12;
          if (ampm && ampm.toUpperCase() === 'AM' && h === 12) h = 0;
          startDate.setHours(h, parseInt(m), 0);
        }
      }

      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later

      await CalendarAPI.createEventAsync(defaultCalendar.id, {
        title,
        startDate,
        endDate,
        timeZone: 'GMT',
        alarms: [{ relativeOffset: -15, method: CalendarAPI.AlarmMethod.ALERT }]
      });
      Alert.alert('Calendar', 'Reminder added to your calendar!');
    }
  } catch (e) {
    console.log('Calendar error:', e);
  }
};

const FormField = ({ label, value, onChange, placeholder, C, multiline }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor={C.muted} multiline={multiline} numberOfLines={multiline ? 3 : 1}
      style={{
        backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: multiline ? 10 : 0,
        height: multiline ? 80 : 46, color: C.text, fontSize: 14,
        textAlignVertical: multiline ? 'top' : 'center'
      }} />
  </View>
);

const PillRow = ({ options, value, onChange, C }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
    {options.map(opt => {
      const active = value === opt;
      return (
        <TouchableOpacity key={opt} onPress={() => onChange(opt)}
          style={{
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
            backgroundColor: active ? C.accent : 'transparent',
            borderWidth: 1.5, borderColor: active ? C.accent : C.border
          }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : C.muted }}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const ActionBtn = ({ label, onPress, saving, color }) => (
  <TouchableOpacity onPress={onPress} disabled={saving}
    style={{ backgroundColor: color, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
    {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{label}</Text>}
  </TouchableOpacity>
);

const BottomSheet = ({ visible, onClose, title, children, C }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} activeOpacity={1} onPress={onClose} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      <View style={{
        backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40
      }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, flex: 1 }}>{title}</Text>
          <TouchableOpacity onPress={onClose}><X color={C.muted} size={20} /></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);


// ——— Main Screen —————————————————————————————————————————————————————————————————————————————————————
const ProspectsScreen = ({ C }) => {
  const [view, setView] = useState('dashboard'); // dashboard | list | profile
  const [dashData, setDashData] = useState(null);
  const [globalAction, setGlobalAction] = useState(null); // 'action_invite', 'action_present', 'action_followup', 'action_close'
  const [globalProspect, setGlobalProspect] = useState(null);
  const [prospects, setProspects] = useState([]);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [listFilter, setListFilter] = useState({});

  const loadDashboard = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await getProspectDashboard();
      setDashData(res.data);
    } catch (e) { console.error('Prospect dashboard error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const loadProspects = useCallback(async (filter = {}) => {
    try {
      setLoading(true);
      const res = await getProspects(filter);
      setProspects(res.data ?? []);
    } catch (e) { console.error('Prospects load error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, []);

  // Set up WebSocket listener for Real-time Engagement Pulse
  useEffect(() => {
    let echoChannel = null;
    let distId = null;

    const setupEcho = async () => {
      try {
        const echo = await initEcho();
        if (!echo) return;

        // Try to get distributor ID from the first prospect or from dashData in the future
        if (prospects.length > 0) distId = prospects[0].distributor_id;
        if (!distId) return;

        echoChannel = echo.channel(`distributor.${distId}`);
        echoChannel.listen('.PresentationEngaged', (e) => {
          console.log('⚡ Real-time Engagement Received:', e);

          // Flash haptic feedback on live engagement!
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // If looking at the profile of the person who just engaged, update them locally instantly
          setSelectedProspect(prev => {
            if (prev && prev.prospect_id === e.prospectId) {
              return {
                ...prev,
                interest_score: Math.max(prev.interest_score || 0, e.score),
                interest_level: e.score >= 81 ? 'hot' : e.score >= 21 ? 'warm' : 'cold'
              };
            }
            return prev;
          });

          // Background refresh dashboard & list for latest scores
          loadDashboard(true);
          loadProspects(listFilter);
        });
      } catch (err) {
        console.error('Echo setup failed:', err);
      }
    };

    setupEcho();

    return () => {
      if (echoChannel && distId) {
        const echo = require('../../api/authService').getEcho();
        if (echo) echo.leaveChannel(`distributor.${distId}`);
      }
    };
  }, [prospects.length > 0 ? prospects[0].distributor_id : null]);

  const handleNavigate = (target, data = {}) => {
    if (target === 'list') {
      setListFilter(data);
      loadProspects(data);
      setView('list');
    } else if (target === 'profile') {
      setSelectedProspect(data);
      setView('profile');
    } else if (target === 'dashboard') {
      loadDashboard(true);
      setView('dashboard');
    }
  };

  const handleTopLevelAction = (key) => {
    if (key === 'dashboard') { handleNavigate('dashboard'); }
    else if (key === 'list') { handleNavigate('list'); }
    else { setGlobalAction(key); setGlobalProspect(null); }
  };

  const handleProfileUpdate = (updated) => {
    if (updated) {
      setSelectedProspect(updated);
    } else {
      // Refresh the prospect from server
      if (selectedProspect) {
        getProspects({}).then(res => {
          const fresh = (res.data ?? []).find(p => p.prospect_id === selectedProspect.prospect_id);
          if (fresh) setSelectedProspect(fresh);
        }).catch(() => { });
      }
    }
    loadDashboard(true);
  };

  const handleBack = () => {
    if (view === 'profile') {
      setView('list');
      loadProspects(listFilter);
    } else {
      setView('dashboard');
      loadDashboard(true);
    }
  };

  if (loading && view === 'dashboard' && !dashData) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} size="large" />
        <Text style={{ color: C.muted, marginTop: 12, fontSize: 13 }}>Loading prospects...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        {view !== 'dashboard' && (
          <TouchableOpacity onPress={handleBack}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: C.border }}>
            <ChevronRight color={C.text} size={18} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.text }}>
            {view === 'dashboard' ? 'Prospects' : view === 'list' ? (listFilter.stage || 'All Prospects') : selectedProspect?.name}
          </Text>
          <Text style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
            {view === 'dashboard' ? 'Recruitment pipeline' : view === 'list' ? `${prospects.length} prospects` : selectedProspect?.stage}
          </Text>
        </View>
        {view !== 'profile' && (
          <TouchableOpacity onPress={() => setShowAdd(true)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, gap: 6 }}>
            <Plus color="#fff" size={16} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Top Navigation Tabs */}
      {view !== 'profile' && (
        <View style={{ flexDirection: 'row', backgroundColor: C.inputBg, borderRadius: 14, padding: 3, marginBottom: 10 }}>
          {[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'list', label: 'Prospects' },
          ].map(t => (
            <TouchableOpacity key={t.key}
              onPress={() => handleTopLevelAction(t.key)}
              style={{
                flex: 1, paddingVertical: 9, borderRadius: 11,
                backgroundColor: view === t.key ? C.accent : 'transparent', alignItems: 'center'
              }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: view === t.key ? '#fff' : C.muted }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Global Actions Row */}
      {view === 'list' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, flexGrow: 0 }} contentContainerStyle={{ paddingRight: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => handleTopLevelAction('action_invite')}
              style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 20, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#fff', fontWeight: '800' }}>Invite</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleTopLevelAction('action_present')}
              style={{ backgroundColor: '#3B82F6', paddingHorizontal: 20, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#fff', fontWeight: '800' }}>Present</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleTopLevelAction('action_followup')}
              style={{ backgroundColor: C.accent, paddingHorizontal: 20, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#fff', fontWeight: '800' }}>Follow-up</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleTopLevelAction('action_close')}
              style={{ backgroundColor: C.green, paddingHorizontal: 20, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#fff', fontWeight: '800' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Content */}
      {view === 'dashboard' && (
        <DashboardView
          data={dashData}
          onNavigate={handleNavigate}
          C={C}
        />
      )}

      {view === 'list' && (
        <ListView
          prospects={prospects}
          loading={loading}
          onPress={(p) => handleNavigate('profile', p)}
          onAdd={() => setShowAdd(true)}
          onRefresh={() => { setRefreshing(true); loadProspects(listFilter); }}
          refreshing={refreshing}
          filter={listFilter}
          C={C}
        />
      )}

      {view === 'profile' && selectedProspect && (
        <ProfileView
          prospect={selectedProspect}
          onBack={handleBack}
          onUpdate={handleProfileUpdate}
          autoOpen={globalAction}
          C={C}
        />
      )}

      {/* Add Prospect Modal */}
      <AddProspectModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => {
          loadDashboard(true);
          if (view === 'list') loadProspects(listFilter);
        }}
        C={C}
      />

      {/* Global Action Picker Modal */}
      <Modal visible={!!globalAction && !globalProspect} transparent animationType="slide" onRequestClose={() => setGlobalAction(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
                Select Prospect to {globalAction === 'action_invite' ? 'Invite' : globalAction === 'action_present' ? 'Send Presentation' : globalAction === 'action_followup' ? 'Follow-up' : 'Close'}
              </Text>
              <TouchableOpacity onPress={() => setGlobalAction(null)}><X color={C.text} size={20} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {prospects.length === 0 ? (
                <Text style={{ color: C.muted, textAlign: 'center', marginTop: 20 }}>No prospects available. Go to Prospects tab and add one first.</Text>
              ) : prospects.map(p => (
                <TouchableOpacity key={p.prospect_id} onPress={() => { setGlobalProspect(p); handleNavigate('profile', p); }} style={{ padding: 14, backgroundColor: C.inputBg, marginBottom: 8, borderRadius: 12 }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{p.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{p.phone}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Global Modals have been removed, we auto-open the existing modals in ProfileView */}
    </View>
  );
};

// Simple BottomModal wrapper for global actions
const BottomModal = ({ visible, onClose, title, children, C }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} activeOpacity={1} onPress={onClose} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, flex: 1 }}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <X color={C.muted} size={20} />
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

export default ProspectsScreen;

