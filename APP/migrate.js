const fs = require('fs');
const path = require('path');

const contactsPath = path.join(__dirname, 'src/screens/distributor/ContactsScreen.js');
const prospectsPath = path.join(__dirname, 'src/screens/distributor/ProspectsScreen.js');

let contactsCode = fs.readFileSync(contactsPath, 'utf8');
let prospectsCode = fs.readFileSync(prospectsPath, 'utf8');

// ==========================================
// 1. Modify ContactsScreen.js
// ==========================================
// Remove followups and closings state and imports
contactsCode = contactsCode.replace(/getFollowups,\\s*createFollowup,\\s*getClosings,\\s*createClosing,\\n?/, 'createFollowup,\\n  createClosing,\\n');
contactsCode = contactsCode.replace(/const \\[followups, setFollowups\\] = useState\\(\\[\\]\\);\\n/, '');
contactsCode = contactsCode.replace(/const \\[closings, setClosings\\]\\s*=\\s*useState\\(\\[\\]\\);\\n/, '');

// Remove load calls for followups/closings
contactsCode = contactsCode.replace(/const \\[c, f, cl\\] = await Promise\\.all\\(\\[getContacts\\(\\), getFollowups\\(\\), getClosings\\(\\)\\]\\);/, 'const [c] = await Promise.all([getContacts()]);');
contactsCode = contactsCode.replace(/setFollowups\\(f\\.data \\?\\? \\[\\]\\);\\n/, '');
contactsCode = contactsCode.replace(/setClosings\\(cl\\.data \\?\\? \\[\\]\\);\\n/, '');

// Remove tabs UI
contactsCode = contactsCode.replace(/{\\/\\* ── Tabs ── \\*\\/}[\\s\\S]*?<\\/View>\\s*(?={\\/\\* ── Content ── \\*\\/})/g, '');
// Remove {tab === 'contacts' && ( wrapping the list
contactsCode = contactsCode.replace(/{tab === 'contacts' && \\(\\s*<>/, '<>');
contactsCode = contactsCode.replace(/{\\/\\* ══ FOLLOW-UPS TAB ══ \\*\\/}[\\s\\S]*?(?=<View style={{ height: 40 }} \\/>)/, '');
contactsCode = contactsCode.replace(/<\\/>\\s*\\)}/, '</>'); // remove the closing of tab === 'contacts'

fs.writeFileSync(contactsPath, contactsCode, 'utf8');
console.log('ContactsScreen updated (Followups/Closings sections removed).');

// ==========================================
// 2. Modify ProspectsScreen.js
// ==========================================

// Add getFollowups, getClosings to imports
if (!prospectsCode.includes('getFollowups')) {
  prospectsCode = prospectsCode.replace(
    /getProspectInvitations, getProspectAssignments,/,
    "getProspectInvitations, getProspectAssignments,\\n  getFollowups, getClosings,"
  );
}

// Add state for followups and closings
if (!prospectsCode.includes('const [followups, setFollowups]')) {
  prospectsCode = prospectsCode.replace(
    /const \\[prospects, setProspects\\] = useState\\(\\[\\]\\);/,
    "const [prospects, setProspects] = useState([]);\\n  const [followups, setFollowups] = useState([]);\\n  const [closings, setClosings] = useState([]);"
  );
}

// Modify loadDashboard to fetch followups and closings
prospectsCode = prospectsCode.replace(
  /const res = await getProspectDashboard\\(\\);/,
  "const [res, fRes, cRes] = await Promise.all([getProspectDashboard(), getFollowups(), getClosings()]);\\n      setFollowups(fRes.data ?? []);\\n      setClosings(cRes.data ?? []);"
);

// Add "Follow-ups" and "Closings" tabs to tab bar
prospectsCode = prospectsCode.replace(
  /{ key:'list',\\s*label:'All Prospects' },/,
  "{ key:'list',      label:'All Prospects' },\\n            { key:'followups', label:'Follow-ups' },\\n            { key:'closings',  label:'Closings' },"
);
prospectsCode = prospectsCode.replace(
  /onPress={\\(\\) => t\\.key === 'list' \\? handleNavigate\\('list', {}\\) : null}/,
  "onPress={() => (t.key !== 'dashboard') ? handleNavigate(t.key, {}) : handleNavigate('dashboard')}"
);
prospectsCode = prospectsCode.replace(
  /\\} else if \\(target === 'dashboard'\\) \\{/,
  "} else if (target === 'followups' || target === 'closings') {\\n      setView(target);\\n    } else if (target === 'dashboard') {"
);

