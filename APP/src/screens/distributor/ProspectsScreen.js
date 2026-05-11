import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, RefreshControl, Alert,
  Animated, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
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
  const [saving, setSaving] = useState(false);

  // Stage move form
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

      {/* Action buttons */}
      <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
        {[
          { label:'Move Stage', color:'#6366F1', onPress:() => setShowStageModal(true) },
          { label:'Follow-up', color:'#10B981', onPress:() => setShowFollowupModal(true) },
          { label:'Close', color:'#F97316', onPress:() => setShowClosingModal(true) },
          { label:'Note', color:'#8B5CF6', onPress:() => setShowNoteModal(true) },
        ].map(btn => (
          <TouchableOpacity key={btn.label} onPress={btn.onPress}
            style={{ flex:1, backgroundColor:btn.color+'18', borderRadius:12, paddingVertical:10, alignItems:'center', borderWidth:1, borderColor:btn.color+'33' }}>
            <Text style={{ color:btn.color, fontWeight:'700', fontSize:11 }}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
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
    </View>
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

