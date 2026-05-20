const fs = require('fs');

const filePath = 'app/src/screens/distributor/ProspectsScreen.js';
let content = fs.readFileSync(filePath, 'utf-8');

const startMarker = 'const InviteFlowModal = ({ visible, prospect, onClose, onSaved, C }) => {';
const endMarker = 'const FormField = ({ label, value, onChange, placeholder, C, multiline }) => (';

const parts = content.split(startMarker);
if (parts.length < 2) {
    console.log('Start marker not found');
    process.exit(1);
}

const preContent = parts[0];
const rest = parts[1];

const endParts = rest.split(endMarker);
if (endParts.length < 2) {
    console.log('End marker not found');
    process.exit(1);
}

const postContent = "// ── Shared sub-components ───────────────────────────────────────────────────────────────────────\n" + endMarker + endParts.slice(1).join(endMarker);

const newModal = `const InviteFlowModal = ({ visible, prospect, onClose, onSaved, C }) => {
  const [step, setStep]             = useState('method');
  const [selectedScript, setSelectedScript] = useState(null);
  const [selectedApp, setSelectedApp]       = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [saving, setSaving]         = useState(false);

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
  const name  = prospect?.name  || 'there';

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
    const cleanPhone = phone.replace(/\\s/g, '');
    if (!cleanPhone) { Alert.alert('No phone number', 'This prospect has no phone number.'); return; }
    try {
      const canOpen = await Linking.canOpenURL(\`tel:\${cleanPhone}\`);
      if (!canOpen) { Alert.alert('Cannot make call', 'Phone calls are not supported on this device.'); return; }
      await Linking.openURL(\`tel:\${cleanPhone}\`);
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
      let finalNotes = \`\${type === 'call' ? 'Call' : 'Text'} invitation — outcome: \${outcome}. \`;
      if (extraData.notes) finalNotes += extraData.notes;

      const { createInvitation, moveProspectStage, updateProspect } = require('../../api/authService');
      
      await createInvitation({
        prospect_id: prospect.prospect_id,
        invitation_type: type === 'call' ? 'one_on_one_call' : 'one_on_one_call',
        notes: finalNotes,
      });

      if (overrideStage || extraData.next_action_date || extraData.new_phone) {
        if (extraData.new_phone) {
           await updateProspect(prospect.prospect_id, { phone: extraData.new_phone });
        }
        const stagePayload = { stage: overrideStage || prospect.stage, notes: finalNotes };
        if (extraData.next_action_date) {
           stagePayload.next_action = extraData.next_action;
           stagePayload.next_action_date = extraData.next_action_date;
        }
        await moveProspectStage(prospect.prospect_id, stagePayload);
      }

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
              {step === 'method' && (
                <View>
                  <Text style={{ fontSize:13, color:C.muted, textAlign:'center', marginBottom:20 }}>How do you want to invite <Text style={{ color:C.text, fontWeight:'700' }}>{name.split(' ')[0]}</Text>?</Text>
                  <TouchableOpacity onPress={() => setStep('call_confirm')} style={{ flexDirection:'row', alignItems:'center', backgroundColor:'rgba(59,130,246,0.1)', borderRadius:18, padding:18, marginBottom:12, borderWidth:1.5, borderColor:'rgba(59,130,246,0.3)' }}>
                    <Text style={{ fontSize:32, marginRight:16 }}>📞</Text>
                    <View style={{ flex:1 }}><Text style={{ fontSize:16, fontWeight:'800', color:C.text }}>Call Invitation</Text><Text style={{ fontSize:12, color:C.muted, marginTop:3 }}>Make a live phone call</Text></View>
                    <ChevronRight color="#3B82F6" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('script_select')} style={{ flexDirection:'row', alignItems:'center', backgroundColor:'rgba(16,185,129,0.1)', borderRadius:18, padding:18, borderWidth:1.5, borderColor:'rgba(16,185,129,0.3)' }}>
                    <Text style={{ fontSize:32, marginRight:16 }}>💬</Text>
                    <View style={{ flex:1 }}><Text style={{ fontSize:16, fontWeight:'800', color:C.text }}>Text / Chat Invitation</Text><Text style={{ fontSize:12, color:C.muted, marginTop:3 }}>WhatsApp, Telegram, SMS</Text></View>
                    <ChevronRight color="#10B981" size={20} />
                  </TouchableOpacity>
                </View>
              )}

              {step === 'call_confirm' && (
                <View style={{ alignItems:'center' }}>
                  <View style={{ width:80, height:80, borderRadius:40, backgroundColor:'rgba(59,130,246,0.15)', alignItems:'center', justifyContent:'center', marginBottom:16 }}><Text style={{ fontSize:40 }}>📞</Text></View>
                  <Text style={{ fontSize:18, fontWeight:'900', color:C.text, marginBottom:6 }}>Call {name.split(' ')[0]}</Text>
                  <Text style={{ fontSize:14, color:C.muted, marginBottom:4 }}>{phone}</Text>
                  <TouchableOpacity onPress={handleCall} style={{ backgroundColor:'#3B82F6', borderRadius:16, paddingVertical:16, paddingHorizontal:40, flexDirection:'row', alignItems:'center', gap:10, marginBottom:12, width:'100%', justifyContent:'center' }}>
                    <Text style={{ fontSize:20 }}>📞</Text><Text style={{ color:'#fff', fontWeight:'900', fontSize:16 }}>Start Call Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('method')} style={{ paddingVertical:10 }}><Text style={{ color:C.muted, fontSize:13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'calling' && (
                <View style={{ alignItems:'center', paddingVertical:20 }}>
                  <View style={{ width:80, height:80, borderRadius:40, backgroundColor:'rgba(59,130,246,0.15)', alignItems:'center', justifyContent:'center', marginBottom:16 }}><Text style={{ fontSize:40 }}>📞</Text></View>
                  <Text style={{ fontSize:18, fontWeight:'900', color:C.text, marginBottom:8 }}>Calling {name.split(' ')[0]}…</Text>
                  <Text style={{ fontSize:13, color:C.muted, textAlign:'center', marginBottom:28 }}>Return to the app once the call ends to log the outcome.</Text>
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ backgroundColor:'#3B82F6', borderRadius:16, paddingVertical:14, paddingHorizontal:32, width:'100%', alignItems:'center' }}>
                    <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Call Ended — Log Outcome</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 'call_outcome' && (
                <View>
                  <Text style={{ fontSize:14, fontWeight:'800', color:C.text, marginBottom:16, textAlign:'center' }}>How did the call with {name.split(' ')[0]} go?</Text>
                  {CALL_OUTCOMES.map(o => (
                    <TouchableOpacity key={o.key} onPress={() => handleCallOutcomeSelect(o.key)} disabled={saving} style={{ flexDirection:'row', alignItems:'center', backgroundColor:o.color+'12', borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor:o.color+'30' }}>
                      <Text style={{ fontSize:22, marginRight:14 }}>{o.emoji}</Text><Text style={{ fontSize:14, fontWeight:'700', color:C.text, flex:1 }}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {step === 'success_details' && (
                <View>
                  <Text style={{ fontSize:16, fontWeight:'800', color:'#10B981', marginBottom:16 }}>✅ Awesome! How are you meeting?</Text>
                  <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
                    <TouchableOpacity onPress={() => setSuccessType('in_person')} style={{ flex:1, padding:14, borderRadius:12, borderWidth:1.5, borderColor: successType==='in_person' ? '#10B981':C.border, backgroundColor: successType==='in_person'?'rgba(16,185,129,0.1)':C.inputBg, alignItems:'center' }}><Text style={{ fontWeight:'700', color:successType==='in_person'?'#10B981':C.muted }}>🤝 In Person</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setSuccessType('platform')} style={{ flex:1, padding:14, borderRadius:12, borderWidth:1.5, borderColor: successType==='platform' ? '#10B981':C.border, backgroundColor: successType==='platform'?'rgba(16,185,129,0.1)':C.inputBg, alignItems:'center' }}><Text style={{ fontWeight:'700', color:successType==='platform'?'#10B981':C.muted }}>💻 Via Platform</Text></TouchableOpacity>
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
                     if ((successType==='in_person' && (!locInput||!timeInput)) || (successType==='platform' && (!platformInput||!timeInput))) {
                        Alert.alert('Required', 'Please fill out all meeting details.'); return;
                     }
                     const details = successType==='in_person' ? \`In person at \${locInput} (\${timeInput})\` : \`Via \${platformInput} (\${timeInput})\`;
                     submitFinalOutcome('success', 'call', 'Presentation Scheduled', { notes: details, next_action: 'Meeting', next_action_date: '' });
                  }} />
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ paddingVertical:10, alignItems:'center' }}><Text style={{ color:C.muted, fontSize:13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'call_later_details' && (
                <View>
                  <Text style={{ fontSize:16, fontWeight:'800', color:'#F59E0B', marginBottom:16 }}>📆 When should we call back?</Text>
                  <FormField label="Date (YYYY-MM-DD)" value={callLaterDate} onChange={setCallLaterDate} placeholder="e.g. 2026-05-20" C={C} />
                  <FormField label="Time / Context" value={callLaterTime} onChange={setCallLaterTime} placeholder="e.g. 3:00 PM" C={C} />
                  <ActionBtn label="Set Reminder" color="#F59E0B" saving={saving} onPress={() => {
                     if (!callLaterDate || !callLaterTime) { Alert.alert('Required', 'Please enter date and time.'); return; }
                     submitFinalOutcome('call_later', 'call', 'Follow-Up Needed', { notes: \`Call back at \${callLaterTime}\`, next_action: 'Call back', next_action_date: callLaterDate });
                  }} />
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ paddingVertical:10, alignItems:'center' }}><Text style={{ color:C.muted, fontSize:13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'no_answer_details' && (
                <View>
                  <Text style={{ fontSize:16, fontWeight:'800', color:'#6B7280', marginBottom:16 }}>📴 Are you going to call again?</Text>
                  <FormField label="Date to call again (YYYY-MM-DD)" value={callAgainDate} onChange={setCallAgainDate} placeholder="e.g. 2026-05-20" C={C} />
                  <FormField label="Time" value={callAgainTime} onChange={setCallAgainTime} placeholder="e.g. Tomorrow morning" C={C} />
                  <ActionBtn label="Save Reminder" color="#6B7280" saving={saving} onPress={() => {
                     if (!callAgainDate) { Alert.alert('Required', 'Date is required to set a reminder.'); return; }
                     submitFinalOutcome('no_answer', 'call', 'Follow-Up Needed', { notes: \`Will call again at \${callAgainTime}\`, next_action: 'Call again', next_action_date: callAgainDate });
                  }} />
                  <TouchableOpacity onPress={() => submitFinalOutcome('no_answer', 'call')} style={{ paddingVertical:16, alignItems:'center' }}><Text style={{ color:'#EF4444', fontSize:14, fontWeight:'700' }}>No, do not remind me</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ paddingVertical:10, alignItems:'center' }}><Text style={{ color:C.muted, fontSize:13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'wrong_number_details' && (
                <View>
                  <Text style={{ fontSize:16, fontWeight:'800', color:'#F97316', marginBottom:16 }}>⚠️ Wrong Number</Text>
                  <Text style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Do you have the correct number? Edit it below to update the prospect and call again.</Text>
                  <FormField label="Correct Phone Number" value={newPhone} onChange={setNewPhone} placeholder="+123..." C={C} />
                  <ActionBtn label="Update & Save" color="#F97316" saving={saving} onPress={() => {
                     if (!newPhone || newPhone === phone) { Alert.alert('Wait', 'Update the phone number first.'); return; }
                     submitFinalOutcome('wrong_number', 'call', null, { new_phone: newPhone, notes: \`Number corrected to \${newPhone}\` });
                  }} />
                  <TouchableOpacity onPress={() => submitFinalOutcome('wrong_number', 'call', 'Rejected')} style={{ paddingVertical:16, alignItems:'center' }}><Text style={{ color:'#EF4444', fontSize:14, fontWeight:'700' }}>No, move to Rejected</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('call_outcome')} style={{ paddingVertical:10, alignItems:'center' }}><Text style={{ color:C.muted, fontSize:13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'script_select' && (
                <View>
                  <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:14 }}>Choose a script for {name.split(' ')[0]}:</Text>
                  {INVITE_SCRIPTS.map(s => {
                    const isSelected = selectedScript?.id === s.id;
                    return (
                      <TouchableOpacity key={s.id} onPress={() => setSelectedScript(s)} style={{ backgroundColor: isSelected ? 'rgba(16,185,129,0.12)' : C.inputBg, borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor: isSelected ? '#10B981' : C.border }}>
                        <Text style={{ fontSize:13, color: isSelected ? '#10B981' : C.text, lineHeight:20, fontStyle:'italic' }}>"\${personalizeScript(s.text)}"</Text>
                        {isSelected && <Text style={{ color:'#10B981', fontSize:11, fontWeight:'700', marginTop:6 }}>✅ Selected</Text>}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity onPress={() => { if (!selectedScript) { Alert.alert('Select a script first'); return; } setStep('app_select'); }} style={{ backgroundColor:'#10B981', borderRadius:14, height:50, alignItems:'center', justifyContent:'center', marginTop:6 }}><Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Next — Choose App →</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('method')} style={{ paddingVertical:10, alignItems:'center' }}><Text style={{ color:C.muted, fontSize:13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'app_select' && (
                <View>
                  <Text style={{ fontSize:13, fontWeight:'800', color:C.text, marginBottom:12 }}>Send via:</Text>
                  {MESSAGING_APPS.map(app => (
                    <TouchableOpacity key={app.key} onPress={async () => {
                      setSelectedApp(app);
                      const cleanPhone = phone.replace(/\\s/g, '');
                      const msg = personalizeScript(selectedScript?.text || '');
                      const url = app.scheme(cleanPhone, msg);
                      try {
                        const canOpen = await Linking.canOpenURL(url);
                        if (!canOpen) { await Clipboard.setStringAsync(msg); Alert.alert(\`\${app.label} not found\`, 'Message copied to clipboard.', [{ text:'OK', onPress:()=>setStep('text_confirm') }]); return; }
                        await Linking.openURL(url);
                        if (['telegram','imo','messenger'].includes(app.key)) {
                          await Clipboard.setStringAsync(msg); Alert.alert('📝 Script copied!', \`Paste it in the \${app.label} chat.\`, [{ text:'Got it', onPress:()=>setStep('text_confirm') }]);
                        } else setStep('text_confirm');
                      } catch(e) { Alert.alert('Error', \`Could not open \${app.label}.\`); }
                    }} style={{ flexDirection:'row', alignItems:'center', backgroundColor:C.inputBg, borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor:C.border }}>
                      <Text style={{ fontSize:26, marginRight:14 }}>{app.emoji}</Text>
                      <View style={{ flex:1 }}><Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{app.label}</Text></View>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setStep('script_select')} style={{ paddingVertical:10, alignItems:'center' }}><Text style={{ color:C.muted, fontSize:13 }}>← Back</Text></TouchableOpacity>
                </View>
              )}

              {step === 'text_confirm' && (
                <View style={{ alignItems:'center' }}>
                  <Text style={{ fontSize:16, fontWeight:'900', color:C.text, marginBottom:8 }}>Message sent via {selectedApp?.label}</Text>
                  <Text style={{ fontSize:13, color:C.muted, textAlign:'center', marginBottom:24 }}>Was the invitation delivered successfully?</Text>
                  <View style={{ flexDirection:'row', gap:12, width:'100%' }}>
                    <TouchableOpacity onPress={() => setStep('text_outcome')} style={{ flex:1, backgroundColor:'rgba(16,185,129,0.12)', borderRadius:14, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'rgba(16,185,129,0.3)' }}><Text style={{ color:'#10B981', fontWeight:'800', fontSize:14 }}>Yes, delivered</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setStep('text_outcome')} style={{ flex:1, backgroundColor:'rgba(239,68,68,0.1)', borderRadius:14, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'rgba(239,68,68,0.25)' }}><Text style={{ color:'#EF4444', fontWeight:'800', fontSize:14 }}>No, failed</Text></TouchableOpacity>
                  </View>
                </View>
              )}

              {step === 'text_outcome' && (
                <View>
                  <Text style={{ fontSize:14, fontWeight:'800', color:C.text, marginBottom:16, textAlign:'center' }}>What was the response from {name.split(' ')[0]}?</Text>
                  {TEXT_OUTCOMES.map(o => (
                    <TouchableOpacity key={o.key} onPress={() => submitFinalOutcome(o.key, 'text')} disabled={saving} style={{ flexDirection:'row', alignItems:'center', backgroundColor:o.color+'12', borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor:o.color+'30' }}>
                      <Text style={{ fontSize:22, marginRight:14 }}>{o.emoji}</Text><Text style={{ fontSize:14, fontWeight:'700', color:C.text, flex:1 }}>{o.label}</Text>
                      {saving && <ActivityIndicator color={o.color} size="small" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {step === 'done' && (
                <View style={{ alignItems:'center', paddingVertical:24 }}>
                  <Text style={{ fontSize:48, marginBottom:12 }}>🎉</Text>
                  <Text style={{ fontSize:18, fontWeight:'900', color:C.text, marginBottom:8 }}>Invitation Logged!</Text>
                  <Text style={{ fontSize:13, color:C.muted, textAlign:'center' }}>The outcome has been saved to {name.split(' ')[0]}'s profile and their score updated.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
\n`;

fs.writeFileSync(filePath, preContent + newModal + postContent, 'utf-8');
console.log('Rewrite successful');
