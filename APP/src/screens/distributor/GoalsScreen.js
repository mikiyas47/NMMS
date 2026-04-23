import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Animated, Platform,
  ActivityIndicator, Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Target, Star, Trophy, CheckCircle2, Flame,
  Lock, Plus, ChevronDown, ChevronUp, Trash2, Zap,
} from 'lucide-react-native';
import {
  getGoals, createGoal, deleteGoal, logGoalActivity, addGoalMilestone,
} from '../../api/authService';

// ── Helpers ────────────────────────────────────────────────────────────────────

const GOAL_TYPE_META = {
  team:        { label: 'Team',        grad: ['#3B82F6', '#1D4ED8'], icon: Target },
  personal:    { label: 'Personal',    grad: ['#8B5CF6', '#6D28D9'], icon: Star },
  income:      { label: 'Income',      grad: ['#10B981', '#059669'], icon: Trophy },
  recruitment: { label: 'Recruitment', grad: ['#F59E0B', '#D97706'], icon: Flame },
  sales:       { label: 'Sales',       grad: ['#EC4899', '#BE185D'], icon: Zap },
};

const STATUS_COLORS = {
  active:    '#3B82F6',
  completed: '#10B981',
  failed:    '#EF4444',
  cancelled: '#6B7280',
};

const FadeIn = ({ delay = 0, children }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }] }}>{children}</Animated.View>;
};

const ProgressBar = ({ pct, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 800, delay: 300, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
      <Animated.View style={{
        height: 8, borderRadius: 4, backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        shadowColor: color, shadowOpacity: 0.6, shadowRadius: 6,
      }} />
    </View>
  );
};

// ── Add Goal Modal ─────────────────────────────────────────────────────────────

const GOAL_TYPES = ['team', 'personal', 'income', 'recruitment', 'sales'];

// Formats a Date object → 'YYYY-MM-DD' string
const formatDate = (d) => d.toISOString().split('T')[0];