// Add Followups and Closings views
const viewsToAdd = 
"      {view === 'followups' && (\\n" +
"        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={C.accent} />}>\\n" +
"          {followups.length === 0 ? (\\n" +
"            <View style={{alignItems:'center', padding:40}}>\\n" +
"              <MessageSquare color={C.muted} size={40} />\\n" +
"              <Text style={{color:C.muted, marginTop:10}}>No follow-ups found.</Text>\\n" +
"            </View>\\n" +
"          ) : followups.map(f => {\\n" +
"            const oc = f.outcome ? C.text : C.muted;\\n" +
"            return (\\n" +
"              <View key={f.followup_id} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 10 }}>\\n" +
"                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>\\n" +
"                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center' }}>\\n" +
"                    <MessageSquare color={C.accent} size={16} />\\n" +
"                  </View>\\n" +
"                  <View style={{ flex: 1, marginLeft: 10 }}>\\n" +
"                    <Text style={{ fontWeight: '700', fontSize: 14, color: C.text }}>{f.prospect?.name ?? '—'}</Text>\\n" +
"                    <Text style={{ fontSize: 11, color: C.muted }}>{f.prospect?.phone}</Text>\\n" +
"                  </View>\\n" +
"                  {f.outcome ? (\\n" +
"                    <View style={{ backgroundColor: 'rgba(99,102,241,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>\\n" +
"                      <Text style={{ fontSize: 11, fontWeight: '700', color: C.accent }}>{f.outcome}</Text>\\n" +
"                    </View>\\n" +
"                  ) : null}\\n" +
"                </View>\\n" +
"                {f.notes ? <Text style={{ fontSize: 12, color: C.sub, lineHeight: 18 }}>{f.notes}</Text> : null}\\n" +
"              </View>\\n" +
"            );\\n" +
"          })}\\n" +
"          <View style={{ height:40 }}/>\\n" +
"        </ScrollView>\\n" +
"      )}\\n" +
"\\n" +
"      {view === 'closings' && (\\n" +
"        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={C.accent} />}>\\n" +
"          {closings.length === 0 ? (\\n" +
"            <View style={{alignItems:'center', padding:40}}>\\n" +
"              <Target color={C.muted} size={40} />\\n" +
"              <Text style={{color:C.muted, marginTop:10}}>No closings found.</Text>\\n" +
"            </View>\\n" +
"          ) : closings.map(cl => (\\n" +
"            <View key={cl.closing_id} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 10 }}>\\n" +
"              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>\\n" +
"                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' }}>\\n" +
"                  <Target color={C.green} size={16} />\\n" +
"                </View>\\n" +
"                <View style={{ flex: 1, marginLeft: 10 }}>\\n" +
"                  <Text style={{ fontWeight: '700', fontSize: 14, color: C.text }}>{cl.prospect?.name ?? '—'}</Text>\\n" +
"                </View>\\n" +
"                {cl.outcome ? (\\n" +
"                  <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>\\n" +
"                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.green }}>{cl.outcome}</Text>\\n" +
"                  </View>\\n" +
"                ) : null}\\n" +
"              </View>\\n" +
"              {cl.notes ? <Text style={{ fontSize: 12, color: C.sub, marginTop: 8 }}>{cl.notes}</Text> : null}\\n" +
"            </View>\\n" +
"          ))}\\n" +
"          <View style={{ height:40 }}/>\\n" +
"        </ScrollView>\\n" +
"      )}\\n";

prospectsCode = prospectsCode.replace(/{\\/\\* Add Prospect Modal \\*\\//, viewsToAdd + '\\n      {/* Add Prospect Modal */');

// 3. Move "Send Invitation" and "Send Presentation" to the TOP of the ProfileView

// Extract the buttons block:
const buttonsRegex = /{\\/\\* Action buttons ΓÇö row 2: Invite & Assign Presentation \\*\\/}\\s*<View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>\\s*<TouchableOpacity onPress={\\(\\) => setShowInviteModal\\(true\\)}[\\s\\S]*?<\\/View>\\s*/;
const buttonsMatch = prospectsCode.match(buttonsRegex);

if (buttonsMatch) {
  // Remove them from current location
  prospectsCode = prospectsCode.replace(buttonsRegex, '');

  const buttonsToInsert = "\\n      {/* Action buttons ΓÇö row 2: Invite & Assign Presentation (MOVED TO TOP) */}\\n" +
    "      <View style={{ flexDirection:'row', gap:8, marginBottom:14, marginTop:12 }}>\\n" +
    "        <TouchableOpacity onPress={() => setShowInviteModal(true)}\\n" +
    "          style={{ flex:1, backgroundColor:'rgba(139,92,246,0.12)', borderRadius:12, paddingVertical:10, alignItems:'center', borderWidth:1, borderColor:'rgba(139,92,246,0.3)', flexDirection:'row', justifyContent:'center', gap:6 }}>\\n" +
    "          <Users color=\\"#8B5CF6\\" size={13} />\\n" +
    "          <Text style={{ color:'#8B5CF6', fontWeight:'700', fontSize:11 }}>Send Invite</Text>\\n" +
    "        </TouchableOpacity>\\n" +
    "        <TouchableOpacity onPress={openAssignModal}\\n" +
    "          style={{ flex:1, backgroundColor:'rgba(59,130,246,0.12)', borderRadius:12, paddingVertical:10, alignItems:'center', borderWidth:1, borderColor:'rgba(59,130,246,0.3)', flexDirection:'row', justifyContent:'center', gap:6 }}>\\n" +
    "          <Zap color=\\"#3B82F6\\" size={13} />\\n" +
    "          <Text style={{ color:'#3B82F6', fontWeight:'700', fontSize:11 }}>Send Presentation</Text>\\n" +
    "        </TouchableOpacity>\\n" +
    "      </View>\\n";

  prospectsCode = prospectsCode.replace(
    /<\\/LinearGradient>\\s*(?={\\/\\* Next action \\*\\/})/,
    '</LinearGradient>' + buttonsToInsert
  );
  
}

fs.writeFileSync(prospectsPath, prospectsCode, 'utf8');
console.log('ProspectsScreen updated (Followups/Closings added to tabs, Invite/Assign moved to top of Profile).');
