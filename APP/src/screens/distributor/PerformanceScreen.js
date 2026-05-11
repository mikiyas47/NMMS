import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Zap, Target, Users, TrendingUp, Award, Star, Flame,
  ChevronRight, Plus, X, CheckCircle2, AlertTriangle,
  BarChart2, BookOpen, Calendar, Clock, ArrowRight,
  Play, FileText, Link, Bell, Shield,
} from 'lucide-react-native';
import {
  getDailyDashboard, completeTask, getPriorityLeads,
  getActiveRecommendations, markRecommendationRead,
  getFunnelReport, getWeeklyGoals, getPlaybooks,
  getPresentations, createPresentation, assignPresentation,
  createInvitation, getOnboardingStatus,
} from '../../api/authService';

const { width } = Dimensions.get('window');

// ── Helpers ───────────────────────────────────────────────────────────────────
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

const AnimBar = ({ pct, color, height=8, delay=300 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue:pct, duration:800, delay, useNativeDriver:false }).start();
  }, [pct]);
  return (
    <View style={{ height, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:height/2, overflow:'hidden' }}>
      <Animated.View style={{ height, borderRadius:height/2, backgroundColor:color, width:anim.interpolate({ inputRange:[0,100], outputRange:['0%','100%'] }) }} />
    </View>
  );
};

const BADGE_META = {
  first_daily_complete: { emoji:'🎯', label:'First Day Done' },
  streak_3:             { emoji:'🔥', label:'3-Day Streak' },
  streak_7:             { emoji:'⚡', label:'7-Day Streak' },
  streak_30:            { emoji:'👑', label:'30-Day Streak' },
  first_invite:         { emoji:'📨', label:'First Invite' },
  first_presentation:   { emoji:'🎬', label:'First Presentation' },
  first_recruit:        { emoji:'🌱', label:'First Recruit' },
  pipeline_10:          { emoji:'💼', label:'10 in Pipeline' },
  first_closing:        { emoji:'🎯', label:'First Closing' },
  onboarding_complete:  { emoji:'🏆', label:'Onboarding Done' },
  first_10_challenge:   { emoji:'🚀', label:'First 10 Challenge' },
  weekly_goal:          { emoji:'📈', label:'Weekly Goal' },
};

const TASK_COLORS = {
  followup:     { color:'#EF4444', bg:'rgba(239,68,68,0.12)', icon: Flame },
  invite:       { color:'#8B5CF6', bg:'rgba(139,92,246,0.12)', icon: Users },
  presentation: { color:'#3B82F6', bg:'rgba(59,130,246,0.12)', icon: Play },
  closing:      { color:'#10B981', bg:'rgba(16,185,129,0.12)', icon: Target },
};

const INVITE_TYPES = [
  { key:'zoom',                     label:'Zoom Call',         emoji:'💻' },
  { key:'webinar',                  label:'Webinar',           emoji:'🎙' },
  { key:'hotel_event',              label:'Hotel Event',       emoji:'🏨' },
  { key:'product_demo',             label:'Product Demo',      emoji:'📦' },
  { key:'compensation_plan_session',label:'Comp Plan Session', emoji:'💰' },
  { key:'one_on_one_call',          label:'1-on-1 Call',       emoji:'📞' },
  { key:'live_stream',              label:'Live Stream',       emoji:'📡' },
];

const CONTENT_TYPES = [
  { key:'video',            label:'Video',            emoji:'🎬' },
  { key:'pdf',              label:'PDF',              emoji:'📄' },
  { key:'compensation_plan',label:'Comp Plan',        emoji:'💰' },
  { key:'testimonial',      label:'Testimonial',      emoji:'⭐' },
  { key:'webinar_replay',   label:'Webinar Replay',   emoji:'🎙' },
  { key:'explainer_video',  label:'Explainer Video',  emoji:'▶️' },
];


