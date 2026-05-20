import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking, AppState } from 'react-native';
import { MessageSquare, Phone, CheckCircle, Target } from 'lucide-react-native';

const Field = ({ label, value, onChangeText, placeholder, multiline, keyboardType, C }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      multiline={multiline}
      keyboardType={keyboardType}
      style={{
        backgroundColor: C.inputBg,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 10,
        color: C.text,
        fontSize: 14,
        height: multiline ? 80 : 'auto',
        textAlignVertical: multiline ? 'top' : 'auto',
      }}
    />
  </View>
);

const Pill = ({ options, value, onChange, C }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
    {options.map(o => {
      const active = value === o;
      return (
        <TouchableOpacity key={o} onPress={() => onChange(o)}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? C.accent : C.inputBg, borderWidth: 1.5, borderColor: active ? C.accent : C.border }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : C.muted }}>{o}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const SaveBtn = ({ onPress, saving, C }) => (
  <TouchableOpacity onPress={onPress} disabled={saving}
    style={{ backgroundColor: C.accent, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
  >
    {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Save</Text>}
  </TouchableOpacity>
);

export const FollowupWizardContent = ({ contact, onClose, onSaved, createFollowup, C }) => {
  // Steps: method → execute → completion → outcome → result
  const [step, setStep]             = useState('method');
  const [method, setMethod]         = useState('');
  const [script, setScript]         = useState('');
  const [completionStatus, setCompletionStatus] = useState('');
  const [outcome, setOutcome]       = useState('');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  const firstName = (contact?.name || 'there').split(' ')[0];
  const score     = contact?.interest_score ?? 0;

  // Recommended method based on score
  const recommendedMethod = score >= 61 ? 'WhatsApp' : score >= 41 ? 'Call' : 'WhatsApp';
  const recommendedObjective = score >= 81 ? 'Encourage Registration'
    : score >= 61 ? 'Discuss Pricing'
    : score >= 41 ? 'Answer Questions'
    : 'Schedule Meeting';

  // Suggested script based on score
  const suggestedScript = score >= 61
    ? `Hey ${firstName}, I noticed you had some questions earlier. I'd be happy to explain anything further.`
    : score >= 41
    ? `Hi ${firstName}, just checking in — did you get a chance to look at what I shared?`
    : `Hey ${firstName}! I wanted to follow up and see if you're open to a quick chat.`;

  useEffect(() => {
    if (step === 'method') {
      setScript(suggestedScript);
      setMethod(recommendedMethod);
    }
  }, [step]);

  const METHODS = [
    { key: 'WhatsApp', emoji: '💬', color: '#25D366' },
    { key: 'Call',     emoji: '📞', color: '#3B82F6' },
    { key: 'Zoom',     emoji: '💻', color: '#2D8CFF' },
    { key: 'Office Meeting', emoji: '🤝', color: '#F59E0B' },
  ];

  const COMPLETION_OPTIONS = [
    { key: 'message_sent',       label: 'Message Sent',       emoji: '✅', color: '#10B981' },
    { key: 'call_completed',     label: 'Call Completed',     emoji: '📞', color: '#3B82F6' },
    { key: 'meeting_completed',  label: 'Meeting Completed',  emoji: '🤝', color: '#8B5CF6' },
    { key: 'no_response',        label: 'No Response',        emoji: '⏳', color: '#6B7280' },
    { key: 'rescheduled',        label: 'Rescheduled',        emoji: '📅', color: '#F59E0B' },
  ];

  const OUTCOME_OPTIONS = [
    { key: 'positive',        label: 'Positive',          emoji: '🔥', color: '#10B981', score: '+15' },
    { key: 'asked_questions', label: 'Asked More Questions', emoji: '💬', color: '#6366F1', score: '+10' },
    { key: 'wants_pricing',   label: 'Wants Pricing',     emoji: '💰', color: '#F59E0B', score: '+20' },
    { key: 'wants_to_join',   label: 'Wants To Join',     emoji: '🎉', color: '#10B981', score: '+30' },
    { key: 'needs_more_time', label: 'Needs More Time',   emoji: '⏰', color: '#6B7280', score: '+5'  },
    { key: 'no_response',     label: 'No Response',       emoji: '🔇', color: '#6B7280', score: '-5'  },
    { key: 'not_interested',  label: 'Not Interested',    emoji: '❌', color: '#EF4444', score: '-20' },
  ];

  const sendViaMethod = async () => {
    if (!contact?.phone) { Alert.alert('No Phone', 'No phone number for this contact.'); return; }
    const ph = contact.phone.replace(/\s/g, '');
    const msg = encodeURIComponent(script);
    let url = '';
    if (method === 'WhatsApp') url = `whatsapp://send?phone=${ph.replace('+','')}&text=${msg}`;
    else if (method === 'Call') url = `tel:${ph}`;
    else if (method === 'Zoom') url = `https://zoom.us/start/videomeeting`;
    else { setStep('completion'); return; }
    try {
      await Linking.openURL(url);
    } catch (_) {}
    setStep('completion');
  };

  const saveOutcome = async () => {
    if (!outcome) { Alert.alert('Required', 'Please select an outcome.'); return; }
    setSaving(true);
    try {
      const { logFollowupOutcome } = require('../api/authService');
      const res = await logFollowupOutcome(contact.prospect_id, {
        outcome,
        method,
        notes: notes || undefined,
      });
      setScoreResult(res);
      setStep('result');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save outcome.');
    } finally {
      setSaving(false);
    }
  };

  // ── STEP 2: Method + Script ───────────────────────────────────────────────
  if (step === 'method') {
    return (
      <View style={{ paddingTop: 4 }}>
        <View style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#6366F1', marginBottom: 2, textTransform: 'uppercase' }}>Recommended</Text>
          <Text style={{ fontSize: 13, color: C.text, fontWeight: '700' }}>{recommendedMethod} · {recommendedObjective}</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8 }}>Communication Method</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {METHODS.map(m => (
            <TouchableOpacity key={m.key} onPress={() => setMethod(m.key)}
              style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: method === m.key ? m.color : C.inputBg, borderWidth: 1.5, borderColor: method === m.key ? m.color : C.border }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: method === m.key ? '#fff' : C.muted }}>{m.emoji} {m.key}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 6 }}>Suggested Message</Text>
        <TextInput value={script} onChangeText={setScript} multiline
          style={{ backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, color: C.text, fontSize: 13, lineHeight: 20, minHeight: 80, marginBottom: 14 }}
          placeholderTextColor={C.muted} />
        <TouchableOpacity onPress={sendViaMethod}
          style={{ backgroundColor: '#6366F1', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Send via {method} →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── STEP 3: Completion ────────────────────────────────────────────────────
  if (step === 'completion') {
    return (
      <View style={{ paddingTop: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 4 }}>What happened?</Text>
        <Text style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Log what you did with {firstName}.</Text>
        {COMPLETION_OPTIONS.map(o => (
          <TouchableOpacity key={o.key} onPress={() => { setCompletionStatus(o.key); setStep('outcome'); }}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: o.color + '12', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: o.color + '30' }}>
            <Text style={{ fontSize: 22, marginRight: 14 }}>{o.emoji}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // ── STEP 4: Outcome ───────────────────────────────────────────────────────
  if (step === 'outcome') {
    return (
      <View style={{ paddingTop: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 4 }}>Follow-up Result</Text>
        <Text style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>How did {firstName} respond?</Text>
        {OUTCOME_OPTIONS.map(o => (
          <TouchableOpacity key={o.key} onPress={() => setOutcome(o.key)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: outcome === o.key ? o.color + '20' : C.inputBg, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: outcome === o.key ? o.color : C.border }}>
            <Text style={{ fontSize: 20, marginRight: 12 }}>{o.emoji}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, flex: 1 }}>{o.label}</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: parseInt(o.score) >= 0 ? '#10B981' : '#EF4444' }}>{o.score}</Text>
          </TouchableOpacity>
        ))}
        <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" placeholderTextColor={C.muted} multiline
          style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, color: C.text, fontSize: 13, minHeight: 60, marginTop: 8, marginBottom: 14 }} />
        <TouchableOpacity onPress={saveOutcome} disabled={saving}
          style={{ backgroundColor: '#6366F1', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Save Outcome</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  // ── STEP 5: Result with score explanation ─────────────────────────────────
  if (step === 'result' && scoreResult) {
    return (
      <View style={{ paddingTop: 4, alignItems: 'center' }}>
        <Text style={{ fontSize: 36, marginBottom: 10 }}>✅</Text>
        <Text style={{ fontSize: 16, fontWeight: '900', color: C.text, marginBottom: 6 }}>Follow-up Logged!</Text>
        {scoreResult.score_explanation && (
          <View style={{ width: '100%', backgroundColor: C.inputBg, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.muted, marginBottom: 6, textTransform: 'uppercase' }}>Score Update</Text>
            <Text style={{ fontSize: 13, color: C.text, lineHeight: 18 }}>• {scoreResult.score_explanation}</Text>
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: (scoreResult.new_score ?? 0) >= 61 ? '#EF4444' : (scoreResult.new_score ?? 0) >= 21 ? '#F59E0B' : '#6B7280' }}>
                New Score: {scoreResult.new_score ?? 0} · {scoreResult.new_score >= 81 ? 'Closing Ready' : scoreResult.new_score >= 61 ? 'High Intent' : scoreResult.new_score >= 41 ? 'Interested' : scoreResult.new_score >= 21 ? 'Warm' : 'Cold'}
              </Text>
            </View>
          </View>
        )}
        <TouchableOpacity onPress={() => { onSaved && onSaved(); onClose && onClose(); }}
          style={{ width: '100%', backgroundColor: '#6366F1', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};



export const ClosingWizardContent = ({ contact, onClose, onSaved, createClosing, C }) => {
  const [clMethod, setClMethod]   = useState('');
  const [clOutcome, setClOutcome] = useState('');
  const [clNotes, setClNotes]     = useState('');
  const [saving, setSaving] = useState(false);

  const saveClosing = async () => {
    if (!clMethod && !clOutcome && !clNotes) { Alert.alert('Required', 'Fill in at least one field.'); return; }
    setSaving(true);
    try {
      await createClosing(contact?.prospect_id, { closing_method: clMethod || undefined, outcome: clOutcome || undefined, notes: clNotes || undefined });
      onSaved && onSaved();
      onClose && onClose();
    } catch (e) { Alert.alert('Error', e?.message || 'Could not save closing attempt.'); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ paddingTop: 10 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Method</Text>
      <Pill options={['Direct Ask', 'Trial Close', 'Assumptive', 'Urgency']} value={clMethod} onChange={setClMethod} C={C} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Outcome</Text>
      <Pill options={['Positive', 'Neutral', 'Negative', 'Closed', 'Scheduled']} value={clOutcome} onChange={setClOutcome} C={C} />
      <Field label="Notes" value={clNotes} onChangeText={setClNotes} placeholder="Details of the closing…" C={C} multiline />
      <SaveBtn onPress={saveClosing} saving={saving} C={C} />
    </View>
  );
};
