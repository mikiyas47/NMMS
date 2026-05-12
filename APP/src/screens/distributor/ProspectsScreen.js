import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, RefreshControl, Alert,
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  Linking, AppState,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Target, Users, Flame, TrendingUp, Clock, CheckCircle2,
  Plus, Search, X, ChevronRight, AlertTriangle, Star,
  MessageSquare, Phone, ArrowRight, BarChart2, Zap,
  User, Calendar, Award, Filter,
} from 'lucide-react-native';
import {
  getProspectDashboard, getProspects, createProspect,
  moveProspectStage, addProspectFollowup, addProspectClosing,
  addProspectNote, deleteProspect, updateProspect,
  createInvitation, getPresentations, assignPresentation, logPresentationCallOutcome,
  getProspectInvitations, getProspectAssignments,
} from '../../api/authService';

const { width } = Dimensions.get('window');

// ── Constants ─────────────────────────────────────────────────────────────────
const STAGES = [
  'New Lead','Contacted','Invited','Awaiting Response',
  'Presentation Scheduled','Presentation Completed',
  'Follow-Up Needed','Closing','Joined','Rejected','Inactive',
];

const STAGE_COLORS = {
  'New Lead':                ['#6366F1','#818CF8'],
  'Contacted':               ['#3B82F6','#60A5FA'],
  'Invited':                 ['#8B5CF6','#A78BFA'],
  'Awaiting Response':       ['#F59E0B','#FCD34D'],
  'Presentation Scheduled':  ['#EC4899','#F472B6'],
  'Presentation Completed':  ['#06B6D4','#67E8F9'],
  'Follow-Up Needed':        ['#EF4444','#F87171'],
  'Closing':                 ['#F97316','#FB923C'],
  'Joined':                  ['#10B981','#34D399'],
  'Rejected':                ['#6B7280','#9CA3AF'],
  'Inactive':                ['#374151','#6B7280'],
};

const INTEREST_META = {
  hot:  { color: '#EF4444', bg: 'rgba(239,68,68,0.15)',  label: '🔥 Hot',  score: 70 },
  warm: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: '🌡 Warm', score: 35 },
  cold: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)',label: '❄️ Cold', score: 0  },
};

const PRIORITY_COLORS = {
  urgent: '#EF4444', high: '#F59E0B', normal: '#6366F1', low: '#6B7280',
};

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
};

const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  return d < today;
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

// ── Animated helpers ──────────────────────────────────────────────────────────
const FadeIn = ({ delay = 0, children }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue:1, duration:380, delay, useNativeDriver:true }),
      Animated.timing(ty, { toValue:0, duration:380, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity:op, transform:[{translateY:ty}] }}>{children}</Animated.View>;
};