// ── TAB: Daily Dashboard ──────────────────────────────────────────────────────
const DailyTab = ({ C }) => {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [done, setDone]         = useState({});

  const load = useCallback(async (quiet=false) => {
    try { if (!quiet) setLoading(true); const r = await getDailyDashboard(); setData(r.data); }
    catch(e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, []);

  const handleComplete = async (task, idx) => {
    setDone(d => ({ ...d, [idx]: true }));
    try { await completeTask({ task_type: task.type, prospect_id: task.prospect_id }); load(true); }
    catch(e) { setDone(d => ({ ...d, [idx]: false })); }
  };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator color={C.accent} size="large" /></View>;
  if (!data)   return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Text style={{ color:C.muted }}>Could not load dashboard</Text></View>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}>
      {/* Streak + headline */}
      <FadeIn delay={0}>
        <LinearGradient colors={['#1E1B4B','#312E81','#4338CA']} start={{x:0,y:0}} end={{x:1,y:1}}
          style={{ borderRadius:22, padding:20, marginBottom:14, overflow:'hidden' }}>
          <View style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,255,255,0.04)' }} />
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:12 }}>
            <Text style={{ fontSize:32 }}>🔥</Text>
            <View style={{ marginLeft:12, flex:1 }}>
              <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:'700', letterSpacing:1 }}>CURRENT STREAK</Text>
              <Text style={{ color:'#FCD34D', fontSize:28, fontWeight:'900' }}>{data.streak} day{data.streak !== 1 ? 's' : ''}</Text>
            </View>
            <View style={{ backgroundColor:'rgba(255,255,255,0.1)', paddingHorizontal:12, paddingVertical:6, borderRadius:12 }}>
              <Text style={{ color:'rgba(255,255,255,0.7)', fontSize:11 }}>Best: {data.longest_streak ?? data.streak}</Text>
            </View>
          </View>
          <Text style={{ color:'rgba(255,255,255,0.85)', fontSize:14, fontWeight:'600', lineHeight:20 }}>{data.headline}</Text>
        </LinearGradient>
      </FadeIn>

      {/* Badges */}
      {data.badges?.length > 0 && (
        <FadeIn delay={60}>
          <View style={{ backgroundColor:C.surface, borderRadius:18, padding:16, marginBottom:14, borderWidth:1, borderColor:C.border }}>
            <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:10 }}>🏅 Your Badges</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {data.badges.map((b, i) => {
                const meta = BADGE_META[b.badge_type] || { emoji:'🎖', label:b.badge_type };
                return (
                  <View key={i} style={{ alignItems:'center', marginRight:16 }}>
                    <Text style={{ fontSize:28 }}>{meta.emoji}</Text>
                    <Text style={{ fontSize:10, color:C.muted, marginTop:4, textAlign:'center', maxWidth:60 }}>{meta.label}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </FadeIn>
      )}

      {/* Task list */}
      <FadeIn delay={80}>
        <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:10, letterSpacing:0.5 }}>
          TODAY'S ACTIONS ({data.total_tasks})
        </Text>
        {data.action_list?.length === 0 ? (
          <View style={{ alignItems:'center', padding:32, backgroundColor:C.surface, borderRadius:18, borderWidth:1, borderColor:C.border }}>
            <CheckCircle2 color="#10B981" size={40} />
            <Text style={{ color:'#10B981', fontWeight:'800', fontSize:16, marginTop:12 }}>All caught up!</Text>
            <Text style={{ color:C.muted, fontSize:13, marginTop:6 }}>Great work today. Keep the streak going.</Text>
          </View>
        ) : data.action_list.map((task, i) => {
          const meta = TASK_COLORS[task.type] || TASK_COLORS.followup;
          const TIcon = meta.icon;
          const isDone = done[i];
          return (
            <TouchableOpacity key={i} onPress={() => !isDone && handleComplete(task, i)}
              style={{ flexDirection:'row', alignItems:'center', backgroundColor: isDone ? 'rgba(16,185,129,0.08)' : C.surface,
                borderRadius:16, padding:14, marginBottom:10, borderWidth:1, borderColor: isDone ? 'rgba(16,185,129,0.3)' : C.border }}>
              <View style={{ width:38, height:38, borderRadius:11, backgroundColor: isDone ? '#10B981' : meta.bg, alignItems:'center', justifyContent:'center', marginRight:12 }}>
                {isDone ? <CheckCircle2 color="#fff" size={18} /> : <TIcon color={meta.color} size={18} />}
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'700', color: isDone ? C.muted : C.text, textDecorationLine: isDone ? 'line-through' : 'none' }}>{task.action}</Text>
                <Text style={{ fontSize:12, color:C.muted, marginTop:2 }}>{task.prospect_name}</Text>
              </View>
              <View style={{ backgroundColor:meta.bg, paddingHorizontal:8, paddingVertical:3, borderRadius:8 }}>
                <Text style={{ color:meta.color, fontSize:10, fontWeight:'800', textTransform:'uppercase' }}>{task.type}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </FadeIn>
      <View style={{ height:32 }} />
    </ScrollView>
  );
};


