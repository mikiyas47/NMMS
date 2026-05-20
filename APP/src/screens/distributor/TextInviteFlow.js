/**
 * TextInviteFlow.js
 * Full 8-step text invitation workflow per spec.
 * Used inside InviteFlowModal when the distributor picks "Text / Chat Invitation".
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { X, ChevronRight, Edit2, Check } from 'lucide-react-native';
import {
  createInvitation, moveProspectStage, updateProspect,
  updateTextInvitationResponse,
} from '../../api/authService';

// ── System scripts ────────────────────────────────────────────────────────────
export const TEXT_INVITE_SCRIPTS = [
  { id: 's1', text: "Hey {name}! I want to share something with you that I think you'll find really interesting. Are you open to it? 😊" },
  { id: 's2', text: "Hi {name}, can I send you a short video? It's only 5 minutes and I think it could change things for you." },
  { id: 's3', text: "Hey {name}! Are you open to seeing a simple business idea? No pressure at all — just want to share something exciting." },
  { id: 's4', text: "Hi {name}, I've been thinking about you. I have something I'd love to show you when you have a few minutes. When are you free?" },
  { id: 's5', text: "Hey {name}! Quick question — are you open to earning extra income from your phone? I have something to show you." },
];

export const MESSAGING_APPS = [
  { key: 'whatsapp', label: 'WhatsApp', emoji: '💬', scheme: (p, m) => `whatsapp://send?phone=${p.replace(/\D/g,'')}&text=${encodeURIComponent(m)}` },
  { key: 'telegram', label: 'Telegram', emoji: '✈️', scheme: (p, m) => `tg://resolve?phone=${p.replace(/\D/g,'').replace(/^\+/,'')}` },
  { key: 'sms',      label: 'SMS',      emoji: '📱', scheme: (p, m) => `sms:${p}?body=${encodeURIComponent(m)}` },
  { key: 'imo',      label: 'IMO',      emoji: '📲', scheme: (p, m) => `imo://chat?phone=${p.replace(/\D/g,'')}` },
  { key: 'messenger',label: 'Messenger',emoji: '💙', scheme: (p, m) => `fb-messenger://` },
];

// ── Quick Response Actions (Step 4) ──────────────────────────────────────────
const QUICK_RESPONSES = [
  { key: 'no_response',       label: 'No Response Yet',    emoji: '⏳', color: '#6B7280' },
  { key: 'interested',        label: 'Interested',         emoji: '🔥', color: '#10B981' },
  { key: 'asked_questions',   label: 'Asked Questions',    emoji: '💬', color: '#6366F1' },
  { key: 'maybe_another_time',label: 'Maybe Another Time', emoji: '📅', color: '#F59E0B' },
  { key: 'not_interested',    label: 'Not Interested',     emoji: '❌', color: '#EF4444' },
];

// ── TextInviteFlow component ──────────────────────────────────────────────────
const TextInviteFlow = ({ prospect, onBack, onDone, C }) => {
  const [step, setStep]                   = useState('script_select');
  const [selectedScript, setSelectedScript] = useState(null);
  const [customScript, setCustomScript]   = useState('');
  const [editingScript, setEditingScript] = useState(false);
  const [selectedApp, setSelectedApp]     = useState(null);
  const [saving, setSaving]               = useState(false);
  const [invitationId, setInvitationId]   = useState(null);
  const [scoreResult, setScoreResult]     = useState(null);
  const [reminderDate, setReminderDate]   = useState('');
  const [meetingType, setMeetingType]     = useState('presentation');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingTime, setMeetingTime]     = useState('');

  const firstName = (prospect?.name || 'there').split(' ')[0];
  const phone     = prospect?.phone || '';

  const personalize = (text) => (text || '').replace(/\{name\}/g, firstName);

  const finalScript = editingScript
    ? customScript
    : (selectedScript ? personalize(selectedScript.text) : '');

  // STEP 1 — Send invitation via messaging app
  const handleSendViaApp = async (app) => {
    setSelectedApp(app);
    const msg = finalScript;
    const url = app.scheme(phone, msg);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        await Clipboard.setStringAsync(msg);
        Alert.alert(`${app.label} not found`, 'Script copied to clipboard.', [
          { text: 'OK', onPress: () => saveInvitationAndProceed(app) },
        ]);
        return;
      }
      await Linking.openURL(url);
      if (['telegram', 'imo', 'messenger'].includes(app.key)) {
        await Clipboard.setStringAsync(msg);
        Alert.alert('📝 Script copied!', `Paste it in the ${app.label} chat.`, [
          { text: 'Got it', onPress: () => saveInvitationAndProceed(app) },
        ]);
      } else {
        saveInvitationAndProceed(app);
      }
    } catch (e) {
      Alert.alert('Error', `Could not open ${app.label}.`);
    }
  };

  // Save invitation to backend → move prospect to Awaiting Response
  const saveInvitationAndProceed = async (app) => {
    setSaving(true);
    try {
      // Sanitize prospect_value — must be hot/warm/cold or omitted
      const validLevels = ['hot', 'warm', 'cold'];
      const prospectValue = validLevels.includes(prospect.interest_level) ? prospect.interest_level : 'warm';

      const res = await createInvitation({
        prospect_id:       prospect.prospect_id,
        invitation_type:   'text',
        invitation_method: app?.key || 'text',
        script_used:       finalScript || undefined,
        prospect_value:    prospectValue,
      });
      setInvitationId(res.data?.invitation_id);
      setStep('awaiting');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save invitation.');
    } finally {
      setSaving(false);
    }
  };

  // STEP 4 — Log quick response action
  const handleQuickResponse = async (responseKey) => {
    setSaving(true);
    try {
      const payload = { response: responseKey };
      if (responseKey === 'maybe_another_time' && reminderDate) {
        payload.reminder_date = reminderDate;
      }
      if (responseKey === 'interested' && meetingLocation) {
        payload.meeting_details = {
          type: meetingType,
          location: meetingLocation,
          time: meetingTime,
        };
      }
      const res = await updateTextInvitationResponse(invitationId, payload);
      setScoreResult(res);

      if (responseKey === 'no_response') {
        setStep('no_response_result');
      } else if (responseKey === 'interested') {
        setStep('interested_details');
      } else if (responseKey === 'maybe_another_time') {
        setStep('maybe_details');
      } else {
        setStep('done');
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save response.');
    } finally {
      setSaving(false);
    }
  };

  // Submit meeting details for "Interested" response
  const submitInterestedWithMeeting = async () => {
    setSaving(true);
    try {
      const res = await updateTextInvitationResponse(invitationId, {
        response: 'interested',
        meeting_details: {
          type: meetingType,
          location: meetingLocation,
          time: meetingTime,
        },
      });
      setScoreResult(res);
      setStep('done');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  // Submit maybe_another_time with reminder date
  const submitMaybeWithReminder = async () => {
    setSaving(true);
    try {
      const res = await updateTextInvitationResponse(invitationId, {
        response: 'maybe_another_time',
        reminder_date: reminderDate,
      });
      setScoreResult(res);
      setStep('done');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  // STEP 1: Script selection + edit
  if (step === 'script_select') {
    return (
      <View>
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 4 }}>
          Choose a script for {firstName}:
        </Text>
        <Text style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Select one below or edit it to make it personal.
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {TEXT_INVITE_SCRIPTS.map(s => {
            const isSelected = selectedScript?.id === s.id;
            return (
              <TouchableOpacity key={s.id} onPress={() => { setSelectedScript(s); setEditingScript(false); setCustomScript(personalize(s.text)); }}
                style={{ backgroundColor: isSelected ? 'rgba(16,185,129,0.12)' : C.inputBg, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: isSelected ? '#10B981' : C.border }}>
                <Text style={{ fontSize: 13, color: isSelected ? '#10B981' : C.text, lineHeight: 20, fontStyle: 'italic' }}>
                  "{personalize(s.text)}"
                </Text>
                {isSelected && <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700', marginTop: 6 }}>✅ Selected</Text>}
              </TouchableOpacity>
            );
          })}

          {/* Edit / custom script */}
          {selectedScript && (
            <View style={{ marginBottom: 14 }}>
              <TouchableOpacity onPress={() => { setEditingScript(!editingScript); if (!editingScript) setCustomScript(personalize(selectedScript.text)); }}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Edit2 color="#6366F1" size={14} />
                <Text style={{ color: '#6366F1', fontSize: 13, fontWeight: '700', marginLeft: 6 }}>
                  {editingScript ? 'Use original script' : 'Edit this script'}
                </Text>
              </TouchableOpacity>
              {editingScript && (
                <TextInput
                  value={customScript}
                  onChangeText={setCustomScript}
                  multiline
                  style={{ backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: '#6366F1', borderRadius: 12, padding: 12, color: C.text, fontSize: 13, lineHeight: 20, minHeight: 80 }}
                  placeholderTextColor={C.muted}
                />
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={() => { if (!selectedScript) { Alert.alert('Select a script first'); return; } setStep('app_select'); }}
            style={{ backgroundColor: '#10B981', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Next — Choose App →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 13 }}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // STEP 2: Choose messaging app
  if (step === 'app_select') {
    return (
      <View>
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 4 }}>Send via:</Text>
        <View style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' }}>
          <Text style={{ fontSize: 12, color: '#10B981', fontStyle: 'italic', lineHeight: 18 }}>
            "{finalScript}"
          </Text>
        </View>
        {MESSAGING_APPS.map(app => (
          <TouchableOpacity key={app.key} onPress={() => handleSendViaApp(app)}
            disabled={saving}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: C.border }}>
            <Text style={{ fontSize: 26, marginRight: 14 }}>{app.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{app.label}</Text>
            </View>
            {saving ? <ActivityIndicator color={C.accent} size="small" /> : <ChevronRight color={C.muted} size={16} />}
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setStep('script_select')} style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // STEP 3: Awaiting Response — prospect card with [Update] button
  if (step === 'awaiting') {
    const prospectValue = prospect?.interest_level || 'warm';
    const checkMinutes = prospectValue === 'hot' ? 6 : prospectValue === 'cold' ? 40 : 20;
    return (
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>✅</Text>
        <Text style={{ fontSize: 17, fontWeight: '900', color: C.text, marginBottom: 6 }}>
          Message sent to {firstName}!
        </Text>
        <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
          {firstName} has been moved to{' '}
          <Text style={{ color: '#F59E0B', fontWeight: '700' }}>Awaiting Response</Text>.
          {'\n'}Next intelligent check in {checkMinutes} minutes.
        </Text>

        {/* Awaiting Response card with Update button */}
        <View style={{ width: '100%', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.3)', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#F59E0B' }}>Awaiting Response</Text>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{firstName} · {selectedApp?.label || 'Text'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setStep('quick_response')}
              style={{ backgroundColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={onDone}
          style={{ width: '100%', paddingVertical: 14, alignItems: 'center', borderRadius: 14, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>Close — I'll update later</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // STEP 4: Quick Response Actions
  if (step === 'quick_response') {
    return (
      <View>
        <Text style={{ fontSize: 15, fontWeight: '900', color: C.text, marginBottom: 4 }}>
          Any update from {firstName}?
        </Text>
        <Text style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          Select what happened after you sent the message.
        </Text>
        {QUICK_RESPONSES.map(r => (
          <TouchableOpacity key={r.key} onPress={() => handleQuickResponse(r.key)}
            disabled={saving}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: r.color + '12', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: r.color + '30' }}>
            <Text style={{ fontSize: 22, marginRight: 14 }}>{r.emoji}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, flex: 1 }}>{r.label}</Text>
            {saving ? <ActivityIndicator color={r.color} size="small" /> : null}
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setStep('awaiting')} style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // STEP 5a: No Response result
  if (step === 'no_response_result') {
    const nextMin = scoreResult?.next_check_in || 20;
    return (
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>⏳</Text>
        <Text style={{ fontSize: 16, fontWeight: '900', color: C.text, marginBottom: 8 }}>
          {firstName} hasn't responded yet.
        </Text>
        <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
          Consider checking back in a little while. Next intelligent check in {nextMin} minutes.
        </Text>
        <View style={{ width: '100%', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.3)', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#F59E0B' }}>Awaiting Response</Text>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Still waiting for {firstName}</Text>
            </View>
            <TouchableOpacity onPress={() => setStep('quick_response')}
              style={{ backgroundColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={onDone}
          style={{ width: '100%', paddingVertical: 14, alignItems: 'center', borderRadius: 14, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // STEP 5b: Interested — show next action based on invitation type
  if (step === 'interested_details') {
    const isPresentationInvite = true; // text invitations always lead to presentation
    return (
      <View>
        <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>🔥</Text>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#10B981', textAlign: 'center', marginBottom: 6 }}>
          {firstName} is interested!
        </Text>
        {scoreResult?.score_explanations?.map((exp, i) => (
          <View key={i} style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' }}>
            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>✅ {exp}</Text>
          </View>
        ))}
        <View style={{ backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 14, padding: 14, marginTop: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)' }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#6366F1', marginBottom: 4 }}>Recommended Next Action:</Text>
          <Text style={{ fontSize: 14, color: C.text, fontWeight: '700' }}>📽 Send Presentation</Text>
          <Text style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {firstName} showed interest. Send a presentation now to keep the momentum going.
          </Text>
        </View>
        <TouchableOpacity onPress={onDone}
          style={{ backgroundColor: '#6366F1', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Done — Send Presentation Next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // STEP 5c: Maybe Another Time — date picker for reminder
  if (step === 'maybe_details') {
    return (
      <View>
        <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>📅</Text>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#F59E0B', textAlign: 'center', marginBottom: 6 }}>
          {firstName} said maybe another time.
        </Text>
        <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 16 }}>
          Schedule a reminder so you don't forget to follow up.
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 6 }}>Reminder Date</Text>
        <TextInput
          value={reminderDate}
          onChangeText={setReminderDate}
          placeholder="YYYY-MM-DD (e.g. 2026-06-01)"
          placeholderTextColor={C.muted}
          style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, height: 46, color: C.text, fontSize: 14, marginBottom: 16 }}
        />
        <TouchableOpacity onPress={submitMaybeWithReminder} disabled={saving}
          style={{ backgroundColor: '#F59E0B', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Save Reminder</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onDone} style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>Skip reminder</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // STEP 6: Done screen with score explanation
  if (step === 'done') {
    const response = scoreResult?.response || '';
    const newScore = scoreResult?.new_score ?? 0;
    const explanations = scoreResult?.score_explanations || [];
    const smartMsg = scoreResult?.smart_message;

    const doneMessages = {
      interested:         `${firstName} is showing real interest. This prospect showed moderate to high intent. A follow-up today may increase engagement.`,
      asked_questions:    `${firstName} asked questions — that's a strong engagement signal. Prioritize this prospect and answer their questions quickly.`,
      maybe_another_time: `${firstName} is warm but not ready yet. Keep them active and follow up at the scheduled time.`,
      not_interested:     `${firstName} isn't interested right now. They've been moved to the nurture list. You can re-engage later.`,
    };

    return (
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>🎉</Text>
        <Text style={{ fontSize: 17, fontWeight: '900', color: C.text, marginBottom: 6 }}>Response Logged!</Text>
        <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
          {doneMessages[response] || `${firstName}'s profile has been updated.`}
        </Text>

        {/* Score explanations */}
        {explanations.length > 0 && (
          <View style={{ width: '100%', backgroundColor: C.inputBg, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Score Update</Text>
            {explanations.map((exp, i) => (
              <Text key={i} style={{ fontSize: 13, color: C.text, marginBottom: 4, lineHeight: 18 }}>• {exp}</Text>
            ))}
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: newScore >= 70 ? '#EF4444' : newScore >= 35 ? '#F59E0B' : '#6B7280' }}>
                New Score: {newScore}
              </Text>
            </View>
          </View>
        )}

        {smartMsg && (
          <View style={{ width: '100%', backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
            <Text style={{ fontSize: 13, color: '#6366F1', fontWeight: '600' }}>💡 {smartMsg}</Text>
          </View>
        )}

        <TouchableOpacity onPress={onDone}
          style={{ width: '100%', backgroundColor: '#6366F1', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

export default TextInviteFlow;
