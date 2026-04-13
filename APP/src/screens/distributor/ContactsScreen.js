import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookUser,
  Phone,
  Mail,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Target,
  CheckCircle2,
  Clock,
  Flame,
  Snowflake,
  TrendingUp,
  User,
  RefreshCw,
} from 'lucide-react-native';
import {
  getContacts,
  createContact,
  getFollowups,
  createFollowup,
  getClosings,
  createClosing,
} from '../../api/authService';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_META = {
  New:    { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  Icon: User },
  Hot:    { color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   Icon: Flame },
  Warm:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  Icon: TrendingUp },
  Cold:   { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', Icon: Snowflake },
  Closed: { color: '#10B981', bg: 'rgba(16,185,129,0.15)',  Icon: CheckCircle2 },
};

const OUTCOME_COLOR = {
  Positive:  '#10B981',
  Neutral:   '#F59E0B',
  Negative:  '#EF4444',
  Scheduled: '#3B82F6',
  Closed:    '#8B5CF6',
};

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── Reusable input ────────────────────────────────────────────────────────────
const Field = ({ label, value, onChangeText, placeholder, keyboardType, C, multiline }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      style={{
        backgroundColor: C.inputBg,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 10 : 0,
        height: multiline ? 80 : 46,
        color: C.text,
        fontSize: 14,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  </View>
);

// ── Pill selector ─────────────────────────────────────────────────────────────
const Pill = ({ options, value, onChange, C }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
    {options.map(opt => {
      const active = value === opt;
      return (
        <TouchableOpacity
          key={opt}
          onPress={() => onChange(opt)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: active ? C.accent : C.inputBg,
            borderWidth: 1,
            borderColor: active ? C.accent : C.border,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : C.muted }}>
            {opt}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const ContactsScreen = ({ C }) => {
  const [tab, setTab]           = useState('contacts');   // contacts | followups | closing
  const [search, setSearch]     = useState('');
  const [contacts, setContacts] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [closings, setClosings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // ── modal state
  const [modal, setModal]   = useState(null); // 'contact' | 'followup' | 'closing'
  const [saving, setSaving] = useState(false);
  const [targetId, setTargetId] = useState(null); // prospect_id for followup/closing

  // contact form
  const [cName, setCName]   = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cStatus, setCStatus]   = useState('New');
  const [cSource, setCSource]   = useState('');
  const [cRelation, setCRelation] = useState('');

  // followup form
  const [fType, setFType]     = useState('');
  const [fMethod, setFMethod] = useState('');
  const [fOutcome, setFOutcome] = useState('');
  const [fNotes, setFNotes]   = useState('');

  // closing form
  const [clMethod, setClMethod]   = useState('');
  const [clOutcome, setClOutcome] = useState('');
  const [clNotes, setClNotes]     = useState('');

  // ── Load data ─────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [c, f, cl] = await Promise.all([getContacts(), getFollowups(), getClosings()]);
      setContacts(c.data ?? []);
      setFollowups(f.data ?? []);
      setClosings(cl.data ?? []);
    } catch (e) {
      console.log('Contacts load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  // ── Open modals ───────────────────────────────────────────────────
  const openContactModal = () => {
    setCName(''); setCPhone(''); setCEmail('');
    setCStatus('New'); setCSource(''); setCRelation('');
    setModal('contact');
  };

  const openFollowupModal = (id) => {
    setTargetId(id);
    setFType(''); setFMethod(''); setFOutcome(''); setFNotes('');
    setModal('followup');
  };

  const openClosingModal = (id) => {
    setTargetId(id);
    setClMethod(''); setClOutcome(''); setClNotes('');
    setModal('closing');
  };

  // ── Save handlers ─────────────────────────────────────────────────
  const saveContact = async () => {
    if (!cName.trim() || !cPhone.trim()) {
      Alert.alert('Required', 'Name and phone are required.');
      return;
    }
    setSaving(true);
    try {
      await createContact({ name: cName.trim(), phone: cPhone.trim(), email: cEmail.trim() || undefined, status: cStatus, source: cSource || undefined, relationship: cRelation || undefined });
      setModal(null);
      load(true);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Could not save contact.');
    } finally { setSaving(false); }
  };

  const saveFollowup = async () => {
    if (!fType && !fMethod && !fOutcome && !fNotes) {
      Alert.alert('Required', 'Fill in at least one field.');
      return;
    }
    setSaving(true);
    try {
      await createFollowup(targetId, { followup_type: fType || undefined, method: fMethod || undefined, outcome: fOutcome || undefined, notes: fNotes || undefined });
      setModal(null);
      load(true);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Could not save follow-up.');
    } finally { setSaving(false); }
  };

  const saveClosing = async () => {
    if (!clMethod && !clOutcome && !clNotes) {
      Alert.alert('Required', 'Fill in at least one field.');
      return;
    }
    setSaving(true);
    try {
      await createClosing(targetId, { closing_method: clMethod || undefined, outcome: clOutcome || undefined, notes: clNotes || undefined });
      setModal(null);
      load(true);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Could not save closing attempt.');
    } finally { setSaving(false); }
  };

  // ── Filter ────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filteredContacts  = contacts.filter(c  => c.name?.toLowerCase().includes(q) || c.phone?.includes(q));
  const filteredFollowups = followups.filter(f  => f.prospect?.name?.toLowerCase().includes(q) || f.method?.toLowerCase().includes(q));
  const filteredClosings  = closings.filter(cl => cl.prospect?.name?.toLowerCase().includes(q) || cl.closing_method?.toLowerCase().includes(q));

  // ── Summary cards ─────────────────────────────────────────────────
  const hotCount    = contacts.filter(c => c.status === 'Hot').length;
  const closedCount = contacts.filter(c => c.status === 'Closed').length;

  // ═══════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1 }}>
      {/* ── Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <BookUser color={C.accent} size={26} />
        <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginLeft: 8 }}>Contacts</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={openContactModal}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, gap: 6 }}
        >
          <Plus color="#fff" size={16} />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
        Manage your prospects, follow-ups & closings
      </Text>

      {/* ── Stats row ── */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Total', value: contacts.length, color: C.blue },
          { label: 'Hot 🔥', value: hotCount, color: C.red },
          { label: 'Closed ✓', value: closedCount, color: C.green },
          { label: 'Follow-ups', value: followups.length, color: C.purple },
        ].map(s => (
          <View key={s.label} style={{ flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Search ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 12 }}>
        <Search color={C.muted} size={16} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search..."
          placeholderTextColor={C.muted}
          style={{ flex: 1, marginLeft: 8, color: C.text, fontSize: 14 }}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X color={C.muted} size={16} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tabs ── */}
      <View style={{ flexDirection: 'row', backgroundColor: C.inputBg, borderRadius: 14, padding: 4, marginBottom: 14 }}>
        {[
          { key: 'contacts',  label: 'Contacts',   count: contacts.length },
          { key: 'followups', label: 'Follow-ups',  count: followups.length },
          { key: 'closing',   label: 'Closing',     count: closings.length },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 11, backgroundColor: tab === t.key ? C.accent : 'transparent', gap: 5 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: tab === t.key ? '#fff' : C.muted }}>{t.label}</Text>
            <View style={{ backgroundColor: tab === t.key ? 'rgba(255,255,255,0.25)' : C.card, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: tab === t.key ? '#fff' : C.muted }}>{t.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
          <Text style={{ color: C.muted, marginTop: 10, fontSize: 13 }}>Loading contacts…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        >

          {/* ══ CONTACTS TAB ══ */}
          {tab === 'contacts' && (
            <>
              {filteredContacts.length === 0 ? (
                <EmptyState icon={<BookUser color={C.muted} size={40} />} label="No contacts yet" sub="Tap Add to create your first contact" C={C} />
              ) : filteredContacts.map(contact => {
                const meta   = STATUS_META[contact.status] ?? STATUS_META['New'];
                const isOpen = expandedId === contact.prospect_id;
                return (
                  <View key={contact.prospect_id} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 18, marginBottom: 10, overflow: 'hidden' }}>
                    <TouchableOpacity
                      onPress={() => setExpandedId(isOpen ? null : contact.prospect_id)}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
                      activeOpacity={0.8}
                    >
                      {/* Avatar */}
                      <LinearGradient colors={[meta.color + 'CC', meta.color + '88']} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>{contact.name?.charAt(0)?.toUpperCase()}</Text>
                      </LinearGradient>
                      {/* Info */}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontWeight: '700', fontSize: 15, color: C.text }}>{contact.name}</Text>
                        <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{contact.phone}</Text>
                        {contact.email ? <Text style={{ fontSize: 11, color: C.sub }}>{contact.email}</Text> : null}
                      </View>
                      {/* Status badge */}
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={{ backgroundColor: meta.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: meta.color }}>{contact.status}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Text style={{ fontSize: 10, color: C.muted }}>📋 {contact.followups_count ?? 0}</Text>
                          <Text style={{ fontSize: 10, color: C.muted }}>🎯 {contact.closing_attempts_count ?? 0}</Text>
                        </View>
                      </View>
                      {isOpen ? <ChevronUp color={C.muted} size={16} style={{ marginLeft: 8 }} /> : <ChevronDown color={C.muted} size={16} style={{ marginLeft: 8 }} />}
                    </TouchableOpacity>

                    {/* Expanded actions */}
                    {isOpen && (
                      <View style={{ borderTopWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 10 }}>
                        {contact.source ? <MetaChip label={`Source: ${contact.source}`} C={C} /> : null}
                        {contact.relationship ? <MetaChip label={contact.relationship} C={C} /> : null}
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity
                          onPress={() => openFollowupModal(contact.prospect_id)}
                          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.12)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, gap: 5 }}
                        >
                          <MessageSquare color={C.accent} size={14} />
                          <Text style={{ fontSize: 12, color: C.accent, fontWeight: '700' }}>Follow-up</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openClosingModal(contact.prospect_id)}
                          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, gap: 5 }}
                        >
                          <Target color={C.green} size={14} />
                          <Text style={{ fontSize: 12, color: C.green, fontWeight: '700' }}>Close</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* ══ FOLLOW-UPS TAB ══ */}
          {tab === 'followups' && (
            <>
              {filteredFollowups.length === 0 ? (
                <EmptyState icon={<MessageSquare color={C.muted} size={40} />} label="No follow-ups yet" sub="Expand a contact and tap Follow-up" C={C} />
              ) : filteredFollowups.map(f => {
                const oc = OUTCOME_COLOR[f.outcome] ?? C.muted;
                return (
                  <View key={f.followup_id} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare color={C.accent} size={16} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontWeight: '700', fontSize: 14, color: C.text }}>{f.prospect?.name ?? '—'}</Text>
                        <Text style={{ fontSize: 11, color: C.muted }}>{f.prospect?.phone}</Text>
                      </View>
                      {f.outcome ? (
                        <View style={{ backgroundColor: oc + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: oc }}>{f.outcome}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: f.notes ? 8 : 0 }}>
                      {f.followup_type ? <MetaChip label={`Type: ${f.followup_type}`} C={C} /> : null}
                      {f.method ? <MetaChip label={`Via: ${f.method}`} C={C} /> : null}
                    </View>
                    {f.notes ? <Text style={{ fontSize: 12, color: C.sub, lineHeight: 18 }}>{f.notes}</Text> : null}
                    <Text style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
                      <Clock size={10} color={C.muted} /> {fmt(f.created_at)}
                    </Text>
                  </View>
                );
              })}
            </>
          )}

          {/* ══ CLOSING TAB ══ */}
          {tab === 'closing' && (
            <>
              {filteredClosings.length === 0 ? (
                <EmptyState icon={<Target color={C.muted} size={40} />} label="No closing attempts yet" sub="Expand a contact and tap Close" C={C} />
              ) : filteredClosings.map(cl => {
                const oc = OUTCOME_COLOR[cl.outcome] ?? C.muted;
                return (
                  <View key={cl.closing_id} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Target color={C.green} size={16} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontWeight: '700', fontSize: 14, color: C.text }}>{cl.prospect?.name ?? '—'}</Text>
                        <Text style={{ fontSize: 11, color: C.muted }}>{cl.prospect?.phone}</Text>
                      </View>
                      {cl.outcome ? (
                        <View style={{ backgroundColor: oc + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: oc }}>{cl.outcome}</Text>
                        </View>
                      ) : null}
                    </View>
                    {cl.closing_method ? <MetaChip label={`Method: ${cl.closing_method}`} C={C} /> : null}
                    {cl.notes ? <Text style={{ fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 18 }}>{cl.notes}</Text> : null}
                    <Text style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>{fmt(cl.created_at)}</Text>
                  </View>
                );
              })}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ══ MODAL: Add Contact ══ */}
      <BottomModal visible={modal === 'contact'} onClose={() => setModal(null)} title="New Contact" C={C}>
        <Field label="Full Name *" value={cName} onChangeText={setCName} placeholder="e.g. John Doe" C={C} />
        <Field label="Phone *" value={cPhone} onChangeText={setCPhone} placeholder="+251 9..." keyboardType="phone-pad" C={C} />
        <Field label="Email" value={cEmail} onChangeText={setCEmail} placeholder="john@example.com" keyboardType="email-address" C={C} />
        <Field label="Source" value={cSource} onChangeText={setCSource} placeholder="Referral, Event, Social…" C={C} />
        <Field label="Relationship" value={cRelation} onChangeText={setCRelation} placeholder="Friend, Colleague…" C={C} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Status</Text>
        <Pill options={['New', 'Warm', 'Hot', 'Cold', 'Closed']} value={cStatus} onChange={setCStatus} C={C} />
        <SaveBtn onPress={saveContact} saving={saving} C={C} />
      </BottomModal>

      {/* ══ MODAL: Add Followup ══ */}
      <BottomModal visible={modal === 'followup'} onClose={() => setModal(null)} title="Log Follow-up" C={C}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Type</Text>
        <Pill options={['Call', 'Message', 'Meeting', 'Email']} value={fType} onChange={setFType} C={C} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Method</Text>
        <Pill options={['Phone', 'WhatsApp', 'Telegram', 'In-person']} value={fMethod} onChange={setFMethod} C={C} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Outcome</Text>
        <Pill options={['Positive', 'Neutral', 'Negative', 'Scheduled']} value={fOutcome} onChange={setFOutcome} C={C} />
        <Field label="Notes" value={fNotes} onChangeText={setFNotes} placeholder="How did it go?" C={C} multiline />
        <SaveBtn onPress={saveFollowup} saving={saving} C={C} />
      </BottomModal>

      {/* ══ MODAL: Add Closing ══ */}
      <BottomModal visible={modal === 'closing'} onClose={() => setModal(null)} title="Closing Attempt" C={C}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Method</Text>
        <Pill options={['Direct Ask', 'Trial Close', 'Assumptive', 'Urgency']} value={clMethod} onChange={setClMethod} C={C} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Outcome</Text>
        <Pill options={['Positive', 'Neutral', 'Negative', 'Closed', 'Scheduled']} value={clOutcome} onChange={setClOutcome} C={C} />
        <Field label="Notes" value={clNotes} onChangeText={setClNotes} placeholder="Details of the closing…" C={C} multiline />
        <SaveBtn onPress={saveClosing} saving={saving} C={C} />
      </BottomModal>
    </View>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────
const MetaChip = ({ label, C }) => (
  <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
    <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600' }}>{label}</Text>
  </View>
);

const EmptyState = ({ icon, label, sub, C }) => (
  <View style={{ alignItems: 'center', paddingTop: 60, paddingBottom: 30 }}>
    {icon}
    <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginTop: 14 }}>{label}</Text>
    <Text style={{ fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center' }}>{sub}</Text>
  </View>
);

const SaveBtn = ({ onPress, saving, C }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={saving}
    style={{ backgroundColor: C.accent, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
  >
    {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Save</Text>}
  </TouchableOpacity>
);

const BottomModal = ({ visible, onClose, title, children, C }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} activeOpacity={1} onPress={onClose} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 }}>
        {/* Handle */}
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }} />
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, flex: 1 }}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <X color={C.muted} size={20} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

export default ContactsScreen;