// ── TAB: Priority Leads ───────────────────────────────────────────────────────
const PriorityTab = ({ C }) => {
  const [leads, setLeads]       = useState([]);
  const [recs, setRecs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet=false) => {
    try {
      if (!quiet) setLoading(true);
      const [l, r] = await Promise.all([getPriorityLeads(), getActiveRecommendations()]);
      setLeads(l.data ?? []);
      setRecs(r.data ?? []);
    } catch(e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, []);

  const handleReadRec = async (id) => {
    try { await markRecommendationRead(id); setRecs(r => r.filter(x => x.id !== id)); } catch(e) {}
  };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator color={C.accent} size="large" /></View>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}>
      {/* Smart Recommendations */}
      {recs.length > 0 && (
        <FadeIn delay={0}>
          <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:10, letterSpacing:0.5 }}>🧠 SMART RECOMMENDATIONS</Text>
          {recs.slice(0,3).map((rec, i) => {
            const isHot = rec.type === 'high_intent';
            const color = isHot ? '#EF4444' : '#F59E0B';
            return (
              <View key={rec.id} style={{ backgroundColor:color+'12', borderRadius:16, padding:14, marginBottom:10, borderWidth:1.5, borderColor:color+'30', flexDirection:'row', alignItems:'flex-start' }}>
                <Text style={{ fontSize:20, marginRight:10 }}>{isHot ? '🔥' : '⚠️'}</Text>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:13, fontWeight:'700', color:C.text }}>{rec.prospect?.name}</Text>
                  <Text style={{ fontSize:12, color:C.muted, marginTop:3, lineHeight:18 }}>{rec.suggestion}</Text>
                </View>
                <TouchableOpacity onPress={() => handleReadRec(rec.id)} style={{ padding:4 }}>
                  <X color={C.muted} size={14} />
                </TouchableOpacity>
              </View>
            );
          })}
        </FadeIn>
      )}

      {/* Priority leads */}
      <FadeIn delay={60}>
        <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:10, letterSpacing:0.5 }}>🔥 HIGHEST PRIORITY LEADS</Text>
        {leads.length === 0 ? (
          <View style={{ alignItems:'center', padding:32, backgroundColor:C.surface, borderRadius:18, borderWidth:1, borderColor:C.border }}>
            <Users color={C.muted} size={36} />
            <Text style={{ color:C.muted, marginTop:12, fontSize:13 }}>No active prospects yet</Text>
          </View>
        ) : leads.map((p, i) => {
          const score = p.priority_score ?? 0;
          const color = score >= 80 ? '#EF4444' : score >= 50 ? '#F59E0B' : '#6B7280';
          return (
            <View key={p.prospect_id} style={{ backgroundColor:C.surface, borderRadius:18, padding:14, marginBottom:10, borderWidth:1, borderColor:C.border }}>
              <View style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
                <View style={{ width:42, height:42, borderRadius:21, backgroundColor:color+'20', alignItems:'center', justifyContent:'center', marginRight:12 }}>
                  <Text style={{ color, fontWeight:'900', fontSize:16 }}>{p.name?.charAt(0)?.toUpperCase()}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:15, fontWeight:'800', color:C.text }}>{p.name}</Text>
                  <Text style={{ fontSize:12, color:C.muted, marginTop:1 }}>{p.stage}</Text>
                </View>
                <View style={{ alignItems:'flex-end' }}>
                  <Text style={{ fontSize:20, fontWeight:'900', color }}>{score}</Text>
                  <Text style={{ fontSize:9, color:C.muted }}>priority</Text>
                </View>
              </View>
              <AnimBar pct={Math.min(100, score)} color={color} height={6} delay={200 + i*60} />
              {p.recommendation && (
                <Text style={{ fontSize:12, color:C.muted, marginTop:8, fontStyle:'italic' }}>💡 {p.recommendation}</Text>
              )}
            </View>
          );
        })}
      </FadeIn>
      <View style={{ height:32 }} />
    </ScrollView>
  );
};


