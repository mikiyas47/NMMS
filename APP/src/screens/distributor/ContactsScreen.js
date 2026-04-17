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
  FlatList,
  Linking,
  AppState,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Contacts from 'expo-contacts';
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
  Smartphone,
} from 'lucide-react-native';
import {
  getContacts,
  createContact,
  getFollowups,
  createFollowup,
  getClosings,
  createClosing,
} from '../../api/authService';
import FollowUpModal from '../../components/FollowUpModal';

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
  const [modal, setModal]   = useState(null); // 'contact' | 'followup' | 'closing' | 'phonePicker' | 'quickImport'
  const [saving, setSaving] = useState(false);
  const [targetId, setTargetId] = useState(null); // prospect_id for followup/closing

  // ── phone contact picker state
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [phoneSearch, setPhoneSearch]     = useState('');
  const [phoneLoading, setPhoneLoading]   = useState(false);

  // ── quick import state (intermediate dialog after picking a phone contact)
  const [quickContact, setQuickContact] = useState(null); // { name, phone, email }
  const [quickStatus, setQuickStatus]   = useState('New');

  // ── follow-up wizard state
  const [followupStep, setFollowupStep]         = useState('type');
  const [followupPhone, setFollowupPhone]       = useState('');
  const [followupName, setFollowupName]         = useState('');
  const [callOutcomeVal, setCallOutcomeVal]     = useState('');
  const [selectedScript, setSelectedScript]     = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [msgOutcomeVal, setMsgOutcomeVal]       = useState('');

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

  // Detect return from phone dialer → show call outcome automatically
  useEffect(() => {
    if (followupStep !== 'calling') return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setFollowupStep('callOutcome');
    });
    return () => sub.remove();
  }, [followupStep]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  // ── Open modals ───────────────────────────────────────────────────
  const openContactModal = (prefill = {}) => {
    setCName(prefill.name   ?? '');
    setCPhone(prefill.phone ?? '');
    setCEmail(prefill.email ?? '');
    setCStatus(prefill.status ?? 'New');
    setCSource('');
    setCRelation('');
    setModal('contact');
  };

  const openFollowupModal = (id, name = '', phone = '') => {
    setTargetId(id);
    setFollowupName(name);
    setFollowupPhone(phone);
    setFType(''); setFMethod(''); setFOutcome(''); setFNotes('');
    setFollowupStep('type');
    setCallOutcomeVal(''); setSelectedScript(''); setSelectedPlatform(''); setMsgOutcomeVal('');
    setModal('followup');
  };

  // ── Call flow ─────────────────────────────────────────────────────
  const initiateCall = async () => {
    const ph = (followupPhone ?? '').replace(/\s/g, '');
    if (!ph) { Alert.alert('No Phone', 'This contact has no phone number.'); return; }
    try {
      await Linking.openURL(`tel:${ph}`);
      setFollowupStep('calling');
    } catch { Alert.alert('Error', 'Could not open the phone dialer.'); }
  };

  const saveCallOutcome = async () => {
    if (!callOutcomeVal) { Alert.alert('Required', 'Please select an outcome.'); return; }
    setSaving(true);
    try {
      await createFollowup(targetId, { followup_type: 'Call', method: 'Phone', outcome: callOutcomeVal, notes: fNotes || undefined });
      setModal(null); load(true);
    } catch (e) { Alert.alert('Error', e?.message ?? 'Could not save.'); }
    finally { setSaving(false); }
  };

  // ── Message flow ──────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!selectedScript)   { Alert.alert('Required', 'Please select a script.'); return; }
    if (!selectedPlatform) { Alert.alert('Required', 'Please select a platform.'); return; }
    const ph = (followupPhone ?? '').replace(/\s/g, '');

    // Telegram cannot pre-fill text via phone deep link — copy to clipboard instead
    if (selectedPlatform === 'Telegram') {
      try {
        await Clipboard.setStringAsync(selectedScript);
        const tgUrl = `tg://resolve?phone=${ph.replace(/\+/, '')}`;
        const can = await Linking.canOpenURL(tgUrl);
        if (!can) { Alert.alert('Telegram Not Found', 'Telegram does not appear to be installed on this device.'); return; }
        await Linking.openURL(tgUrl);
        // Give Telegram a moment to open, then prompt
        setTimeout(() => {
          Alert.alert(
            '📋 Message Copied!',
            'Your script has been copied to the clipboard.\n\nIn the Telegram chat, long-press the message input and tap Paste, then send.',
            [{ text: 'Got it', onPress: () => setFollowupStep('messageOutcome') }]
          );
        }, 1200);
      } catch { Alert.alert('Error', 'Could not open Telegram.'); }
      return;
    }

    let url = '';
    if (selectedPlatform === 'SMS')      url = `sms:${ph}?body=${encodeURIComponent(selectedScript)}`;
    if (selectedPlatform === 'WhatsApp') url = `whatsapp://send?phone=${ph.replace(/\+/, '')}&text=${encodeURIComponent(selectedScript)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) { Alert.alert('App Not Found', `${selectedPlatform} is not installed on this device.`); return; }
      await Linking.openURL(url);
      setFollowupStep('messageOutcome');
    } catch { Alert.alert('Error', `Could not open ${selectedPlatform}.`); }
  };

  const saveMsgOutcome = async () => {
    if (!msgOutcomeVal) { Alert.alert('Required', 'Please select an outcome.'); return; }
    setSaving(true);
    try {
      await createFollowup(targetId, { followup_type: 'Message', method: selectedPlatform, outcome: msgOutcomeVal, notes: fNotes || undefined });
      setModal(null); load(true);
    } catch (e) { Alert.alert('Error', e?.message ?? 'Could not save.'); }
    finally { setSaving(false); }
  };

  const openClosingModal = (id) => {
    setTargetId(id);
    setClMethod(''); setClOutcome(''); setClNotes('');
    setModal('closing');
  };

  // ── Phone contact picker ──────────────────────────────────────────
  const openPhonePicker = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Please allow access to contacts in your device settings.',
      );
      return;
    }
    setPhoneLoading(true);
    setPhoneSearch('');
    setModal('phonePicker');
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        sort:   Contacts.SortTypes.FirstName,
      });
      setPhoneContacts(data ?? []);
    } catch (e) {
      Alert.alert('Error', 'Could not load phone contacts.');
      setModal(null);
    } finally {
      setPhoneLoading(false);
    }
  };

  const pickPhoneContact = (item) => {
    const name  = item.name ?? '';
    const phone = item.phoneNumbers?.[0]?.number ?? '';
    const email = item.emails?.[0]?.email ?? '';
    setQuickContact({ name, phone, email });
    setQuickStatus('New');
    setModal('quickImport');
  };

  // Save directly from quick-import dialog (no extra info)
  const saveQuickContact = async () => {
    if (!quickStatus) {
      Alert.alert('Status Required', 'Please select a status before saving.');
      return;
    }
    setSaving(true);
    try {
      await createContact({
        name:   quickContact.name,
        phone:  quickContact.phone,
        email:  quickContact.email || undefined,
        status: quickStatus,
      });
      setModal(null);
      setQuickContact(null);
      load(true);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Could not save contact.');
    } finally { setSaving(false); }
  };

  // Open full form from quick-import dialog
  const goToFullForm = () => {
    const prefill = quickContact ?? {};
    setQuickContact(null);
    openContactModal({ ...prefill, status: quickStatus });
  };

  const filteredPhoneContacts = phoneContacts.filter(c => {
    const q = phoneSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phoneNumbers?.some(p => p.number?.includes(q))
    );
  });

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
        {/* Import from phone button */}
        <TouchableOpacity
          onPress={openPhonePicker}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.12)', borderWidth: 1, borderColor: C.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 5, marginRight: 8 }}
        >
          <Smartphone color={C.accent} size={15} />
          <Text style={{ color: C.accent, fontWeight: '700', fontSize: 12 }}>Import</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openContactModal()}
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
                          onPress={() => openFollowupModal(contact.prospect_id, contact.name, contact.phone)}
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

      {/* ══ MODAL: Follow-up Wizard (Call / Message / After Event) ══ */}
      <BottomModal
        visible={modal === 'followup'}
        onClose={() => setModal(null)}
        title={
          followupStep === 'type'           ? 'Log Follow-up' :
          followupStep === 'calling'        ? '📞 Call in Progress…' :
          followupStep === 'callOutcome'    ? '📋 Call Outcome' :
          followupStep === 'scriptSelect'   ? '✍️  Choose a Script' :
          followupStep === 'platformSelect' ? '📤 Send Via' :
          followupStep === 'messageOutcome' ? '💬 Message Outcome' :
          followupStep === 'staticFlow'     ? '📅 Follow Up After Event' : 'Log Follow-up'
        }
        C={C}
      >
        {/* ── Step 1: Choose type ── */}
        {followupStep === 'type' && (
          <View>
            <Text style={{ fontSize: 13, color: C.muted, marginBottom: 14, textAlign: 'center' }}>
              How are you following up with{' '}
              <Text style={{ color: C.text, fontWeight: '700' }}>{followupName || 'this contact'}</Text>?
            </Text>
            {[
              { key: 'Call',    icon: '📞', label: 'Call',    desc: 'Make a live phone call',                       color: '#3B82F6', onTap: initiateCall },
              { key: 'Message', icon: '💬', label: 'Message', desc: 'Send a script via SMS / WhatsApp / Telegram',  color: '#10B981', onTap: () => setFollowupStep('scriptSelect') },
              { key: 'pres',    icon: '🎯', label: 'Follow up after presentation', desc: 'AI-powered post-presentation planner', color: '#8B5CF6', onTap: () => { setModal('presentationFollowup'); } },
              { key: 'event',   icon: '📅', label: 'Follow up after event',        desc: 'Log a post-event follow-up',            color: '#F59E0B', onTap: () => { setFType('Follow up after event'); setFollowupStep('staticFlow'); } },
            ].map(t => (
              <TouchableOpacity key={t.key} onPress={t.onTap}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.color + '15', borderWidth: 1.5, borderColor: t.color + '44', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 }}
              >
                <Text style={{ fontSize: 26 }}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{t.label}</Text>
                  <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Calling: waiting for user to return ── */}
        {followupStep === 'calling' && (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#3B82F622', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 38 }}>📞</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 6 }}>Calling {followupName}…</Text>
            <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
              Return to the app once the call is finished to log the outcome.
            </Text>
            <TouchableOpacity onPress={() => setFollowupStep('callOutcome')}
              style={{ backgroundColor: '#3B82F6', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Call Ended — Log Outcome</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Call Outcome ── */}
        {followupStep === 'callOutcome' && (
          <View>
            <Text style={{ fontSize: 13, color: C.muted, marginBottom: 12, textAlign: 'center' }}>
              How did the call with{' '}
              <Text style={{ color: C.text, fontWeight: '700' }}>{followupName}</Text> go?
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Saw the presentation', emoji: '🎥' },
                { label: 'Has not seen it yet',  emoji: '⏳' },
                { label: 'Interested',           emoji: '✅' },
                { label: 'Not interested',       emoji: '❌' },
                { label: 'Wants more info',      emoji: '🔍' },
                { label: 'Asked to call later',  emoji: '📆' },
                { label: 'No answer',            emoji: '🔇' },
              ].map(o => {
                const active = callOutcomeVal === o.label;
                return (
                  <TouchableOpacity key={o.label} onPress={() => setCallOutcomeVal(o.label)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? '#3B82F6' : C.inputBg, borderWidth: 1.5, borderColor: active ? '#3B82F6' : C.border }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : C.muted }}>{o.emoji} {o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Field label="Notes (optional)" value={fNotes} onChangeText={setFNotes} placeholder="Any additional details…" C={C} multiline />
            <SaveBtn onPress={saveCallOutcome} saving={saving} C={C} />
          </View>
        )}

        {/* ── Script Selection ── */}
        {followupStep === 'scriptSelect' && (
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, marginBottom: 12 }}>Choose a ready-made script:</Text>
            {[
              { text: 'Just checking if you watched the video 😊', emoji: '🎬' },
              { text: 'Do you have any questions about what I shared? 🙋', emoji: '❓' },
              { text: 'Are you joining the event today? 🎉', emoji: '📅' },
            ].map(s => {
              const active = selectedScript === s.text;
              return (
                <TouchableOpacity key={s.text} onPress={() => setSelectedScript(s.text)}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: active ? '#10B98111' : C.inputBg, borderWidth: 1.5, borderColor: active ? '#10B981' : C.border, borderRadius: 14, padding: 14, marginBottom: 10, gap: 10 }}
                >
                  <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: active ? '#10B981' : C.text, fontWeight: active ? '700' : '500', lineHeight: 20 }}>{s.text}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() => { if (!selectedScript) { Alert.alert('Required', 'Please select a script.'); return; } setFollowupStep('platformSelect'); }}
              style={{ backgroundColor: '#10B981', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Next — Choose Platform →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Platform Selection ── */}
        {followupStep === 'platformSelect' && (
          <View>
            <View style={{ backgroundColor: C.inputBg, borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Script to send:</Text>
              <Text style={{ fontSize: 13, color: C.text, fontStyle: 'italic' }}>"{selectedScript}"</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, marginBottom: 12 }}>Send via:</Text>
            {[
              { key: 'SMS',      icon: '📱', label: 'SMS',      desc: 'Default message app' },
              { key: 'WhatsApp', icon: '🟢', label: 'WhatsApp', desc: 'Send via WhatsApp' },
              { key: 'Telegram', icon: '✈️',  label: 'Telegram', desc: 'Send via Telegram' },
            ].map(p => (
              <TouchableOpacity key={p.key} onPress={() => setSelectedPlatform(p.key)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selectedPlatform === p.key ? '#10B98111' : C.inputBg, borderWidth: 1.5, borderColor: selectedPlatform === p.key ? '#10B981' : C.border, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 }}
              >
                <Text style={{ fontSize: 24 }}>{p.icon}</Text>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{p.label}</Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>{p.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={sendMessage}
              style={{ backgroundColor: '#10B981', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Send Message 🚀</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Message Outcome ── */}
        {followupStep === 'messageOutcome' && (
          <View>
            <Text style={{ fontSize: 13, color: C.muted, marginBottom: 12, textAlign: 'center' }}>
              Message sent via <Text style={{ color: C.text, fontWeight: '700' }}>{selectedPlatform}</Text>. What was the response?
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Replied with interest',  emoji: '🔥' },
                { label: 'Replied not interested', emoji: '❌' },
                { label: 'Waiting for response',   emoji: '⏳' },
                { label: 'Needs more info',         emoji: '🔍' },
                { label: 'Wants product details',  emoji: '📦' },
                { label: 'Wants pricing',           emoji: '💰' },
              ].map(o => {
                const active = msgOutcomeVal === o.label;
                return (
                  <TouchableOpacity key={o.label} onPress={() => setMsgOutcomeVal(o.label)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? '#10B981' : C.inputBg, borderWidth: 1.5, borderColor: active ? '#10B981' : C.border }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : C.muted }}>{o.emoji} {o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Field label="Notes (optional)" value={fNotes} onChangeText={setFNotes} placeholder="Any extra context…" C={C} multiline />
            <SaveBtn onPress={saveMsgOutcome} saving={saving} C={C} />
          </View>
        )}

        {/* ── Static flow: Follow up after event ── */}
        {followupStep === 'staticFlow' && (
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, marginBottom: 8 }}>Outcome</Text>
            <Pill options={['Positive', 'Neutral', 'Negative', 'Scheduled']} value={fOutcome} onChange={setFOutcome} C={C} />
            <Field label="Notes" value={fNotes} onChangeText={setFNotes} placeholder="How did it go?" C={C} multiline />
            <SaveBtn onPress={saveFollowup} saving={saving} C={C} />
          </View>
        )}
      </BottomModal>

      {/* ══ MODAL: Follow Up After Presentation (AI Planner) ══ */}
      <FollowUpModal
        visible={modal === 'presentationFollowup'}
        onClose={() => setModal(null)}
        contact={contacts.find(c => c.prospect_id === targetId)}
        targetId={targetId}
        C={C}
        onSaved={() => load(true)}
      />

      {/* ══ MODAL: Add Closing ══ */}
      <BottomModal visible={modal === 'closing'} onClose={() => setModal(null)} title="Closing Attempt" C={C}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Method</Text>
        <Pill options={['Direct Ask', 'Trial Close', 'Assumptive', 'Urgency']} value={clMethod} onChange={setClMethod} C={C} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Outcome</Text>
        <Pill options={['Positive', 'Neutral', 'Negative', 'Closed', 'Scheduled']} value={clOutcome} onChange={setClOutcome} C={C} />
        <Field label="Notes" value={clNotes} onChangeText={setClNotes} placeholder="Details of the closing…" C={C} multiline />
        <SaveBtn onPress={saveClosing} saving={saving} C={C} />
      </BottomModal>

      {/* ══ MODAL: Phone Contact Picker ══ */}
      <Modal visible={modal === 'phonePicker'} animationType="slide" transparent onRequestClose={() => setModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36, maxHeight: '85%' }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 14 }} />
              {/* Title */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <Smartphone color={C.accent} size={20} />
                <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, flex: 1, marginLeft: 8 }}>Phone Contacts</Text>
                <TouchableOpacity onPress={() => setModal(null)}>
                  <X color={C.muted} size={20} />
                </TouchableOpacity>
              </View>
              {/* Search */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, height: 42, marginBottom: 12 }}>
                <Search color={C.muted} size={15} />
                <TextInput
                  value={phoneSearch}
                  onChangeText={setPhoneSearch}
                  placeholder="Search contacts..."
                  placeholderTextColor={C.muted}
                  style={{ flex: 1, marginLeft: 8, color: C.text, fontSize: 14 }}
                  autoFocus
                />
                {phoneSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPhoneSearch('')}>
                    <X color={C.muted} size={14} />
                  </TouchableOpacity>
                )}
              </View>
              {/* List */}
              {phoneLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator color={C.accent} size="large" />
                  <Text style={{ color: C.muted, marginTop: 10, fontSize: 13 }}>Loading contacts…</Text>
                </View>
              ) : filteredPhoneContacts.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <User color={C.muted} size={36} />
                  <Text style={{ color: C.muted, marginTop: 10, fontSize: 13 }}>No contacts found</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredPhoneContacts}
                  keyExtractor={(item, i) => item.id ?? String(i)}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 420 }}
                  renderItem={({ item }) => {
                    const phone = item.phoneNumbers?.[0]?.number ?? '';
                    const initials = (item.name ?? '?').charAt(0).toUpperCase();
                    return (
                      <TouchableOpacity
                        onPress={() => pickPhoneContact(item)}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderColor: C.border }}
                      >
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent + '28', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <Text style={{ color: C.accent, fontWeight: '800', fontSize: 16 }}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{item.name}</Text>
                          {phone ? <Text style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{phone}</Text> : null}
                        </View>
                        <Phone color={C.accent} size={16} />
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══ MODAL: Quick Import Dialog ══ */}
      <Modal visible={modal === 'quickImport'} animationType="fade" transparent onRequestClose={() => setModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 24, width: '100%', paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 }}>

            {/* Icon + title */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Smartphone color={C.accent} size={26} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>Import Contact</Text>
              <Text style={{ fontSize: 13, color: C.muted, marginTop: 4, textAlign: 'center' }}>
                Review the contact and choose a status before saving.
              </Text>
            </View>

            {/* Contact preview card */}
            {quickContact && (
              <View style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent + '28', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ color: C.accent, fontWeight: '800', fontSize: 18 }}>
                      {(quickContact.name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{quickContact.name}</Text>
                    <Text style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{quickContact.phone}</Text>
                    {quickContact.email ? (
                      <Text style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>{quickContact.email}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}

            {/* Status picker — REQUIRED */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, marginBottom: 8 }}>
              Select Status <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
              {['New', 'Warm', 'Hot', 'Cold', 'Closed'].map(opt => {
                const active = quickStatus === opt;
                const meta   = STATUS_META[opt] ?? STATUS_META['New'];
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setQuickStatus(opt)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: active ? meta.color : C.inputBg,
                      borderWidth: 1.5,
                      borderColor: active ? meta.color : C.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : C.muted }}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              onPress={saveQuickContact}
              disabled={saving}
              style={{ backgroundColor: C.accent, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>💾  Save Contact</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToFullForm}
              style={{ backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.accent, borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}
            >
              <Text style={{ color: C.accent, fontWeight: '700', fontSize: 14 }}>✏️  Add More Info</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setModal(null); setQuickContact(null); }}
              style={{ alignItems: 'center', paddingVertical: 8 }}
            >
              <Text style={{ color: C.muted, fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