const AddGoalModal = ({ visible, onClose, onSave, C }) => {
  const [form, setForm] = useState({
    goal_title: '', goal_description: '', goal_type: 'personal',
    target_value: '', start_date: '', end_date: '',
  });
  // Date objects used by the picker
  const [startDateObj, setStartDateObj]   = useState(new Date());
  const [endDateObj,   setEndDateObj]     = useState(new Date());
  // Which picker is open: null | 'start' | 'end'
  const [pickerOpen, setPickerOpen] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const onDateChange = (event, selected) => {
    // On Android the picker closes itself; on iOS we close manually
    if (Platform.OS === 'android') setPickerOpen(null);
    if (!selected) return;
    if (pickerOpen === 'start') {
      setStartDateObj(selected);
      set('start_date', formatDate(selected));
    } else {
      setEndDateObj(selected);
      set('end_date', formatDate(selected));
    }
  };

  const submit = async () => {
    if (!form.goal_title.trim() || !form.target_value || !form.start_date || !form.end_date) {
      Alert.alert('Missing fields', 'Please fill in title, target, start date, and end date.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, target_value: parseFloat(form.target_value) });
      setForm({ goal_title: '', goal_description: '', goal_type: 'personal', target_value: '', start_date: '', end_date: '' });
      setStartDateObj(new Date());
      setEndDateObj(new Date());
      onClose();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    color: C.text, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 10,
  };

  const dateButtonStyle = (hasValue) => ({
    flex: 1, backgroundColor: C.card, borderRadius: 12, borderWidth: 1,
    borderColor: hasValue ? '#4338CA' : C.border,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 18 }}>New Goal</Text>

          <TextInput style={inputStyle} placeholder="Goal title *" placeholderTextColor={C.muted}
            value={form.goal_title} onChangeText={v => set('goal_title', v)} />

          <TextInput style={[inputStyle, { minHeight: 70 }]} placeholder="Description (optional)"
            placeholderTextColor={C.muted} multiline value={form.goal_description}
            onChangeText={v => set('goal_description', v)} />

          {/* Goal type picker */}
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>GOAL TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {GOAL_TYPES.map(t => {
              const { label, grad } = GOAL_TYPE_META[t];
              const active = form.goal_type === t;
              return (
                <TouchableOpacity key={t} onPress={() => set('goal_type', t)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
                    backgroundColor: active ? grad[0] : C.card,
                    borderWidth: 1, borderColor: active ? grad[0] : C.border,
                  }}>
                  <Text style={{ color: active ? '#fff' : C.muted, fontWeight: '700', fontSize: 13 }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TextInput style={inputStyle} placeholder="Target value *" placeholderTextColor={C.muted}
            keyboardType="numeric" value={form.target_value} onChangeText={v => set('target_value', v)} />

          {/* ── Date pickers ── */}
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>DATE RANGE *</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={dateButtonStyle(!!form.start_date)} onPress={() => setPickerOpen('start')}>
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Start Date</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: form.start_date ? C.text : C.muted }}>
                {form.start_date || 'Pick date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={dateButtonStyle(!!form.end_date)} onPress={() => setPickerOpen('end')}>
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>End Date</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: form.end_date ? C.text : C.muted }}>
                {form.end_date || 'Pick date'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Native date picker — shown inline on iOS, as dialog on Android */}
          {pickerOpen !== null && (
            <DateTimePicker
              value={pickerOpen === 'start' ? startDateObj : endDateObj}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={pickerOpen === 'end' ? startDateObj : undefined}
            />
          )}
          {/* iOS: explicit Done button to dismiss */}
          {pickerOpen !== null && Platform.OS === 'ios' && (
            <TouchableOpacity onPress={() => setPickerOpen(null)}
              style={{ alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 16, marginTop: 4 }}>
              <Text style={{ color: '#4338CA', fontWeight: '700', fontSize: 15 }}>Done</Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <TouchableOpacity onPress={onClose} style={{
              flex: 1, paddingVertical: 14, borderRadius: 14,
              backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center',
            }}>
              <Text style={{ color: C.muted, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={saving} style={{ flex: 2, borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient colors={['#4338CA', '#6D28D9']} style={{ paddingVertical: 14, alignItems: 'center' }}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Create Goal</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Log Activity Modal ─────────────────────────────────────────────────────────

const LogActivityModal = ({ visible, goal, onClose, onSave, C }) => {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ activity_type: '', value: '', note: '', activity_date: today });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goal) setForm(p => ({ ...p, activity_type: goal.goal_type }));
  }, [goal]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.value || parseFloat(form.value) <= 0) {
      Alert.alert('Invalid value', 'Please enter a value greater than 0.');
      return;
    }
    setSaving(true);
    try {
      await onSave(goal.goal_id, { ...form, value: parseFloat(form.value) });
      onClose();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to log activity');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    color: C.text, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 10,
  };

  if (!goal) return null;
  const meta = GOAL_TYPE_META[goal.goal_type] || GOAL_TYPE_META.personal;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 4 }}>Log Activity</Text>
          <Text style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>{goal.goal_title}</Text>

          <TextInput style={inputStyle} placeholder="Value contributed *" placeholderTextColor={C.muted}
            keyboardType="numeric" value={form.value} onChangeText={v => set('value', v)} />

          <TextInput style={[inputStyle, { minHeight: 70 }]} placeholder="Note (optional)"
            placeholderTextColor={C.muted} multiline value={form.note}
            onChangeText={v => set('note', v)} />

          <TextInput style={inputStyle} placeholder="Activity date (YYYY-MM-DD)"
            placeholderTextColor={C.muted} value={form.activity_date}
            onChangeText={v => set('activity_date', v)} />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <TouchableOpacity onPress={onClose} style={{
              flex: 1, paddingVertical: 14, borderRadius: 14,
              backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center',
            }}>
              <Text style={{ color: C.muted, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={saving} style={{ flex: 2, borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient colors={meta.grad} style={{ paddingVertical: 14, alignItems: 'center' }}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Log Progress</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Goal Card ─────────────────────────────────────────────────────────────────

const GoalCard = ({ goal, onLog, onDelete, C }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = GOAL_TYPE_META[goal.goal_type] || GOAL_TYPE_META.personal;
  const Icon = meta.icon;
  const pct = Math.min(parseFloat(goal.progress_percent || 0), 100);
  const statusColor = STATUS_COLORS[goal.status] || '#6B7280';

  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: 'hidden' }}>
      {/* Top color stripe */}
      <LinearGradient colors={[...meta.grad, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 3 }} />

      <View style={{ padding: 18 }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <LinearGradient colors={meta.grad} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
            <Icon color="#fff" size={20} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>{goal.goal_title}</Text>
            {!!goal.goal_description && (
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }} numberOfLines={1}>{goal.goal_description}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={{ backgroundColor: meta.grad[0] + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: meta.grad[0] }}>{pct.toFixed(0)}%</Text>
            </View>
            <View style={{ backgroundColor: statusColor + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: statusColor, textTransform: 'uppercase' }}>{goal.status}</Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <ProgressBar pct={pct} color={meta.grad[0]} />

        {/* Values row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <Text style={{ fontSize: 13, color: C.muted }}>
            <Text style={{ fontWeight: '800', color: C.text }}>{parseFloat(goal.current_value).toLocaleString()}</Text>
            {' / '}{parseFloat(goal.target_value).toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, color: C.muted }}>{goal.start_date} → {goal.end_date}</Text>
        </View>

        {/* Milestones */}
        {goal.milestones && goal.milestones.length > 0 && (
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 6, flexWrap: 'wrap' }}>
            {goal.milestones.map(m => (
              <View key={m.milestone_id} style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: m.reached ? '#10B98122' : C.card,
                paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                borderWidth: 1, borderColor: m.reached ? '#10B981' : C.border,
              }}>
                {m.reached
                  ? <CheckCircle2 color="#10B981" size={11} />
                  : <Lock color={C.muted} size={11} />}
                <Text style={{ fontSize: 10, fontWeight: '700', color: m.reached ? '#10B981' : C.muted, marginLeft: 4 }}>
                  {parseFloat(m.target_value).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Type badge */}
        <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
          <View style={{ backgroundColor: meta.grad[0] + '18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: meta.grad[0] }}>{meta.label.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }} />
          {/* Log progress button — only if active */}
          {goal.status === 'active' && (
            <TouchableOpacity onPress={() => onLog(goal)} style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: meta.grad[0] + '22',
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
            }}>
              <Plus color={meta.grad[0]} size={13} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: meta.grad[0], marginLeft: 4 }}>Log Progress</Text>
            </TouchableOpacity>
          )}
          {/* Delete */}
          <TouchableOpacity onPress={() => onDelete(goal.goal_id)} style={{
            backgroundColor: '#EF444422', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
          }}>
            <Trash2 color="#EF4444" size={13} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

const GoalsScreen = ({ C }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [logTarget, setLogTarget] = useState(null);  // goal to log activity on

  const fetchGoals = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await getGoals();
      setGoals(res.data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load goals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, []);

  const handleCreate = async (data) => {
    await createGoal(data);
    fetchGoals(true);
  };

  const handleLog = async (goalId, data) => {
    await logGoalActivity(goalId, data);
    fetchGoals(true);
  };

  const handleDelete = (goalId) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteGoal(goalId);
            fetchGoals(true);
          } catch (e) {
            Alert.alert('Error', 'Failed to delete goal.');
          }
        },
      },
    ]);
  };

  // Summary stats
  const active    = goals.filter(g => g.status === 'active').length;
  const completed = goals.filter(g => g.status === 'completed').length;
  const totalPct  = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + parseFloat(g.progress_percent || 0), 0) / goals.length)
    : 0;

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGoals(true); }} />}
      >
        {/* ── Header banner ── */}
        <FadeIn delay={0}>
          <LinearGradient
            colors={['#1E1B4B', '#312E81', '#4338CA']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 22, marginBottom: 18, overflow: 'hidden' }}
          >
            <View style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Flame color="#FCD34D" size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>TRACK YOUR PROGRESS</Text>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 }}>Goals & Milestones</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAdd(true)} style={{
                backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12,
                paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center',
              }}>
                <Plus color="#fff" size={15} />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 5 }}>New</Text>
              </TouchableOpacity>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: 'row', marginTop: 18, gap: 10 }}>
              {[
                { label: 'Active', value: active, color: '#60A5FA' },
                { label: 'Completed', value: completed, color: '#34D399' },
                { label: 'Avg Progress', value: `${totalPct}%`, color: '#FCD34D' },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: s.color, fontWeight: '900', fontSize: 18 }}>{s.value}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </FadeIn>

        {/* ── Goal list ── */}
        <FadeIn delay={80}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 1 }}>
              {goals.length === 0 ? 'NO GOALS YET' : 'YOUR GOALS'}
            </Text>
            <Text style={{ fontSize: 12, color: C.muted }}>{goals.length} total</Text>
          </View>

          {loading
            ? <ActivityIndicator color="#4338CA" style={{ marginTop: 40 }} />
            : goals.length === 0
              ? (
                <TouchableOpacity onPress={() => setShowAdd(true)} style={{
                  backgroundColor: C.surface, borderRadius: 22, borderWidth: 1,
                  borderColor: C.border, borderStyle: 'dashed', padding: 36, alignItems: 'center',
                }}>
                  <Plus color={C.muted} size={32} />
                  <Text style={{ color: C.muted, fontSize: 14, fontWeight: '600', marginTop: 12 }}>Tap to set your first goal</Text>
                </TouchableOpacity>
              )
              : goals.map(g => (
                <GoalCard
                  key={g.goal_id}
                  goal={g}
                  onLog={setLogTarget}
                  onDelete={handleDelete}
                  C={C}
                />
              ))
          }
        </FadeIn>
      </ScrollView>

      {/* ── Modals ── */}
      <AddGoalModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleCreate}
        C={C}
      />
      <LogActivityModal
        visible={!!logTarget}
        goal={logTarget}
        onClose={() => setLogTarget(null)}
        onSave={handleLog}
        C={C}
      />
    </>
  );
};

export default GoalsScreen;