const ScoreBar = ({ score, C }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: score, duration:700, delay:200, useNativeDriver:false }).start();
  }, [score]);
  const color = score >= 70 ? '#EF4444' : score >= 35 ? '#F59E0B' : '#6B7280';
  return (
    <View style={{ height:6, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
      <Animated.View style={{
        height:6, borderRadius:3, backgroundColor:color,
        width: anim.interpolate({ inputRange:[0,100], outputRange:['0%','100%'] }),
      }} />
    </View>
  );
};


// ── Dashboard Section ─────────────────────────────────────────────────────────
const DashboardView = ({ data, onNavigate, C }) => {
  if (!data) return null;
  const { analytics, hot_leads, follow_ups_due, overdue, closing_opps, newly_joined, stage_counts } = data;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Hero banner */}
      <FadeIn delay={0}>
        <LinearGradient colors={['#1E1B4B','#312E81','#4338CA']}
          start={{x:0,y:0}} end={{x:1,y:1}}
          style={{ borderRadius:22, padding:20, marginBottom:16, overflow:'hidden' }}>
          <View style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,255,255,0.04)' }} />
          <Text style={{ color:'rgba(255,255,255,0.5)', fontSize:10, fontWeight:'700', letterSpacing:1.2 }}>PROSPECT ENGINE</Text>
          <Text style={{ color:'#fff', fontSize:20, fontWeight:'900', marginTop:2, marginBottom:14 }}>Recruitment Dashboard</Text>
          <View style={{ flexDirection:'row', gap:10 }}>
            {[
              { label:'Total', value:analytics?.total ?? 0, color:'#60A5FA' },
              { label:'Joined', value:analytics?.joined ?? 0, color:'#34D399' },
              { label:'Conv. Rate', value:`${analytics?.conversion_rate ?? 0}%`, color:'#FCD34D' },
              { label:'Avg Score', value:analytics?.avg_score ?? 0, color:'#F472B6' },
            ].map(s => (
              <View key={s.label} style={{ flex:1, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:12, padding:10, alignItems:'center' }}>
                <Text style={{ color:s.color, fontWeight:'900', fontSize:16 }}>{s.value}</Text>
                <Text style={{ color:'rgba(255,255,255,0.5)', fontSize:9, marginTop:2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </FadeIn>

      {/* Interest breakdown */}
      <FadeIn delay={60}>
        <View style={{ flexDirection:'row', gap:8, marginBottom:16 }}>
          {[
            { key:'hot',  label:'🔥 Hot',  value:analytics?.hot_count ?? 0,  color:'#EF4444' },
            { key:'warm', label:'🌡 Warm', value:analytics?.warm_count ?? 0, color:'#F59E0B' },
            { key:'cold', label:'❄️ Cold', value:analytics?.cold_count ?? 0, color:'#6B7280' },
          ].map(s => (
            <TouchableOpacity key={s.key} onPress={() => onNavigate('list', { interest_level: s.key })}
              style={{ flex:1, backgroundColor:C.surface, borderRadius:16, padding:14, alignItems:'center', borderWidth:1, borderColor:C.border }}>
              <Text style={{ color:s.color, fontWeight:'900', fontSize:22 }}>{s.value}</Text>
              <Text style={{ color:C.muted, fontSize:11, marginTop:3 }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </FadeIn>

      {/* Overdue alert */}
      {overdue?.length > 0 && (
        <FadeIn delay={80}>
          <TouchableOpacity onPress={() => onNavigate('list', { overdue: true })}
            style={{ backgroundColor:'rgba(239,68,68,0.1)', borderRadius:16, padding:14, marginBottom:14, borderWidth:1.5, borderColor:'rgba(239,68,68,0.3)', flexDirection:'row', alignItems:'center' }}>
            <AlertTriangle color="#EF4444" size={20} />
            <View style={{ flex:1, marginLeft:12 }}>
              <Text style={{ color:'#EF4444', fontWeight:'800', fontSize:14 }}>{overdue.length} Overdue Follow-Up{overdue.length > 1 ? 's' : ''}</Text>
              <Text style={{ color:C.muted, fontSize:12, marginTop:2 }}>These prospects need immediate attention</Text>
            </View>
            <ChevronRight color="#EF4444" size={16} />
          </TouchableOpacity>
        </FadeIn>
      )}

      {/* Follow-ups due today */}
      {follow_ups_due?.length > 0 && (
        <FadeIn delay={100}>
          <SectionCard title="📅 Follow-Ups Due Today" count={follow_ups_due.length} color="#F59E0B" C={C}>
            {follow_ups_due.slice(0,3).map(p => (
              <ProspectRow key={p.prospect_id} prospect={p} onPress={() => onNavigate('profile', p)} C={C} />
            ))}
          </SectionCard>
        </FadeIn>
      )}

      {/* Hot leads */}
      {hot_leads?.length > 0 && (
        <FadeIn delay={120}>
          <SectionCard title="🔥 Hot Leads" count={hot_leads.length} color="#EF4444" C={C}>
            {hot_leads.slice(0,3).map(p => (
              <ProspectRow key={p.prospect_id} prospect={p} onPress={() => onNavigate('profile', p)} C={C} />
            ))}
          </SectionCard>
        </FadeIn>
      )}

      {/* Closing opportunities */}
      {closing_opps?.length > 0 && (
        <FadeIn delay={140}>
          <SectionCard title="🎯 Closing Opportunities" count={closing_opps.length} color="#F97316" C={C}>
            {closing_opps.slice(0,3).map(p => (
              <ProspectRow key={p.prospect_id} prospect={p} onPress={() => onNavigate('profile', p)} C={C} />
            ))}
          </SectionCard>
        </FadeIn>
      )}

      {/* Newly joined */}
      {newly_joined?.length > 0 && (
        <FadeIn delay={160}>
          <SectionCard title="🎉 Newly Joined" count={newly_joined.length} color="#10B981" C={C}>
            {newly_joined.slice(0,3).map(p => (
              <ProspectRow key={p.prospect_id} prospect={p} onPress={() => onNavigate('profile', p)} C={C} />
            ))}
          </SectionCard>
        </FadeIn>
      )}

      {/* Stage counts */}
      <FadeIn delay={180}>
        <View style={{ backgroundColor:C.surface, borderRadius:18, padding:16, marginBottom:16, borderWidth:1, borderColor:C.border }}>
          <Text style={{ fontSize:14, fontWeight:'800', color:C.text, marginBottom:12 }}>Pipeline Overview</Text>
          {STAGES.filter(s => (stage_counts?.[s] ?? 0) > 0).map(stage => {
            const count = stage_counts?.[stage] ?? 0;
            const colors = STAGE_COLORS[stage] || ['#6366F1','#818CF8'];
            return (
              <TouchableOpacity key={stage} onPress={() => onNavigate('list', { stage })}
                style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
                <View style={{ width:10, height:10, borderRadius:5, backgroundColor:colors[0], marginRight:10 }} />
                <Text style={{ flex:1, fontSize:13, color:C.text, fontWeight:'600' }}>{stage}</Text>
                <View style={{ backgroundColor:colors[0]+'22', paddingHorizontal:10, paddingVertical:3, borderRadius:10 }}>
                  <Text style={{ color:colors[0], fontWeight:'800', fontSize:12 }}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </FadeIn>
      <View style={{ height:32 }} />
    </ScrollView>
  );
};

const SectionCard = ({ title, count, color, children, C }) => (
  <View style={{ backgroundColor:C.surface, borderRadius:18, padding:16, marginBottom:14, borderWidth:1, borderColor:C.border }}>
    <View style={{ flexDirection:'row', alignItems:'center', marginBottom:12 }}>
      <Text style={{ flex:1, fontSize:14, fontWeight:'800', color:C.text }}>{title}</Text>
      <View style={{ backgroundColor:color+'22', paddingHorizontal:10, paddingVertical:3, borderRadius:10 }}>
        <Text style={{ color, fontWeight:'800', fontSize:12 }}>{count}</Text>
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
      style={{ flexDirection:'row', alignItems:'center', paddingVertical:10, borderBottomWidth:1, borderColor:C.border }}>
      <View style={{ width:38, height:38, borderRadius:19, backgroundColor:im.bg, alignItems:'center', justifyContent:'center', marginRight:12 }}>
        <Text style={{ color:im.color, fontWeight:'800', fontSize:15 }}>{prospect.name?.charAt(0)?.toUpperCase()}</Text>
      </View>
      <View style={{ flex:1 }}>
        <Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{prospect.name}</Text>
        <Text style={{ fontSize:11, color:C.muted, marginTop:1 }}>{prospect.stage}</Text>
        {prospect.next_action && (
          <Text style={{ fontSize:11, color: overdue ? '#EF4444' : dueToday ? '#F59E0B' : C.muted, marginTop:1 }} numberOfLines={1}>
            {overdue ? '⚠️ ' : dueToday ? '📅 ' : '→ '}{prospect.next_action}
          </Text>
        )}
      </View>
      <View style={{ alignItems:'flex-end', gap:4 }}>
        <View style={{ backgroundColor:im.bg, paddingHorizontal:8, paddingVertical:3, borderRadius:8 }}>
          <Text style={{ color:im.color, fontSize:10, fontWeight:'800' }}>{prospect.interest_score ?? 0}</Text>
        </View>
        <ChevronRight color={C.muted} size={14} />
      </View>
    </TouchableOpacity>
  );
};


// ── List View ─────────────────────────────────────────────────────────────────
const ListView = ({ prospects, loading, onPress, onAdd, onRefresh, refreshing, filter, C }) => {
  const [search, setSearch] = useState('');
  const filtered = prospects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  );

  return (
    <View style={{ flex:1 }}>
      {/* Search */}
      <View style={{ flexDirection:'row', alignItems:'center', backgroundColor:C.inputBg, borderWidth:1, borderColor:C.border, borderRadius:12, paddingHorizontal:12, height:42, marginBottom:12 }}>
        <Search color={C.muted} size={15} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search prospects..."
          placeholderTextColor={C.muted} style={{ flex:1, marginLeft:8, color:C.text, fontSize:14 }} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><X color={C.muted} size={14} /></TouchableOpacity>}
      </View>

      {/* Filter badge */}
      {filter?.stage && (
        <View style={{ backgroundColor:'rgba(99,102,241,0.12)', borderRadius:10, paddingHorizontal:12, paddingVertical:6, alignSelf:'flex-start', marginBottom:10, borderWidth:1, borderColor:'rgba(99,102,241,0.25)' }}>
          <Text style={{ color:'#6366F1', fontSize:12, fontWeight:'700' }}>Stage: {filter.stage}</Text>
        </View>
      )}

      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
          {filtered.length === 0 ? (
            <View style={{ alignItems:'center', paddingTop:60 }}>
              <Users color={C.muted} size={40} />
              <Text style={{ color:C.muted, fontSize:14, fontWeight:'600', marginTop:12 }}>No prospects found</Text>
              <TouchableOpacity onPress={onAdd} style={{ marginTop:16, backgroundColor:C.accent, paddingHorizontal:20, paddingVertical:10, borderRadius:12 }}>
                <Text style={{ color:'#fff', fontWeight:'700' }}>+ Add First Prospect</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.map(p => (
            <TouchableOpacity key={p.prospect_id} onPress={() => onPress(p)}
              style={{ backgroundColor:C.surface, borderRadius:18, padding:14, marginBottom:10, borderWidth:1, borderColor:C.border }}>
              <View style={{ flexDirection:'row', alignItems:'center' }}>
                {/* Avatar with interest color */}
                <View style={{ width:46, height:46, borderRadius:23, backgroundColor:(INTEREST_META[p.interest_level]?.bg || 'rgba(99,102,241,0.15)'), alignItems:'center', justifyContent:'center', marginRight:12 }}>
                  <Text style={{ color:(INTEREST_META[p.interest_level]?.color || '#6366F1'), fontWeight:'800', fontSize:18 }}>
                    {p.name?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex:1 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={{ fontSize:15, fontWeight:'800', color:C.text }}>{p.name}</Text>
                    {p.priority === 'urgent' && <Text style={{ fontSize:10 }}>🚨</Text>}
                    {p.priority === 'high' && <Text style={{ fontSize:10 }}>⚡</Text>}
                  </View>
                  <Text style={{ fontSize:12, color:C.muted, marginTop:2 }}>{p.phone}</Text>
                  {/* Stage badge */}
                  <View style={{ flexDirection:'row', alignItems:'center', marginTop:5, gap:6 }}>
                    <View style={{ backgroundColor:(STAGE_COLORS[p.stage]?.[0] || '#6366F1')+'22', paddingHorizontal:8, paddingVertical:2, borderRadius:8 }}>
                      <Text style={{ color:(STAGE_COLORS[p.stage]?.[0] || '#6366F1'), fontSize:10, fontWeight:'700' }}>{p.stage}</Text>
                    </View>
                    {p.next_action_date && (
                      <Text style={{ fontSize:10, color: isOverdue(p.next_action_date) ? '#EF4444' : isToday(p.next_action_date) ? '#F59E0B' : C.muted }}>
                        {isOverdue(p.next_action_date) ? '⚠️ Overdue' : isToday(p.next_action_date) ? '📅 Today' : fmt(p.next_action_date)}
                      </Text>
                    )}
                  </View>
                </View>
                {/* Score */}
                <View style={{ alignItems:'flex-end', gap:4 }}>
                  <Text style={{ fontSize:16, fontWeight:'900', color:(INTEREST_META[p.interest_level]?.color || C.muted) }}>
                    {p.interest_score ?? 0}
                  </Text>
                  <Text style={{ fontSize:9, color:C.muted }}>score</Text>
                </View>
              </View>
              {/* Next action */}
              {p.next_action && (
                <View style={{ marginTop:10, backgroundColor:C.inputBg, borderRadius:10, paddingHorizontal:10, paddingVertical:6, flexDirection:'row', alignItems:'center' }}>
                  <ArrowRight color={C.muted} size={12} />
                  <Text style={{ fontSize:12, color:C.muted, marginLeft:6, flex:1 }} numberOfLines={1}>{p.next_action}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          <View style={{ height:32 }} />
        </ScrollView>
      )}
    </View>
  );
};


// ── Profile View ──────────────────────────────────────────────────────────────
const ProfileView = ({ prospect, onBack, onUpdate, C }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showStageModal, setShowStageModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Invite form
  const [inviteType, setInviteType] = useState('zoom');
  const [inviteScript, setInviteScript] = useState('');
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
  const stageColors = STAGE_COLORS[prospect.stage] || ['#6366F1','#818CF8'];

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

  const openPresentationModal = () => {
    setShowPresentationModal(true);
  };

  return (
    <View style={{ flex:1 }}>
      {/* Profile header */}
      <LinearGradient colors={stageColors} start={{x:0,y:0}} end={{x:1,y:1}}
        style={{ borderRadius:20, padding:18, marginBottom:14, overflow:'hidden' }}>
        <View style={{ position:'absolute', right:-20, top:-20, width:100, height:100, borderRadius:50, backgroundColor:'rgba(255,255,255,0.06)' }} />
        <View style={{ flexDirection:'row', alignItems:'center', marginBottom:12 }}>
          <View style={{ width:52, height:52, borderRadius:26, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center', marginRight:14 }}>
            <Text style={{ color:'#fff', fontWeight:'900', fontSize:22 }}>{prospect.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ color:'#fff', fontSize:18, fontWeight:'900' }}>{prospect.name}</Text>
            <Text style={{ color:'rgba(255,255,255,0.7)', fontSize:13, marginTop:2 }}>{prospect.phone}</Text>
            {prospect.occupation && <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:12 }}>{prospect.occupation}</Text>}
          </View>
          <View style={{ alignItems:'flex-end' }}>
            <Text style={{ color:'#FCD34D', fontWeight:'900', fontSize:24 }}>{prospect.interest_score ?? 0}</Text>
            <Text style={{ color:'rgba(255,255,255,0.5)', fontSize:10 }}>score</Text>
          </View>
        </View>
        {/* Stage + interest */}
        <View style={{ flexDirection:'row', gap:8 }}>
          <View style={{ backgroundColor:'rgba(255,255,255,0.15)', paddingHorizontal:12, paddingVertical:5, borderRadius:10 }}>
            <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>{prospect.stage}</Text>
          </View>
          <View style={{ backgroundColor:'rgba(255,255,255,0.15)', paddingHorizontal:12, paddingVertical:5, borderRadius:10 }}>
            <Text style={{ color:'#FCD34D', fontWeight:'700', fontSize:12 }}>{im.label}</Text>
          </View>
        </View>
        {/* Score bar */}
        <View style={{ marginTop:12 }}>
          <ScoreBar score={prospect.interest_score ?? 0} C={{ text:'#fff' }} />
        </View>
      </LinearGradient>

      {/* Next action */}
      {prospect.next_action && (
        <View style={{ backgroundColor: isOverdue(prospect.next_action_date) ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
          borderRadius:14, padding:12, marginBottom:12, borderWidth:1,
          borderColor: isOverdue(prospect.next_action_date) ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)',
          flexDirection:'row', alignItems:'center' }}>
          <Clock color={isOverdue(prospect.next_action_date) ? '#EF4444' : '#F59E0B'} size={16} />
          <View style={{ flex:1, marginLeft:10 }}>
            <Text style={{ fontSize:13, fontWeight:'700', color:C.text }}>{prospect.next_action}</Text>
            {prospect.next_action_date && (
              <Text style={{ fontSize:11, color: isOverdue(prospect.next_action_date) ? '#EF4444' : '#F59E0B', marginTop:2 }}>
                {isOverdue(prospect.next_action_date) ? '⚠️ Overdue — ' : '📅 '}
                {fmt(prospect.next_action_date)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Action buttons — row 1 */}
      <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
        {[
          { label:'Move Stage', color:'#6366F1', onPress:() => setShowStageModal(true) },
          { label:'Follow-up',  color:'#10B981', onPress:() => setShowFollowupModal(true) },
          { label:'Close',      color:'#F97316', onPress:() => setShowClosingModal(true) },
          { label:'Note',       color:'#8B5CF6', onPress:() => setShowNoteModal(true) },
        ].map(btn => (
          <TouchableOpacity key={btn.label} onPress={btn.onPress}
            style={{ flex:1, backgroundColor:btn.color+'18', borderRadius:12, paddingVertical:10, alignItems:'center', borderWidth:1, borderColor:btn.color+'33' }}>
            <Text style={{ color:btn.color, fontWeight:'700', fontSize:11 }}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Action buttons — row 2: Invite & Send Presentation */}
      <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
        <TouchableOpacity onPress={() => setShowInviteModal(true)}
          style={{ flex:1, backgroundColor:'rgba(139,92,246,0.12)', borderRadius:12, paddingVertical:10, alignItems:'center', borderWidth:1, borderColor:'rgba(139,92,246,0.3)', flexDirection:'row', justifyContent:'center', gap:6 }}>
          <Users color="#8B5CF6" size={13} />
          <Text style={{ color:'#8B5CF6', fontWeight:'700', fontSize:11 }}>Send Invite</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openPresentationModal}
          style={{ flex:1, backgroundColor:'rgba(59,130,246,0.12)', borderRadius:12, paddingVertical:10, alignItems:'center', borderWidth:1, borderColor:'rgba(59,130,246,0.3)', flexDirection:'row', justifyContent:'center', gap:6 }}>
          <Zap color="#3B82F6" size={13} />
          <Text style={{ color:'#3B82F6', fontWeight:'700', fontSize:11 }}>Send Presentation</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection:'row', backgroundColor:C.inputBg, borderRadius:12, padding:3, marginBottom:12 }}>
        {['overview','activity','notes'].map(t => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(t)}
            style={{ flex:1, paddingVertical:8, borderRadius:10, backgroundColor:activeTab===t ? C.accent : 'transparent', alignItems:'center' }}>
            <Text style={{ fontSize:12, fontWeight:'700', color:activeTab===t ? '#fff' : C.muted, textTransform:'capitalize' }}>{t}</Text>
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
            ].filter(([,v]) => v).map(([label, value]) => (
              <View key={label} style={{ flexDirection:'row', paddingVertical:10, borderBottomWidth:1, borderColor:C.border }}>
                <Text style={{ width:110, fontSize:13, color:C.muted, fontWeight:'600' }}>{label}</Text>
                <Text style={{ flex:1, fontSize:13, color:C.text }}>{value}</Text>
              </View>
            ))}
            {/* Tags */}
            {prospect.tags?.length > 0 && (
              <View style={{ marginTop:12 }}>
                <Text style={{ fontSize:12, color:C.muted, fontWeight:'600', marginBottom:8 }}>TAGS</Text>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
                  {prospect.tags.map(tag => (
                    <View key={tag} style={{ backgroundColor:'rgba(99,102,241,0.12)', paddingHorizontal:10, paddingVertical:4, borderRadius:10, borderWidth:1, borderColor:'rgba(99,102,241,0.25)' }}>
                      <Text style={{ color:'#6366F1', fontSize:11, fontWeight:'700' }}>{tag}</Text>
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
            {prospect.activities?.length === 0 ? (
              <View style={{ alignItems:'center', paddingTop:32 }}>
                <Clock color={C.muted} size={32} />
                <Text style={{ color:C.muted, marginTop:10, fontSize:13 }}>No activity yet</Text>
              </View>
            ) : prospect.activities?.map((act, i) => (
              <View key={act.id ?? i} style={{ flexDirection:'row', marginBottom:14 }}>
                <View style={{ width:32, alignItems:'center' }}>
                  <View style={{ width:10, height:10, borderRadius:5, backgroundColor:'#6366F1', marginTop:4 }} />
                  {i < (prospect.activities.length - 1) && <View style={{ width:2, flex:1, backgroundColor:C.border, marginTop:4 }} />}
                </View>
                <View style={{ flex:1, marginLeft:10 }}>
                  <Text style={{ fontSize:13, fontWeight:'700', color:C.text }}>{act.title}</Text>
                  {act.description ? <Text style={{ fontSize:12, color:C.muted, marginTop:2 }}>{act.description}</Text> : null}
                  <Text style={{ fontSize:10, color:C.muted, marginTop:4 }}>{fmt(act.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Notes tab */}
        {activeTab === 'notes' && (
          <View>
            {prospect.notes ? (
              <View style={{ backgroundColor:C.surface, borderRadius:14, padding:14, borderWidth:1, borderColor:C.border }}>
                <Text style={{ fontSize:13, color:C.text, lineHeight:20 }}>{prospect.notes}</Text>
              </View>
            ) : (
              <View style={{ alignItems:'center', paddingTop:32 }}>
                <Text style={{ color:C.muted, fontSize:13 }}>No notes yet. Tap "Note" to add one.</Text>
              </View>
            )}
          </View>
        )}
        <View style={{ height:40 }} />
      </ScrollView>

      {/* Stage Modal */}
      <BottomSheet visible={showStageModal} onClose={() => setShowStageModal(false)} title="Move to Stage" C={C}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:14 }}>
          {STAGES.map(s => {
            const colors = STAGE_COLORS[s] || ['#6366F1','#818CF8'];
            const active = newStage === s;
            return (
              <TouchableOpacity key={s} onPress={() => setNewStage(s)}
                style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:20, marginRight:8,
                  backgroundColor: active ? colors[0] : 'transparent',
                  borderWidth:1.5, borderColor: active ? colors[0] : C.border }}>
                <Text style={{ fontSize:12, fontWeight:'700', color: active ? '#fff' : C.muted }}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <FormField label="Next Action" value={nextAction} onChange={setNextAction} placeholder="e.g. Call tomorrow" C={C} />
        <FormField label="Next Action Date (YYYY-MM-DD)" value={nextDate} onChange={setNextDate} placeholder="2026-05-20" C={C} />
        <ActionBtn label="Move Stage" onPress={handleMoveStage} saving={saving} color="#6366F1" />
      </BottomSheet>

      {/* Followup Modal */}
      <BottomSheet visible={showFollowupModal} onClose={() => setShowFollowupModal(false)} title="Log Follow-Up" C={C}>
        <Text style={{ fontSize:12, color:C.muted, fontWeight:'600', marginBottom:8 }}>Type</Text>
        <PillRow options={['Call','Message','Meeting','Presentation','Other']} value={fuType} onChange={setFuType} C={C} />
        <Text style={{ fontSize:12, color:C.muted, fontWeight:'600', marginBottom:8 }}>Outcome</Text>
        <PillRow options={['Interested','Not Interested','Needs More Info','No Answer','Scheduled']} value={fuOutcome} onChange={setFuOutcome} C={C} />
        <FormField label="Notes" value={fuNotes} onChange={setFuNotes} placeholder="What happened?" C={C} multiline />
        <ActionBtn label="Save Follow-Up" onPress={handleFollowup} saving={saving} color="#10B981" />
      </BottomSheet>

      {/* Closing Modal */}
      <BottomSheet visible={showClosingModal} onClose={() => setShowClosingModal(false)} title="Closing Attempt" C={C}>
        <Text style={{ fontSize:12, color:C.muted, fontWeight:'600', marginBottom:8 }}>Method</Text>
        <PillRow options={['Direct Ask','Trial Close','Assumptive','Urgency']} value={clMethod} onChange={setClMethod} C={C} />
        <Text style={{ fontSize:12, color:C.muted, fontWeight:'600', marginBottom:8 }}>Outcome</Text>
        <PillRow options={['Positive','Neutral','Negative','Closed','Scheduled']} value={clOutcome} onChange={setClOutcome} C={C} />
        <FormField label="Notes" value={clNotes} onChange={setClNotes} placeholder="Details..." C={C} multiline />
        <ActionBtn label="Save Closing" onPress={handleClosing} saving={saving} color="#F97316" />
      </BottomSheet>

      {/* Note Modal */}
      <BottomSheet visible={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note" C={C}>
        <FormField label="Note" value={noteText} onChange={setNoteText} placeholder="Write your note..." C={C} multiline />
        <ActionBtn label="Save Note" onPress={handleNote} saving={saving} color="#8B5CF6" />
      </BottomSheet>

      {/* ══ INVITE MODAL — Full Multi-Step Flow ══ */}
      <InviteFlowModal
        visible={showInviteModal}
        prospect={prospect}
        onClose={() => setShowInviteModal(false)}
        onSaved={() => { setShowInviteModal(false); onUpdate(null); }}
        C={C}
      />

      <PresentationFlowModal visible={showPresentationModal} prospect={prospect} onClose={() => setShowPresentationModal(false)} onSaved={() => { setShowPresentationModal(false); onUpdate(null); }} C={C} />
    </View>
  );
};

// ── PresentationFlowModal — Full presentation workflow (Call vs Send) ─────────────────────
const PresentationFlowModal = ({ visible, prospect, onClose, onSaved, C }) => {
  const [step, setStep] = useState('method'); // method | call_confirm | calling | call_outcome | send_select | app_select | text_confirm | text_outcome | done
  const [presentations, setPresentations] = useState([]);
  const [selectedPres, setSelectedPres] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [trackedLink, setTrackedLink] = useState('');
  const [saving, setSaving] = useState(false);

  const phone = prospect?.phone || '';
  const name  = prospect?.name  || 'there';

  useEffect(() => {
    if (visible) {
      setStep('method'); setSelectedPres(null);
      setSelectedApp(null); setSelectedOutcome(null); setSaving(false); setTrackedLink('');
    }
  }, [visible]);

  // Auto-detect return from phone dialer
  useEffect(() => {
    if (step !== 'calling') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setStep('call_outcome');
    });
    return () => sub.remove();
  }, [step]);

  const PRESENTATION_CALL_OUTCOMES = [
    { key:'Understood Presentation',      label:'Understood Presentation', emoji:'🧠', color:'#10B981' },
    { key:'Interested',                   label:'Interested',              emoji:'✅', color:'#10B981' },
    { key:'Needs More Information',       label:'Needs More Info',         emoji:'ℹ️', color:'#3B82F6' },
    { key:'Wants Time To Think',          label:'Wants Time To Think',     emoji:'⏳', color:'#F59E0B' },
    { key:'Asked About Pricing',          label:'Asked About Pricing',     emoji:'💰', color:'#8B5CF6' },
    { key:'Asked About Business Opportunity', label:'Asked About Business', emoji:'📈', color:'#6366F1' },
    { key:'Not Interested',               label:'Not Interested',          emoji:'❌', color:'#EF4444' },
    { key:'Did Not Answer',               label:'Did Not Answer',          emoji:'🔇', color:'#6B7280' },
  ];

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

  const handleFetchPresentations = async () => {
    setSaving(true);
    try {
      const r = await getPresentations();
      setPresentations(r.data ?? []);
      setStep('send_select');
    } catch(e) {
      Alert.alert('Error', 'Failed to fetch presentations.');
    } finally {
      setSaving(false);
    }
  };

  const generateLink = async () => {
    if (!selectedPres) { Alert.alert('Select a presentation first.'); return; }
    setSaving(true);
    try {
      const res = await assignPresentation({ presentation_id: selectedPres.id, prospect_id: prospect.prospect_id });
      setTrackedLink(res.tracked_link);
      setStep('app_select');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to generate link.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendLink = async () => {
    if (!selectedApp || !trackedLink) return;
    const cleanPhone = phone.replace(/\s/g, '');
    const msg = `Hey ${name.split(' ')[0]}, here is the presentation I mentioned: ${trackedLink}`;
    const url = selectedApp.scheme(cleanPhone, msg);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        await Clipboard.setStringAsync(msg);
        Alert.alert(`${selectedApp.label} not found`, 'The message has been copied to your clipboard. Open the app manually and paste it.', [{ text: 'OK', onPress: () => setStep('text_confirm') }]);
        return;
      }
      await Linking.openURL(url);
      if (['telegram','imo','messenger'].includes(selectedApp.key)) {
        await Clipboard.setStringAsync(msg);
        Alert.alert('📋 Script copied!', `Your message has been copied. Paste it in the ${selectedApp.label} chat.`, [{ text: 'Got it', onPress: () => setStep('text_confirm') }]);
      } else {
        setStep('text_confirm');
      }
    } catch (e) { Alert.alert('Error', `Could not open ${selectedApp.label}.`); }
  };

  const saveCallOutcome = async (outcome) => {
    setSaving(true);
    try {
      await logPresentationCallOutcome({ prospect_id: prospect.prospect_id, outcome: outcome });
      setSelectedOutcome(outcome);
      setStep('done');
      setTimeout(() => { onSaved(); }, 1500);
    } catch (e) { Alert.alert('Error', e?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
          <View style={{ backgroundColor:C.surface, borderTopLeftRadius:28, borderTopRightRadius:28, paddingHorizontal:22, paddingTop:16, paddingBottom:44, maxHeight:'90%' }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:C.border, alignSelf:'center', marginBottom:16 }} />
            <View style={{ flexDirection:'row', alignItems:'center', marginBottom:20 }}>
              <View style={{ width:40, height:40, borderRadius:12, backgroundColor:'rgba(59,130,246,0.15)', alignItems:'center', justifyContent:'center', marginRight:12 }}>
                <Text style={{ fontSize:20 }}>🎬</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:16, fontWeight:'900', color:C.text }}>Present to {name.split(' ')[0]}</Text>
                <Text style={{ fontSize:12, color:C.muted, marginTop:1 }}>{phone}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding:4 }}><X color={C.muted} size={20} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              {step === 'method' && (
                <View>
                  <Text style={{ fontSize:13, color:C.muted, textAlign:'center', marginBottom:20 }}>How do you want to present to <Text style={{ color:C.text, fontWeight:'700' }}>{name.split(' ')[0]}</Text>?</Text>
                  <TouchableOpacity onPress={() => setStep('call_confirm')} style={{ flexDirection:'row', alignItems:'center', backgroundColor:'rgba(59,130,246,0.1)', borderRadius:18, padding:18, marginBottom:12, borderWidth:1.5, borderColor:'rgba(59,130,246,0.3)' }}>
                    <Text style={{ fontSize:32, marginRight:16 }}>📞</Text>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:16, fontWeight:'800', color:C.text }}>Call Presentation</Text>
                      <Text style={{ fontSize:12, color:C.muted, marginTop:3 }}>Make a live phone call directly</Text>
                    </View>
                    <ChevronRight color="#3B82F6" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleFetchPresentations} style={{ flexDirection:'row', alignItems:'center', backgroundColor:'rgba(139,92,246,0.1)', borderRadius:18, padding:18, borderWidth:1.5, borderColor:'rgba(139,92,246,0.3)' }}>
                    {saving ? <ActivityIndicator color="#8B5CF6" style={{marginRight:16}} /> : <Text style={{ fontSize:32, marginRight:16 }}>📤</Text>}
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:16, fontWeight:'800', color:C.text }}>Send Presentation File</Text>
                      <Text style={{ fontSize:12, color:C.muted, marginTop:3 }}>Send an uploaded Video, PDF, or Comp Plan</Text>
                    </View>
                    <ChevronRight color="#8B5CF6" size={20} />
                  </TouchableOpacity>
                </View>
              )}

              {step === 'call_confirm' && (
                <View style={{ alignItems:'center' }}>
                  <Text style={{ fontSize:18, fontWeight:'900', color:C.text, marginBottom:16 }}>Call {name.split(' ')[0]}</Text>
                  <TouchableOpacity onPress={handleCall} style={{ backgroundColor:'#3B82F6', borderRadius:16, paddingVertical:16, paddingHorizontal:40, flexDirection:'row', alignItems:'center', gap:10, marginBottom:12, width:'100%', justifyContent:'center' }}>
                    <Text style={{ fontSize:20 }}>📞</Text>
                    <Text style={{ color:'#fff', fontWeight:'900', fontSize:16 }}>Start Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('method')} style={{ paddingVertical:10 }}><Text style={{ color:C.muted, fontSize:13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'calling' && (
                <View style={{ alignItems:'center', paddingVertical:20 }}>
                  <Text style={{ fontSize:18, fontWeight:'900', color:C.text, marginBottom:8 }}>Calling {name.split(' ')[0]}…</Text>
                  <Text style={{ fontSize:13, color:C.muted, textAlign:'center', marginBottom:28 }}>Return to the app once the call ends.</Text>
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ backgroundColor:'#3B82F6', borderRadius:16, paddingVertical:14, paddingHorizontal:32, width:'100%', alignItems:'center' }}>
                    <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Call Ended — Log Outcome</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 'call_outcome' && (
                <View>
                  <Text style={{ fontSize:14, fontWeight:'800', color:C.text, marginBottom:16, textAlign:'center' }}>Presentation Outcome for {name.split(' ')[0]}</Text>
                  {PRESENTATION_CALL_OUTCOMES.map(o => (
                    <TouchableOpacity key={o.key} onPress={() => saveCallOutcome(o.key)} disabled={saving} style={{ flexDirection:'row', alignItems:'center', backgroundColor:o.color+'12', borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor:o.color+'30' }}>
                      <Text style={{ fontSize:22, marginRight:14 }}>{o.emoji}</Text>
                      <Text style={{ fontSize:14, fontWeight:'700', color:C.text, flex:1 }}>{o.label}</Text>
                      {saving && <ActivityIndicator color={o.color} size="small" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {step === 'send_select' && (
                <View>
                  <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:14 }}>Choose a presentation to send:</Text>
                  {presentations.length === 0 ? (
                    <Text style={{ color:C.muted, textAlign:'center', marginTop:20 }}>No presentations available.</Text>
                  ) : presentations.map(p => {
                    const isSelected = selectedPres?.id === p.id;
                    return (
                      <TouchableOpacity key={p.id} onPress={() => setSelectedPres(p)} style={{ flexDirection:'row', alignItems:'center', padding:12, borderRadius:14, marginBottom:8, backgroundColor: isSelected ? 'rgba(139,92,246,0.12)' : C.inputBg, borderWidth:1.5, borderColor: isSelected ? '#8B5CF6' : C.border }}>
                        <Text style={{ fontSize:20, marginRight:12 }}>{p.content_type === 'video' ? '🎬' : p.content_type === 'compensation_plan' ? '📈' : '📄'}</Text>
                        <View style={{ flex:1 }}>
                          <Text style={{ fontSize:13, fontWeight:'700', color:C.text }}>{p.title || p.content_type}</Text>
                          <Text style={{ fontSize:11, color:C.muted, marginTop:2, textTransform:'capitalize' }}>{p.content_type?.replace('_',' ')}</Text>
                        </View>
                        {isSelected && <Text style={{ color:'#8B5CF6', fontSize:18 }}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity onPress={generateLink} style={{ backgroundColor:'#8B5CF6', borderRadius:14, height:50, alignItems:'center', justifyContent:'center', marginTop:6 }}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Next — Choose App →</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('method')} style={{ paddingVertical:10, alignItems:'center' }}><Text style={{ color:C.muted, fontSize:13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'app_select' && (
                <View>
                  <View style={{ backgroundColor:C.inputBg, borderRadius:12, padding:12, marginBottom:16, borderWidth:1, borderColor:C.border }}>
                    <Text style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Tracked link to send:</Text>
                    <Text style={{ fontSize:12, color:C.text }}>{trackedLink}</Text>
                  </View>
                  <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:12 }}>Send via:</Text>
                  {MESSAGING_APPS.map(app => (
                    <TouchableOpacity key={app.key} onPress={() => { setSelectedApp(app); handleSendLink(); }} style={{ flexDirection:'row', alignItems:'center', backgroundColor:C.inputBg, borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor:C.border }}>
                      <Text style={{ fontSize:26, marginRight:14 }}>{app.emoji}</Text>
                      <View style={{ flex:1 }}>
                        <Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{app.label}</Text>
                      </View>
                      <ChevronRight color={C.muted} size={16} />
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setStep('send_select')} style={{ paddingVertical:10, alignItems:'center' }}><Text style={{ color:C.muted, fontSize:13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'text_confirm' && (
                <View style={{ alignItems:'center' }}>
                  <Text style={{ fontSize:32, marginBottom:12 }}>{selectedApp?.emoji}</Text>
                  <Text style={{ fontSize:16, fontWeight:'900', color:C.text, marginBottom:8 }}>Link sent via {selectedApp?.label}</Text>
                  <TouchableOpacity onPress={() => { setStep('done'); setTimeout(() => { onSaved(); }, 1500); }} style={{ backgroundColor:'#10B981', borderRadius:14, paddingVertical:14, width:'100%', alignItems:'center' }}>
                    <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 'done' && (
                <View style={{ alignItems:'center', paddingVertical:24 }}>
                  <Text style={{ fontSize:48, marginBottom:12 }}>🎉</Text>
                  <Text style={{ fontSize:18, fontWeight:'900', color:C.text, marginBottom:8 }}>Presentation Logged!</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};



// ── Add Prospect Modal ────────────────────────────────────────────────────────
const AddProspectModal = ({ visible, onClose, onSaved, C }) => {
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [email, setEmail]     = useState('');
  const [source, setSource]   = useState('');
  const [stage, setStage]     = useState('New Lead');
  const [nextAction, setNextAction] = useState('');
  const [nextDate, setNextDate]     = useState('');
  const [tags, setTags]       = useState([]);
  const [saving, setSaving]   = useState(false);

  const PRESET_TAGS = ['Warm Lead','Cold Lead','Entrepreneur','Student','High Potential','Friend','Colleague'];

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
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:20, paddingTop:16, paddingBottom:40, maxHeight:'90%' }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:C.border, alignSelf:'center', marginBottom:16 }} />
            <View style={{ flexDirection:'row', alignItems:'center', marginBottom:18 }}>
              <Text style={{ fontSize:18, fontWeight:'800', color:C.text, flex:1 }}>New Prospect</Text>
              <TouchableOpacity onPress={onClose}><X color={C.muted} size={20} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <FormField label="Full Name *" value={name} onChange={setName} placeholder="e.g. John Doe" C={C} />
              <FormField label="Phone *" value={phone} onChange={setPhone} placeholder="+251 9..." C={C} />
              <FormField label="Email" value={email} onChange={setEmail} placeholder="john@example.com" C={C} />
              <FormField label="Source" value={source} onChange={setSource} placeholder="Referral, Event, Social..." C={C} />
              <Text style={{ fontSize:12, color:C.muted, fontWeight:'600', marginBottom:8 }}>Initial Stage</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:14 }}>
                {['New Lead','Contacted','Invited'].map(s => (
                  <TouchableOpacity key={s} onPress={() => setStage(s)}
                    style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:20, marginRight:8,
                      backgroundColor: stage===s ? '#6366F1' : 'transparent',
                      borderWidth:1.5, borderColor: stage===s ? '#6366F1' : C.border }}>
                    <Text style={{ fontSize:12, fontWeight:'700', color: stage===s ? '#fff' : C.muted }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <FormField label="Next Action" value={nextAction} onChange={setNextAction} placeholder="e.g. Call tomorrow" C={C} />
              <FormField label="Next Action Date (YYYY-MM-DD)" value={nextDate} onChange={setNextDate} placeholder="2026-05-20" C={C} />
              <Text style={{ fontSize:12, color:C.muted, fontWeight:'600', marginBottom:8 }}>Tags</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:18 }}>
                {PRESET_TAGS.map(t => {
                  const active = tags.includes(t);
                  return (
                    <TouchableOpacity key={t} onPress={() => toggleTag(t)}
                      style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:20,
                        backgroundColor: active ? '#6366F1' : 'transparent',
                        borderWidth:1.5, borderColor: active ? '#6366F1' : C.border }}>
                      <Text style={{ fontSize:12, fontWeight:'700', color: active ? '#fff' : C.muted }}>{t}</Text>
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

// ── InviteFlowModal — Full multi-step invitation workflow ─────────────────────
const INVITE_SCRIPTS = [
  { id:'s1', text:"Hey {name}! I want to share something with you that I think you'll find really interesting. Are you open to it? 😊" },
  { id:'s2', text:"Hi {name}, can I send you a short video? It's only 5 minutes and I think it could change things for you." },
  { id:'s3', text:"Hey {name}! Are you open to seeing a simple business idea? No pressure at all — just want to share something exciting." },
  { id:'s4', text:"Hi {name}, I've been thinking about you. I have something I'd love to show you when you have a few minutes. When are you free?" },
  { id:'s5', text:"Hey {name}! Quick question — are you open to earning extra income from your phone? I have something to show you." },
];

const MESSAGING_APPS = [
  { key:'whatsapp',  label:'WhatsApp',  emoji:'🟢', scheme: (phone, msg) => `whatsapp://send?phone=${phone.replace(/\D/g,'')}&text=${encodeURIComponent(msg)}` },
  { key:'telegram',  label:'Telegram',  emoji:'✈️',  scheme: (phone, msg) => `tg://resolve?phone=${phone.replace(/\D/g,'').replace(/^\+/,'')}` },
  { key:'sms',       label:'SMS',       emoji:'💬', scheme: (phone, msg) => `sms:${phone}?body=${encodeURIComponent(msg)}` },
  { key:'imo',       label:'IMO',       emoji:'📱', scheme: (phone, msg) => `imo://chat?phone=${phone.replace(/\D/g,'')}` },
  { key:'messenger', label:'Messenger', emoji:'💙', scheme: (phone, msg) => `fb-messenger://` },
];

const CALL_OUTCOMES = [
  { key:'success',      label:'Invitation successful', emoji:'✅', color:'#10B981' },
  { key:'not_interested',label:'Not interested',       emoji:'❌', color:'#EF4444' },
  { key:'call_later',   label:'Asked to call later',   emoji:'📆', color:'#F59E0B' },
  { key:'no_answer',    label:'Did not answer',        emoji:'🔇', color:'#6B7280' },
  { key:'wrong_number', label:'Wrong number',          emoji:'⚠️', color:'#F97316' },
];

const TEXT_OUTCOMES = [
  { key:'delivered',     label:'Message delivered — prospect is aware', emoji:'✅', color:'#10B981' },
  { key:'waiting',       label:'Waiting for reply',                     emoji:'⏳', color:'#F59E0B' },
  { key:'not_interested',label:'Prospect not interested',               emoji:'❌', color:'#EF4444' },
  { key:'not_active',    label:'Number not active',                     emoji:'📵', color:'#6B7280' },
];

const InviteFlowModal = ({ visible, prospect, onClose, onSaved, C }) => {
  // step: 'method' | 'call_confirm' | 'calling' | 'call_outcome' | 'script_select' | 'app_select' | 'text_confirm' | 'text_outcome' | 'done'
  const [step, setStep]             = useState('method');
  const [selectedScript, setSelectedScript] = useState(null);
  const [selectedApp, setSelectedApp]       = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [saving, setSaving]         = useState(false);

  const phone = prospect?.phone || '';
  const name  = prospect?.name  || 'there';

  // Auto-detect return from phone dialer
  useEffect(() => {
    if (step !== 'calling') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setStep('call_outcome');
    });
    return () => sub.remove();
  }, [step]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setStep('method'); setSelectedScript(null);
      setSelectedApp(null); setSelectedOutcome(null); setSaving(false);
    }
  }, [visible]);

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

  const handleSendText = async () => {
    if (!selectedApp || !selectedScript) return;
    const cleanPhone = phone.replace(/\s/g, '');
    const msg = personalizeScript(selectedScript.text);
    const url = selectedApp.scheme(cleanPhone, msg);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        // Copy to clipboard as fallback
        await Clipboard.setStringAsync(msg);
        Alert.alert(
          `${selectedApp.label} not found`,
          'The message has been copied to your clipboard. Open the app manually and paste it.',
          [{ text: 'OK', onPress: () => setStep('text_confirm') }]
        );
        return;
      }
      await Linking.openURL(url);
      // For Telegram — copy script since it can't pre-fill
      if (selectedApp.key === 'telegram' || selectedApp.key === 'imo' || selectedApp.key === 'messenger') {
        await Clipboard.setStringAsync(msg);
        Alert.alert(
          '📋 Script copied!',
          `Your message has been copied. Paste it in the ${selectedApp.label} chat.`,
          [{ text: 'Got it', onPress: () => setStep('text_confirm') }]
        );
      } else {
        setStep('text_confirm');
      }
    } catch (e) { Alert.alert('Error', `Could not open ${selectedApp.label}.`); }
  };

  const saveOutcome = async (outcome, type) => {
    setSaving(true);
    try {
      await createInvitation({
        prospect_id:     prospect.prospect_id,
        invitation_type: type === 'call' ? 'one_on_one_call' : 'one_on_one_call',
        notes:           `${type === 'call' ? 'Call' : 'Text'} invitation — outcome: ${outcome}`,
      });
      setSelectedOutcome(outcome);
      setStep('done');
      setTimeout(() => { onSaved(); }, 1500);
    } catch (e) { Alert.alert('Error', e?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
          <View style={{ backgroundColor:C.surface, borderTopLeftRadius:28, borderTopRightRadius:28, paddingHorizontal:22, paddingTop:16, paddingBottom:44, maxHeight:'90%' }}>
            {/* Handle */}
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:C.border, alignSelf:'center', marginBottom:16 }} />

            {/* Header */}
            <View style={{ flexDirection:'row', alignItems:'center', marginBottom:20 }}>
              <View style={{ width:40, height:40, borderRadius:12, backgroundColor:'rgba(139,92,246,0.15)', alignItems:'center', justifyContent:'center', marginRight:12 }}>
                <Text style={{ fontSize:20 }}>📨</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:16, fontWeight:'900', color:C.text }}>Invite {name.split(' ')[0]}</Text>
                <Text style={{ fontSize:12, color:C.muted, marginTop:1 }}>{phone}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding:4 }}>
                <X color={C.muted} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── STEP: Choose method ── */}
              {step === 'method' && (
                <View>
                  <Text style={{ fontSize:13, color:C.muted, textAlign:'center', marginBottom:20 }}>
                    How do you want to invite <Text style={{ color:C.text, fontWeight:'700' }}>{name.split(' ')[0]}</Text>?
                  </Text>
                  <TouchableOpacity onPress={() => setStep('call_confirm')}
                    style={{ flexDirection:'row', alignItems:'center', backgroundColor:'rgba(59,130,246,0.1)', borderRadius:18, padding:18, marginBottom:12, borderWidth:1.5, borderColor:'rgba(59,130,246,0.3)' }}>
                    <Text style={{ fontSize:32, marginRight:16 }}>📞</Text>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:16, fontWeight:'800', color:C.text }}>Call Invitation</Text>
                      <Text style={{ fontSize:12, color:C.muted, marginTop:3 }}>Make a live phone call — app dials automatically</Text>
                    </View>
                    <ChevronRight color="#3B82F6" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('script_select')}
                    style={{ flexDirection:'row', alignItems:'center', backgroundColor:'rgba(16,185,129,0.1)', borderRadius:18, padding:18, borderWidth:1.5, borderColor:'rgba(16,185,129,0.3)' }}>
                    <Text style={{ fontSize:32, marginRight:16 }}>💬</Text>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:16, fontWeight:'800', color:C.text }}>Text / Chat Invitation</Text>
                      <Text style={{ fontSize:12, color:C.muted, marginTop:3 }}>WhatsApp, Telegram, SMS, IMO, Messenger</Text>
                    </View>
                    <ChevronRight color="#10B981" size={20} />
                  </TouchableOpacity>
                </View>
              )}

              {/* ── STEP: Call confirm ── */}
              {step === 'call_confirm' && (
                <View style={{ alignItems:'center' }}>
                  <View style={{ width:80, height:80, borderRadius:40, backgroundColor:'rgba(59,130,246,0.15)', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                    <Text style={{ fontSize:40 }}>📞</Text>
                  </View>
                  <Text style={{ fontSize:18, fontWeight:'900', color:C.text, marginBottom:6 }}>Call {name.split(' ')[0]}</Text>
                  <Text style={{ fontSize:14, color:C.muted, marginBottom:4 }}>{phone}</Text>
                  <View style={{ backgroundColor:'rgba(59,130,246,0.1)', borderRadius:12, padding:12, marginBottom:24, borderWidth:1, borderColor:'rgba(59,130,246,0.2)', width:'100%' }}>
                    <Text style={{ fontSize:12, color:'#3B82F6', fontWeight:'700', marginBottom:4 }}>📋 Reason for call</Text>
                    <Text style={{ fontSize:13, color:C.text }}>Invitation — share a business opportunity</Text>
                  </View>
                  <TouchableOpacity onPress={handleCall}
                    style={{ backgroundColor:'#3B82F6', borderRadius:16, paddingVertical:16, paddingHorizontal:40, flexDirection:'row', alignItems:'center', gap:10, marginBottom:12, width:'100%', justifyContent:'center' }}>
                    <Text style={{ fontSize:20 }}>📞</Text>
                    <Text style={{ color:'#fff', fontWeight:'900', fontSize:16 }}>Start Call Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('method')} style={{ paddingVertical:10 }}>
                    <Text style={{ color:C.muted, fontSize:13 }}>← Back</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── STEP: Calling in progress ── */}
              {step === 'calling' && (
                <View style={{ alignItems:'center', paddingVertical:20 }}>
                  <View style={{ width:80, height:80, borderRadius:40, backgroundColor:'rgba(59,130,246,0.15)', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                    <Text style={{ fontSize:40 }}>📞</Text>
                  </View>
                  <Text style={{ fontSize:18, fontWeight:'900', color:C.text, marginBottom:8 }}>Calling {name.split(' ')[0]}…</Text>
                  <Text style={{ fontSize:13, color:C.muted, textAlign:'center', marginBottom:28, lineHeight:20 }}>
                    Return to the app once the call ends to log the outcome.
                  </Text>
                  <TouchableOpacity onPress={() => setStep('call_outcome')}
                    style={{ backgroundColor:'#3B82F6', borderRadius:16, paddingVertical:14, paddingHorizontal:32, width:'100%', alignItems:'center' }}>
                    <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Call Ended — Log Outcome</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── STEP: Call outcome ── */}
              {step === 'call_outcome' && (
                <View>
                  <Text style={{ fontSize:14, fontWeight:'800', color:C.text, marginBottom:16, textAlign:'center' }}>
                    How did the call with {name.split(' ')[0]} go?
                  </Text>
                  {CALL_OUTCOMES.map(o => (
                    <TouchableOpacity key={o.key} onPress={() => saveOutcome(o.key, 'call')} disabled={saving}
                      style={{ flexDirection:'row', alignItems:'center', backgroundColor:o.color+'12', borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor:o.color+'30' }}>
                      <Text style={{ fontSize:22, marginRight:14 }}>{o.emoji}</Text>
                      <Text style={{ fontSize:14, fontWeight:'700', color:C.text, flex:1 }}>{o.label}</Text>
                      {saving && <ActivityIndicator color={o.color} size="small" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── STEP: Script select ── */}
              {step === 'script_select' && (
                <View>
                  <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:14 }}>Choose a script for {name.split(' ')[0]}:</Text>
                  {INVITE_SCRIPTS.map(s => {
                    const isSelected = selectedScript?.id === s.id;
                    return (
                      <TouchableOpacity key={s.id} onPress={() => setSelectedScript(s)}
                        style={{ backgroundColor: isSelected ? 'rgba(16,185,129,0.12)' : C.inputBg, borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor: isSelected ? '#10B981' : C.border }}>
                        <Text style={{ fontSize:13, color: isSelected ? '#10B981' : C.text, lineHeight:20, fontStyle:'italic' }}>
                          "{personalizeScript(s.text)}"
                        </Text>
                        {isSelected && <Text style={{ color:'#10B981', fontSize:11, fontWeight:'700', marginTop:6 }}>✓ Selected</Text>}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity onPress={() => { if (!selectedScript) { Alert.alert('Select a script first'); return; } setStep('app_select'); }}
                    style={{ backgroundColor:'#10B981', borderRadius:14, height:50, alignItems:'center', justifyContent:'center', marginTop:6 }}>
                    <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Next — Choose App →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('method')} style={{ paddingVertical:10, alignItems:'center' }}>
                    <Text style={{ color:C.muted, fontSize:13 }}>← Back</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── STEP: App select ── */}
              {step === 'app_select' && (
                <View>
                  {/* Script preview */}
                  <View style={{ backgroundColor:C.inputBg, borderRadius:12, padding:12, marginBottom:16, borderWidth:1, borderColor:C.border }}>
                    <Text style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Script to send:</Text>
                    <Text style={{ fontSize:13, color:C.text, fontStyle:'italic', lineHeight:18 }}>"{personalizeScript(selectedScript?.text || '')}"</Text>
                  </View>
                  <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:12 }}>Send via:</Text>
                  {MESSAGING_APPS.map(app => {
                    const doSend = async () => {
                      setSelectedApp(app);
                      const cleanPhone = phone.replace(/\s/g, '');
                      const msg = personalizeScript(selectedScript?.text || '');
                      const url = app.scheme(cleanPhone, msg);
                      try {
                        const canOpen = await Linking.canOpenURL(url);
                        if (!canOpen) {
                          await Clipboard.setStringAsync(msg);
                          Alert.alert(`${app.label} not found`, 'Message copied to clipboard. Open the app manually and paste it.', [{ text:'OK', onPress:()=>setStep('text_confirm') }]);
                          return;
                        }
                        await Linking.openURL(url);
                        if (['telegram','imo','messenger'].includes(app.key)) {
                          await Clipboard.setStringAsync(msg);
                          Alert.alert('📋 Script copied!', `Paste it in the ${app.label} chat.`, [{ text:'Got it', onPress:()=>setStep('text_confirm') }]);
                        } else {
                          setStep('text_confirm');
                        }
                      } catch(e) { Alert.alert('Error', `Could not open ${app.label}.`); }
                    };
                    return (
                    <TouchableOpacity key={app.key} onPress={doSend}
                      style={{ flexDirection:'row', alignItems:'center', backgroundColor:C.inputBg, borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor:C.border }}>
                      <Text style={{ fontSize:26, marginRight:14 }}>{app.emoji}</Text>
                      <View style={{ flex:1 }}>
                        <Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{app.label}</Text>
                        <Text style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                          {['telegram','imo','messenger'].includes(app.key) ? `Opens ${app.label} — script copied to clipboard` : 'Opens app with message pre-filled'}
                        </Text>
                      </View>
                      <ChevronRight color={C.muted} size={16} />
                    </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity onPress={() => setStep('script_select')} style={{ paddingVertical:10, alignItems:'center' }}>
                    <Text style={{ color:C.muted, fontSize:13 }}>← Back</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── STEP: Text confirm ── */}
              {step === 'text_confirm' && (
                <View style={{ alignItems:'center' }}>
                  <Text style={{ fontSize:32, marginBottom:12 }}>{selectedApp?.emoji}</Text>
                  <Text style={{ fontSize:16, fontWeight:'900', color:C.text, marginBottom:8 }}>Message sent via {selectedApp?.label}</Text>
                  <Text style={{ fontSize:13, color:C.muted, textAlign:'center', marginBottom:24 }}>Was the invitation delivered successfully?</Text>
                  <View style={{ flexDirection:'row', gap:12, width:'100%' }}>
                    <TouchableOpacity onPress={() => setStep('text_outcome')}
                      style={{ flex:1, backgroundColor:'rgba(16,185,129,0.12)', borderRadius:14, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'rgba(16,185,129,0.3)' }}>
                      <Text style={{ fontSize:20, marginBottom:4 }}>✅</Text>
                      <Text style={{ color:'#10B981', fontWeight:'800', fontSize:14 }}>Yes, delivered</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setStep('text_outcome')}
                      style={{ flex:1, backgroundColor:'rgba(239,68,68,0.1)', borderRadius:14, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'rgba(239,68,68,0.25)' }}>
                      <Text style={{ fontSize:20, marginBottom:4 }}>❌</Text>
                      <Text style={{ color:'#EF4444', fontWeight:'800', fontSize:14 }}>No, failed</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── STEP: Text outcome ── */}
              {step === 'text_outcome' && (
                <View>
                  <Text style={{ fontSize:14, fontWeight:'800', color:C.text, marginBottom:16, textAlign:'center' }}>
                    What was the response from {name.split(' ')[0]}?
                  </Text>
                  {TEXT_OUTCOMES.map(o => (
                    <TouchableOpacity key={o.key} onPress={() => saveOutcome(o.key, 'text')} disabled={saving}
                      style={{ flexDirection:'row', alignItems:'center', backgroundColor:o.color+'12', borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor:o.color+'30' }}>
                      <Text style={{ fontSize:22, marginRight:14 }}>{o.emoji}</Text>
                      <Text style={{ fontSize:14, fontWeight:'700', color:C.text, flex:1 }}>{o.label}</Text>
                      {saving && <ActivityIndicator color={o.color} size="small" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── STEP: Done ── */}
              {step === 'done' && (
                <View style={{ alignItems:'center', paddingVertical:24 }}>
                  <Text style={{ fontSize:48, marginBottom:12 }}>🎉</Text>
                  <Text style={{ fontSize:18, fontWeight:'900', color:C.text, marginBottom:8 }}>Invitation Logged!</Text>
                  <Text style={{ fontSize:13, color:C.muted, textAlign:'center' }}>
                    The outcome has been saved to {name.split(' ')[0]}'s profile and their score updated.
                  </Text>
                </View>
              )}

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ── Shared sub-components ─────────────────────────────────────────────────────
const FormField = ({ label, value, onChange, placeholder, C, multiline }) => (
  <View style={{ marginBottom:14 }}>
    <Text style={{ fontSize:12, fontWeight:'600', color:C.muted, marginBottom:6 }}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor={C.muted} multiline={multiline} numberOfLines={multiline ? 3 : 1}
      style={{ backgroundColor:C.inputBg, borderWidth:1, borderColor:C.border, borderRadius:12,
        paddingHorizontal:14, paddingVertical: multiline ? 10 : 0,
        height: multiline ? 80 : 46, color:C.text, fontSize:14,
        textAlignVertical: multiline ? 'top' : 'center' }} />
  </View>
);

const PillRow = ({ options, value, onChange, C }) => (
  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:14 }}>
    {options.map(opt => {
      const active = value === opt;
      return (
        <TouchableOpacity key={opt} onPress={() => onChange(opt)}
          style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:20,
            backgroundColor: active ? C.accent : 'transparent',
            borderWidth:1.5, borderColor: active ? C.accent : C.border }}>
          <Text style={{ fontSize:12, fontWeight:'700', color: active ? '#fff' : C.muted }}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const ActionBtn = ({ label, onPress, saving, color }) => (
  <TouchableOpacity onPress={onPress} disabled={saving}
    style={{ backgroundColor:color, borderRadius:14, height:50, alignItems:'center', justifyContent:'center', marginTop:4 }}>
    {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>{label}</Text>}
  </TouchableOpacity>
);

const BottomSheet = ({ visible, onClose, title, children, C }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)' }} activeOpacity={1} onPress={onClose} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ position:'absolute', bottom:0, left:0, right:0 }}>
      <View style={{ backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24,
        paddingHorizontal:20, paddingTop:16, paddingBottom:40 }}>
        <View style={{ width:40, height:4, borderRadius:2, backgroundColor:C.border, alignSelf:'center', marginBottom:16 }} />
        <View style={{ flexDirection:'row', alignItems:'center', marginBottom:18 }}>
          <Text style={{ fontSize:17, fontWeight:'800', color:C.text, flex:1 }}>{title}</Text>
          <TouchableOpacity onPress={onClose}><X color={C.muted} size={20} /></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);


// ── Main Screen ───────────────────────────────────────────────────────────────
const ProspectsScreen = ({ C }) => {
  const [view, setView]             = useState('dashboard'); // dashboard | list | profile
  const [dashData, setDashData]     = useState(null);
  const [prospects, setProspects]   = useState([]);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
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

  const handleProfileUpdate = (updated) => {
    if (updated) {
      setSelectedProspect(updated);
    } else {
      // Refresh the prospect from server
      if (selectedProspect) {
        getProspects({}).then(res => {
          const fresh = (res.data ?? []).find(p => p.prospect_id === selectedProspect.prospect_id);
          if (fresh) setSelectedProspect(fresh);
        }).catch(() => {});
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
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator color={C.accent} size="large" />
        <Text style={{ color:C.muted, marginTop:12, fontSize:13 }}>Loading prospects...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex:1 }}>
      {/* Header */}
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom:14 }}>
        {view !== 'dashboard' && (
          <TouchableOpacity onPress={handleBack}
            style={{ width:36, height:36, borderRadius:12, backgroundColor:C.inputBg, alignItems:'center', justifyContent:'center', marginRight:10, borderWidth:1, borderColor:C.border }}>
            <ChevronRight color={C.text} size={18} style={{ transform:[{rotate:'180deg'}] }} />
          </TouchableOpacity>
        )}
        <View style={{ flex:1 }}>
          <Text style={{ fontSize:20, fontWeight:'900', color:C.text }}>
            {view === 'dashboard' ? 'Prospects' : view === 'list' ? (listFilter.stage || 'All Prospects') : selectedProspect?.name}
          </Text>
          <Text style={{ fontSize:12, color:C.muted, marginTop:1 }}>
            {view === 'dashboard' ? 'Recruitment pipeline' : view === 'list' ? `${prospects.length} prospects` : selectedProspect?.stage}
          </Text>
        </View>
        {view !== 'profile' && (
          <TouchableOpacity onPress={() => setShowAdd(true)}
            style={{ flexDirection:'row', alignItems:'center', backgroundColor:C.accent, paddingHorizontal:14, paddingVertical:8, borderRadius:12, gap:6 }}>
            <Plus color="#fff" size={16} />
            <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab bar (dashboard only) */}
      {view === 'dashboard' && (
        <View style={{ flexDirection:'row', backgroundColor:C.inputBg, borderRadius:14, padding:3, marginBottom:14 }}>
          {[
            { key:'dashboard', label:'Dashboard' },
            { key:'list',      label:'All Prospects' },
          ].map(t => (
            <TouchableOpacity key={t.key}
              onPress={() => t.key === 'list' ? handleNavigate('list', {}) : null}
              style={{ flex:1, paddingVertical:9, borderRadius:11,
                backgroundColor: view === t.key ? C.accent : 'transparent', alignItems:'center' }}>
              <Text style={{ fontSize:12, fontWeight:'700', color: view === t.key ? '#fff' : C.muted }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    </View>
  );
};

export default ProspectsScreen;

