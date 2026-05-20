const fs = require('fs');
const filePath = 'app/src/screens/distributor/ProspectsScreen.js';
let content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');

// ─────────────────────────────────────────────────────────────────
// 1. ADD isWatching state + Echo listener to ProfileView
//    Replace the useState block at the top of ProfileView
// ─────────────────────────────────────────────────────────────────
const OLD_STATE = `const ProfileView = ({ prospect, onBack, onUpdate, autoOpen, C }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showStageModal, setShowStageModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saving, setSaving] = useState(false);`;

const NEW_STATE = `const ProfileView = ({ prospect, onBack, onUpdate, autoOpen, C }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showStageModal, setShowStageModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const watchPulse = useRef(new Animated.Value(1)).current;

  // ── Real-time "Watching Now" via Echo ──────────────────────────
  useEffect(() => {
    if (!prospect?.prospect_id) return;
    let channel = null;
    const setupEcho = async () => {
      try {
        const echo = await initEcho();
        if (!echo) return;
        channel = echo.channel(\`prospect.\${prospect.prospect_id}\`);
        channel.listen('.video.opened', () => {
          setIsWatching(true);
          // Pulse animation
          Animated.loop(
            Animated.sequence([
              Animated.timing(watchPulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
              Animated.timing(watchPulse, { toValue: 1.0, duration: 600, useNativeDriver: true }),
            ])
          ).start();
        });
        channel.listen('.video.closed', () => {
          setIsWatching(false);
          watchPulse.stopAnimation();
          watchPulse.setValue(1);
        });
      } catch (e) {}
    };
    setupEcho();
    return () => {
      if (channel) { try { channel.stopListening('.video.opened'); channel.stopListening('.video.closed'); } catch {} }
      watchPulse.stopAnimation();
    };
  }, [prospect?.prospect_id]);`;

if (content.includes(OLD_STATE)) {
  content = content.replace(OLD_STATE, NEW_STATE);
  console.log('✅ Added isWatching state + Echo listener');
} else {
  console.warn('⚠️  Could not find state block to patch');
}

// ─────────────────────────────────────────────────────────────────
// 2. Replace the fake WATCHING badge (interest_score > 80) with
//    the real isWatching badge + animated pulse dot
// ─────────────────────────────────────────────────────────────────
const OLD_BADGE = `              {prospect.interest_score > 80 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>WATCHING</Text>
                </View>
              )}`;

const NEW_BADGE = `              {isWatching && (
                <Animated.View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.3)', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8, transform: [{ scale: watchPulse }] }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>WATCHING NOW</Text>
                </Animated.View>
              )}`;

if (content.includes(OLD_BADGE)) {
  content = content.replace(OLD_BADGE, NEW_BADGE);
  console.log('✅ Replaced fake WATCHING badge with real isWatching');
} else {
  console.warn('⚠️  Could not find WATCHING badge to replace');
}

// ─────────────────────────────────────────────────────────────────
// 3. Replace horizontal ScrollView pills with a proper 2x2 button grid
// ─────────────────────────────────────────────────────────────────
const OLD_PILLS = `      {/* ── Quick Action Pills (compact) ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {[
          { label: 'Invite',     icon: <Target size={12} color="#8B5CF6"/>,       action: () => setShowInviteModal(true)   },
          { label: 'Move Stage', icon: <ArrowRight size={12} color="#6366F1"/>,   action: () => setShowStageModal(true)    },
          { label: 'Note',       icon: <User size={12} color="#F59E0B"/>,          action: () => setShowNoteModal(true)     },
          { label: 'Follow-up',  icon: <MessageSquare size={12} color="#10B981"/>, action: () => setShowFollowupModal(true) },
        ].map(btn => (
          <TouchableOpacity key={btn.label} onPress={btn.action}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: C.border }}>
            {btn.icon}
            <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: '700', color: C.text }}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>`;

const NEW_BUTTONS = `      {/* ── Action Buttons (2×2 grid) ── */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Invite',      icon: <Target size={13} color="#fff"/>,       bg: '#8B5CF6', action: () => setShowInviteModal(true)   },
          { label: 'Move Stage',  icon: <ArrowRight size={13} color="#fff"/>,   bg: '#6366F1', action: () => setShowStageModal(true)    },
          { label: 'Add Note',    icon: <User size={13} color="#fff"/>,          bg: '#F59E0B', action: () => setShowNoteModal(true)     },
          { label: 'Follow-up',   icon: <MessageSquare size={13} color="#fff"/>, bg: '#10B981', action: () => setShowFollowupModal(true) },
        ].map(btn => (
          <TouchableOpacity key={btn.label} onPress={btn.action}
            style={{ flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              backgroundColor: btn.bg, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 11, gap: 6 }}>
            {btn.icon}
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>`;

if (content.includes(OLD_PILLS)) {
  content = content.replace(OLD_PILLS, NEW_BUTTONS);
  console.log('✅ Replaced horizontal pills with 2×2 button grid');
} else {
  console.warn('⚠️  Could not find pills block to replace');
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ All done!');