// ── TAB: Presentations ────────────────────────────────────────────────────────
const PresentationsTab = ({ C }) => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ title:'', content_type:'video', external_url:'' });

  const load = useCallback(async () => {
    try { setLoading(true); const r = await getPresentations(); setItems(r.data ?? []); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.title.trim() && !form.external_url.trim()) { Alert.alert('Required','Add a title and URL.'); return; }
    setSaving(true);
    try { await createPresentation(form); setShowAdd(false); setForm({ title:'', content_type:'video', external_url:'' }); load(); }
    catch(e) { Alert.alert('Error', e?.message || 'Failed'); } finally { setSaving(false); }
  };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator color={C.accent} size="large" /></View>;

  return (
    <View style={{ flex:1 }}>
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom:14 }}>
        <Text style={{ flex:1, fontSize:14, fontWeight:'800', color:C.text }}>Presentation Library</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={{ backgroundColor:C.accent, paddingHorizontal:14, paddingVertical:8, borderRadius:12, flexDirection:'row', alignItems:'center', gap:6 }}>
          <Plus color="#fff" size={14} />
          <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>Add</Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={{ alignItems:'center', padding:40, backgroundColor:C.surface, borderRadius:18, borderWidth:1, borderColor:C.border }}>
            <Play color={C.muted} size={36} />
            <Text style={{ color:C.muted, marginTop:12, fontSize:13 }}>No presentations yet. Add your first one.</Text>
          </View>
        ) : items.map((p, i) => {
          const ct = CONTENT_TYPES.find(c => c.key === p.content_type) || { emoji:'📁', label:p.content_type };
          return (
            <View key={p.id} style={{ backgroundColor:C.surface, borderRadius:16, padding:14, marginBottom:10, borderWidth:1, borderColor:C.border }}>
              <View style={{ flexDirection:'row', alignItems:'center' }}>
                <Text style={{ fontSize:28, marginRight:12 }}>{ct.emoji}</Text>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{p.title || ct.label}</Text>
                  <Text style={{ fontSize:11, color:C.muted, marginTop:2 }}>{ct.label}</Text>
                </View>
                <View style={{ alignItems:'flex-end', gap:4 }}>
                  <Text style={{ fontSize:12, fontWeight:'800', color:'#10B981' }}>{p.conversion_rate ?? 0}% conv.</Text>
                  <Text style={{ fontSize:10, color:C.muted }}>Score: {p.avg_engagement_score ?? 0}</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={{ height:32 }} />
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
            <View style={{ backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingBottom:40 }}>
              <View style={{ width:40, height:4, borderRadius:2, backgroundColor:C.border, alignSelf:'center', marginBottom:16 }} />
              <View style={{ flexDirection:'row', alignItems:'center', marginBottom:18 }}>
                <Text style={{ fontSize:17, fontWeight:'800', color:C.text, flex:1 }}>Add Presentation</Text>
                <TouchableOpacity onPress={() => setShowAdd(false)}><X color={C.muted} size={20} /></TouchableOpacity>
              </View>
              <TextInput value={form.title} onChangeText={v => setForm(f=>({...f,title:v}))} placeholder="Title" placeholderTextColor={C.muted}
                style={{ backgroundColor:C.inputBg, borderWidth:1, borderColor:C.border, borderRadius:12, paddingHorizontal:14, height:46, color:C.text, fontSize:14, marginBottom:12 }} />
              <Text style={{ fontSize:12, color:C.muted, fontWeight:'600', marginBottom:8 }}>Content Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
                {CONTENT_TYPES.map(ct => (
                  <TouchableOpacity key={ct.key} onPress={() => setForm(f=>({...f,content_type:ct.key}))}
                    style={{ paddingHorizontal:12, paddingVertical:8, borderRadius:20, marginRight:8, backgroundColor:form.content_type===ct.key?C.accent:'transparent', borderWidth:1.5, borderColor:form.content_type===ct.key?C.accent:C.border }}>
                    <Text style={{ fontSize:12, fontWeight:'700', color:form.content_type===ct.key?'#fff':C.muted }}>{ct.emoji} {ct.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput value={form.external_url} onChangeText={v => setForm(f=>({...f,external_url:v}))} placeholder="Video/PDF URL" placeholderTextColor={C.muted}
                style={{ backgroundColor:C.inputBg, borderWidth:1, borderColor:C.border, borderRadius:12, paddingHorizontal:14, height:46, color:C.text, fontSize:14, marginBottom:16 }} />
              <TouchableOpacity onPress={handleAdd} disabled={saving} style={{ backgroundColor:C.accent, borderRadius:14, height:50, alignItems:'center', justifyContent:'center' }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Save Presentation</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};


// ── TAB: Funnel Analytics ─────────────────────────────────────────────────────
const FunnelTab = ({ C }) => {
  const [data, setData]       = useState(null);
  const [goals, setGoals]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet=false) => {
    try {
      if (!quiet) setLoading(true);
      const [f, g] = await Promise.all([getFunnelReport(), getWeeklyGoals()]);
      setData(f.data);
      setGoals(g.data);
    } catch(e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, []);

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator color={C.accent} size="large" /></View>;

  const funnel = data?.funnel ?? {};
  const transitions = data?.transitions ?? {};
  const stages = [
    { key:'contacts',      label:'Contacts',      value:funnel.contacts??0,      color:'#6366F1' },
    { key:'prospects',     label:'Prospects',     value:funnel.prospects??0,     color:'#8B5CF6' },
    { key:'invitations',   label:'Invitations',   value:funnel.invitations??0,   color:'#3B82F6' },
    { key:'presentations', label:'Presentations', value:funnel.presentations??0, color:'#06B6D4' },
    { key:'followups',     label:'Follow-ups',    value:funnel.followups??0,     color:'#F59E0B' },
    { key:'closings',      label:'Closings',      value:funnel.closings??0,      color:'#F97316' },
    { key:'joined',        label:'Joined',        value:funnel.joined??0,        color:'#10B981' },
  ];
  const maxVal = Math.max(...stages.map(s => s.value), 1);

  return (
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}>
      {/* Overall conversion */}
      <FadeIn delay={0}>
        <LinearGradient colors={['#064E3B','#065F46']} start={{x:0,y:0}} end={{x:1,y:1}}
          style={{ borderRadius:20, padding:18, marginBottom:14 }}>
          <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:'700', letterSpacing:1 }}>OVERALL CONVERSION</Text>
          <Text style={{ color:'#34D399', fontSize:32, fontWeight:'900', marginTop:4 }}>{data?.overall_conversion ?? 0}%</Text>
          <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:12, marginTop:4 }}>Contacts → Joined</Text>
        </LinearGradient>
      </FadeIn>

      {/* Funnel bars */}
      <FadeIn delay={60}>
        <View style={{ backgroundColor:C.surface, borderRadius:18, padding:16, marginBottom:14, borderWidth:1, borderColor:C.border }}>
          <Text style={{ fontSize:14, fontWeight:'800', color:C.text, marginBottom:14 }}>Recruitment Funnel</Text>
          {stages.map((s, i) => {
            const pct = Math.round((s.value/maxVal)*100);
            const transKey = Object.keys(transitions)[i] ?? null;
            const transRate = transKey ? transitions[transKey] : null;
            return (
              <View key={s.key} style={{ marginBottom:12 }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:5 }}>
                  <Text style={{ fontSize:13, fontWeight:'600', color:C.text }}>{s.label}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    {transRate !== null && i > 0 && (
                      <Text style={{ fontSize:11, color: transRate >= 40 ? '#10B981' : transRate >= 20 ? '#F59E0B' : '#EF4444', fontWeight:'700' }}>↓{transRate}%</Text>
                    )}
                    <Text style={{ fontSize:13, fontWeight:'800', color:s.color }}>{s.value}</Text>
                  </View>
                </View>
                <AnimBar pct={pct} color={s.color} height={8} delay={100+i*80} />
              </View>
            );
          })}
        </View>
      </FadeIn>

      {/* Insight */}
      {data?.insight && (
        <FadeIn delay={120}>
          <View style={{ backgroundColor:'rgba(245,158,11,0.1)', borderRadius:16, padding:14, marginBottom:14, borderWidth:1.5, borderColor:'rgba(245,158,11,0.3)', flexDirection:'row', alignItems:'flex-start' }}>
            <AlertTriangle color="#F59E0B" size={18} style={{ marginRight:10, marginTop:2 }} />
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:12, fontWeight:'800', color:'#F59E0B', marginBottom:4 }}>WEAKEST STAGE: {(data.weakest_stage??'').replace(/_/g,' ').toUpperCase()}</Text>
              <Text style={{ fontSize:13, color:C.muted, lineHeight:18 }}>{data.insight}</Text>
            </View>
          </View>
        </FadeIn>
      )}

      {/* Weekly goals */}
      {goals && (
        <FadeIn delay={140}>
          <View style={{ backgroundColor:C.surface, borderRadius:18, padding:16, marginBottom:14, borderWidth:1, borderColor:C.border }}>
            <Text style={{ fontSize:14, fontWeight:'800', color:C.text, marginBottom:14 }}>📈 Weekly Goals</Text>
            {[
              { label:'New Prospects', actual:goals.goal?.prospects_actual??0, target:goals.goal?.prospects_target??5, color:'#6366F1' },
              { label:'Invitations',   actual:goals.goal?.invitations_actual??0, target:goals.goal?.invitations_target??10, color:'#8B5CF6' },
              { label:'Presentations', actual:goals.goal?.presentations_actual??0, target:goals.goal?.presentations_target??5, color:'#3B82F6' },
            ].map((g, i) => {
              const pct = g.target > 0 ? Math.min(100, Math.round((g.actual/g.target)*100)) : 0;
              return (
                <View key={g.label} style={{ marginBottom:12 }}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:5 }}>
                    <Text style={{ fontSize:13, color:C.text, fontWeight:'600' }}>{g.label}</Text>
                    <Text style={{ fontSize:13, fontWeight:'800', color:g.color }}>{g.actual}/{g.target}</Text>
                  </View>
                  <AnimBar pct={pct} color={g.color} height={7} delay={200+i*80} />
                </View>
              );
            })}
            <View style={{ backgroundColor:'rgba(99,102,241,0.1)', borderRadius:12, padding:10, marginTop:4, alignItems:'center' }}>
              <Text style={{ color:C.accent, fontWeight:'800', fontSize:14 }}>Overall: {goals.overall_percent ?? 0}%</Text>
            </View>
          </View>
        </FadeIn>
      )}
      <View style={{ height:32 }} />
    </ScrollView>
  );
};


