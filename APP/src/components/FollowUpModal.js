import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import {
  X,
  Flame,
  MessageSquare,
  Clock,
  TrendingUp,
  Phone,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { createFollowup } from '../api/authService';

const FollowUpModal = ({ visible, onClose, contact, targetId, C, onSaved }) => {
  const [outcome, setOutcome]       = useState('');
  const [interest, setInterest]     = useState(3);
  const [objections, setObjections] = useState([]);
  const [plan, setPlan]             = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]         = useState(false);

  const OBJECTION_LIST = [
    'Too expensive',
    'No time',
    'Need to consult spouse',
    'Not interested currently',
    'Pyramid scheme concern',
  ];

  const handleToggleObjection = (obj) => {
    setObjections(prev =>
      prev.includes(obj) ? prev.filter(o => o !== obj) : [...prev, obj]
    );
  };

  const handleClose = () => {
    // reset state on close so next open is fresh
    setOutcome('');
    setInterest(3);
    setObjections([]);
    setPlan(null);
    setGenerating(false);
    onClose();
  };

  const handleGeneratePlan = () => {
    if (!outcome) {
      Alert.alert('Required', 'Please select an outcome (Hot / Warm / Cold).');
      return;
    }
    setGenerating(true);
    setPlan(null);

    setTimeout(() => {
      let score =
        interest * 15 +
        (outcome === 'Hot' ? 25 : outcome === 'Warm' ? 10 : 0) -
        objections.length * 5;
      score = Math.min(98, Math.max(5, score));

      const firstName = contact?.name?.split(' ')[0] || '';
      let nextAction, script, schedule;

      if (outcome === 'Hot') {
        nextAction =
          objections.length > 0
            ? 'Address objections, then close'
            : 'Call within 24 hours to close';
        script =
          objections.length > 0
            ? `Hey ${firstName}, I totally get your concern about "${objections[0]}". Let me show you exactly how we handle that — it'll take 5 minutes. When are you free?`
            : `Hey ${firstName}! You seemed really excited after the presentation. Ready to take the next step and get started?`;
        schedule = [
          'Day 1: Call to close the deal',
          'Day 3: Send welcome kit & onboarding',
          'Day 7: First check-in session',
        ];
      } else if (outcome === 'Warm') {
        nextAction = 'Follow up with value & address concerns within 48 hrs';
        script = `Hi ${firstName}! It was great having you at the presentation. I wanted to check — what resonated most with you? I have a few testimonials that might help answer your questions.`;
        schedule = [
          'Day 1: Send testimonial video',
          'Day 3: Check-in message',
          'Day 7: Invite to live Q&A call',
        ];
      } else {
        nextAction = 'Stay on radar — keep in loop, no pressure';
        script = `Hey ${firstName}, absolutely no pressure! Just wanted to say the door is always open. I'll check back in a few weeks with some updates you might find useful.`;
        schedule = [
          'Day 7: Send a helpful update or article',
          'Day 14: Value-add message',
          'Day 30: Monthly light check-in',
        ];
      }

      setPlan({ nextAction, script, schedule, score });
      setGenerating(false);
    }, 1200);
  };

  const handleSaveToCRM = async () => {
    setSaving(true);
    try {
      const notes = `Outcome: ${outcome}, Interest: ${interest}/5. Objections: ${objections.join(', ') || 'None'}. Deal Score: ${plan.score}%`;
      await createFollowup(targetId, {
        followup_type: 'Follow up after presentation',
        method: 'In Person',
        outcome: outcome,
        notes: notes,
      });
      onSaved && onSaved();
      handleClose();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to save follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyScript = async () => {
    if (plan?.script) {
      await Clipboard.setStringAsync(plan.script);
      Alert.alert('Copied!', 'Script copied to clipboard.');
    }
  };

  const openWhatsApp = async () => {
    if (!plan?.script) return;
    const ph = (contact?.phone || '').replace(/\s/g, '').replace('+', '');
    const url = `whatsapp://send?phone=${ph}&text=${encodeURIComponent(plan.script)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Not Installed', 'WhatsApp is not installed on your device.');
      }
    } catch (e) {
      console.log('WhatsApp error:', e);
    }
  };

  if (!contact) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
        activeOpacity={1}
        onPress={handleClose}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      >
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36, maxHeight: '92%' }}>

          {/* ── Header ── */}
          <View style={{ backgroundColor: '#8B5CF608', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderBottomWidth: 1, borderColor: C.border }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#8B5CF622', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ color: '#8B5CF6', fontWeight: '800', fontSize: 19 }}>
                    {(contact.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B5CF6', letterSpacing: 0.5, marginBottom: 2 }}>
                    🎯  FOLLOW UP AFTER PRESENTATION
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>{contact.name}</Text>
                  <Text style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{contact.phone}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
                <X color={C.muted} size={22} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20, paddingTop: 20 }} keyboardShouldPersistTaps="handled">

            {/* ══ INPUT FORM ══ */}
            {!plan && (
              <View style={{ backgroundColor: C.inputBg, borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>

                {/* 1. Outcome */}
                <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 14 }}>
                  1. Presentation Outcome
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                  {[
                    { label: 'Hot',  color: '#EF4444', icon: '🔥' },
                    { label: 'Warm', color: '#F59E0B', icon: '📈' },
                    { label: 'Cold', color: '#3B82F6', icon: '❄️' },
                  ].map(o => (
                    <TouchableOpacity
                      key={o.label}
                      onPress={() => setOutcome(o.label)}
                      style={{
                        flex: 1, alignItems: 'center', justifyContent: 'center',
                        paddingVertical: 14, borderRadius: 14,
                        backgroundColor: outcome === o.label ? o.color + '22' : C.surface,
                        borderWidth: 2,
                        borderColor: outcome === o.label ? o.color : C.border,
                      }}
                    >
                      <Text style={{ fontSize: 22, marginBottom: 6 }}>{o.icon}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: outcome === o.label ? o.color : C.muted }}>
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 2. Interest Level */}
                <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 14 }}>
                  2. Interest Level (1 – 5)
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <TouchableOpacity
                      key={lvl}
                      onPress={() => setInterest(lvl)}
                      style={{
                        width: 50, height: 50, borderRadius: 25,
                        backgroundColor: interest >= lvl ? C.accent : C.surface,
                        borderWidth: 2,
                        borderColor: interest >= lvl ? C.accent : C.border,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 17, fontWeight: '800', color: interest >= lvl ? '#fff' : C.muted }}>
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 3. Objections */}
                <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 12 }}>
                  3. Objections Raised
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
                  {OBJECTION_LIST.map(obj => {
                    const selected = objections.includes(obj);
                    return (
                      <TouchableOpacity
                        key={obj}
                        onPress={() => handleToggleObjection(obj)}
                        style={{
                          paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16,
                          backgroundColor: selected ? '#EF444415' : C.surface,
                          borderWidth: 1.5,
                          borderColor: selected ? '#EF4444' : C.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? '#EF4444' : C.muted }}>
                          {obj}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Generate Button */}
                <TouchableOpacity
                  onPress={handleGeneratePlan}
                  disabled={generating}
                  style={{ backgroundColor: '#8B5CF6', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' }}
                >
                  {generating
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>✨  Generate Follow-Up Plan</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* ══ RESULT PANEL ══ */}
            {plan && (
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>🎯  Recommended Plan</Text>
                  <TouchableOpacity
                    onPress={() => setPlan(null)}
                    style={{ backgroundColor: C.inputBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B5CF6' }}>Regenerate</Text>
                  </TouchableOpacity>
                </View>

                {/* 1. Next Best Action */}
                <View style={{ backgroundColor: '#EF444411', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EF444433' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Flame color="#EF4444" size={18} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444', marginLeft: 8 }}>Next Best Action</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{plan.nextAction}</Text>
                </View>

                {/* 2. Smart Message */}
                <View style={{ backgroundColor: '#10B98111', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#10B98133' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <MessageSquare color="#10B981" size={18} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981', marginLeft: 8 }}>Smart Message Script</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: C.text, fontStyle: 'italic', lineHeight: 22, marginBottom: 14 }}>
                    "{plan.script}"
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={handleCopyScript}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#10B98155' }}
                    >
                      <Text style={{ fontSize: 15 }}>📋</Text>
                      <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: '#10B981' }}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={openWhatsApp}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', borderRadius: 12, paddingVertical: 10 }}
                    >
                      <Phone color="#fff" size={14} />
                      <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: '#fff' }}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3. Timeline + 4. Deal Score */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                  <View style={{ flex: 1, backgroundColor: '#3B82F611', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#3B82F633' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <Clock color="#3B82F6" size={15} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#3B82F6', marginLeft: 6 }}>Follow-Up Timeline</Text>
                    </View>
                    {plan.schedule.map((item, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6', marginTop: 5, marginRight: 8 }} />
                        <Text style={{ fontSize: 11, color: C.text, flex: 1 }}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ width: '38%', backgroundColor: '#F59E0B11', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F59E0B33', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp color="#F59E0B" size={22} style={{ marginBottom: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#F59E0B', marginBottom: 6 }}>Deal Score</Text>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: C.text }}>{plan.score}%</Text>
                    <Text style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 4 }}>chance to close</Text>
                  </View>
                </View>

                {/* Save to CRM */}
                <TouchableOpacity
                  onPress={handleSaveToCRM}
                  disabled={saving}
                  style={{ backgroundColor: '#8B5CF6', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' }}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>💾  Save to CRM & Continue</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default FollowUpModal;