// ── TAB: Playbooks ────────────────────────────────────────────────────────────
const PlaybooksTab = ({ C }) => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getPresentations().then(() => {}).catch(() => {});
    getPlaybooks().then(r => setItems(r.data ?? [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const CAT_COLORS = { invitation:'#8B5CF6', presentation:'#3B82F6', closing:'#10B981', objection_handling:'#EF4444' };
  const CAT_EMOJI  = { invitation:'📨', presentation:'🎬', closing:'🎯', objection_handling:'🛡' };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator color={C.accent} size="large" /></View>;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:14, letterSpacing:0.5 }}>📚 RECRUITMENT PLAYBOOKS</Text>
      {items.map((pb, i) => {
        const color = CAT_COLORS[pb.category] || '#6366F1';
        const emoji = CAT_EMOJI[pb.category] || '📖';
        const isOpen = expanded === pb.id;
        return (
          <View key={pb.id} style={{ backgroundColor:C.surface, borderRadius:18, marginBottom:10, borderWidth:1, borderColor:C.border, overflow:'hidden' }}>
            <TouchableOpacity onPress={() => setExpanded(isOpen ? null : pb.id)}
              style={{ flexDirection:'row', alignItems:'center', padding:16 }}>
              <View style={{ width:42, height:42, borderRadius:13, backgroundColor:color+'20', alignItems:'center', justifyContent:'center', marginRight:12 }}>
                <Text style={{ fontSize:20 }}>{emoji}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'800', color:C.text }}>{pb.title}</Text>
                <View style={{ backgroundColor:color+'20', paddingHorizontal:8, paddingVertical:2, borderRadius:8, alignSelf:'flex-start', marginTop:4 }}>
                  <Text style={{ color, fontSize:10, fontWeight:'700', textTransform:'uppercase' }}>{pb.category?.replace('_',' ')}</Text>
                </View>
              </View>
              <Text style={{ color:C.muted, fontSize:18 }}>{isOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={{ borderTopWidth:1, borderColor:C.border, padding:16 }}>
                {pb.description && <Text style={{ fontSize:13, color:C.muted, marginBottom:12, lineHeight:18 }}>{pb.description}</Text>}
                {(pb.steps ?? []).map((step, si) => (
                  <View key={si} style={{ flexDirection:'row', alignItems:'flex-start', marginBottom:10 }}>
                    <View style={{ width:24, height:24, borderRadius:12, backgroundColor:color+'20', alignItems:'center', justifyContent:'center', marginRight:10, marginTop:1 }}>
                      <Text style={{ color, fontSize:11, fontWeight:'900' }}>{si+1}</Text>
                    </View>
                    <Text style={{ flex:1, fontSize:13, color:C.text, lineHeight:20 }}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      <View style={{ height:32 }} />
    </ScrollView>
  );
};

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
const TABS = [
  { id:'daily',         label:'Today',       icon: Flame },
  { id:'priority',      label:'Priority',    icon: Target },
  { id:'presentations', label:'Content',     icon: Play },
  { id:'funnel',        label:'Funnel',      icon: BarChart2 },
  { id:'playbooks',     label:'Playbooks',   icon: BookOpen },
];

const PerformanceScreen = ({ C }) => {
  const [activeTab, setActiveTab] = useState('daily');

  return (
    <View style={{ flex:1 }}>
      {/* Header */}
      <FadeIn delay={0}>
        <LinearGradient colors={['#0F0A2E','#1E1B4B']} start={{x:0,y:0}} end={{x:1,y:1}}
          style={{ borderRadius:20, padding:16, marginBottom:14, overflow:'hidden' }}>
          <View style={{ position:'absolute', right:-20, top:-20, width:80, height:80, borderRadius:40, backgroundColor:'rgba(255,255,255,0.04)' }} />
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <LinearGradient colors={['#6366F1','#4338CA']} style={{ width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center', marginRight:12 }}>
              <Zap color="#fff" size={20} />
            </LinearGradient>
            <View>
              <Text style={{ color:'rgba(255,255,255,0.5)', fontSize:10, fontWeight:'700', letterSpacing:1.2 }}>PERFORMANCE OS</Text>
              <Text style={{ color:'#fff', fontSize:17, fontWeight:'900' }}>Distributor Engine</Text>
            </View>
          </View>
        </LinearGradient>
      </FadeIn>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:14 }} contentContainerStyle={{ paddingRight:8 }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const TIcon = tab.icon;
          return (
            <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)}
              style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:9, borderRadius:14, marginRight:8,
                backgroundColor: isActive ? '#4338CA' : C.surface,
                borderWidth:1, borderColor: isActive ? '#4338CA' : C.border }}>
              <TIcon color={isActive ? '#fff' : C.muted} size={14} />
              <Text style={{ fontSize:12, fontWeight:'700', color: isActive ? '#fff' : C.muted, marginLeft:6 }}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <View style={{ flex:1 }}>
        {activeTab === 'daily'         && <DailyTab         C={C} />}
        {activeTab === 'priority'      && <PriorityTab      C={C} />}
        {activeTab === 'presentations' && <PresentationsTab C={C} />}
        {activeTab === 'funnel'        && <FunnelTab        C={C} />}
        {activeTab === 'playbooks'     && <PlaybooksTab     C={C} />}
      </View>
    </View>
  );
};

export default PerformanceScreen;
