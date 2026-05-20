const fs = require('fs');
const filePath = 'app/src/screens/distributor/ProspectsScreen.js';
let content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');

// ─────────────────────────────────────────────────────────────────
// 1. Add getProspectWatchingStatus to imports
// ─────────────────────────────────────────────────────────────────
const OLD_IMPORT = `  getFollowups, getClosings, initEcho,`;
const NEW_IMPORT = `  getFollowups, getClosings, initEcho, getProspectWatchingStatus,`;

if (content.includes(OLD_IMPORT)) {
  content = content.replace(OLD_IMPORT, NEW_IMPORT);
  console.log('✅ Added getProspectWatchingStatus to imports');
} else {
  // Try alternative (might already have been added)
  if (content.includes('getProspectWatchingStatus')) {
    console.log('ℹ️  getProspectWatchingStatus already in imports');
  } else {
    console.warn('⚠️  Could not find import block');
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. Replace broken Echo useEffect with polling-based useEffect
//    Target: the useEffect that uses initEcho in ProfileView
// ─────────────────────────────────────────────────────────────────
const OLD_ECHO_EFFECT = `  // ── Real-time "Watching Now" via Echo ──────────────────────────
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

const NEW_POLL_EFFECT = `  // ── Poll watching status every 5s (DB-backed, works without WebSockets) ──
  const [recentlyClosed, setRecentlyClosed] = useState(false);

  useEffect(() => {
    if (!prospect?.prospect_id) return;
    let mounted = true;
    let pollTimer = null;

    const checkWatching = async () => {
      try {
        const res = await getProspectWatchingStatus(prospect.prospect_id);
        if (!mounted) return;

        const wasWatching = isWatching;
        const nowWatching = res.is_watching === true;
        const nowClosed   = res.recently_closed === true;

        setIsWatching(nowWatching);
        setRecentlyClosed(nowClosed && !nowWatching);

        if (nowWatching && !wasWatching) {
          // Started watching — start pulse
          Animated.loop(
            Animated.sequence([
              Animated.timing(watchPulse, { toValue: 1.25, duration: 700, useNativeDriver: true }),
              Animated.timing(watchPulse, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
            ])
          ).start();
        } else if (!nowWatching && wasWatching) {
          // Stopped watching — stop pulse
          watchPulse.stopAnimation();
          watchPulse.setValue(1);
        }
      } catch (_) {}
    };

    // Poll immediately then every 5 seconds
    checkWatching();
    pollTimer = setInterval(checkWatching, 5000);

    return () => {
      mounted = false;
      clearInterval(pollTimer);
      watchPulse.stopAnimation();
    };
  }, [prospect?.prospect_id]);`;

if (content.includes(OLD_ECHO_EFFECT)) {
  content = content.replace(OLD_ECHO_EFFECT, NEW_POLL_EFFECT);
  console.log('✅ Replaced Echo listener with polling');
} else {
  console.warn('⚠️  Echo useEffect not found — checking if already replaced...');
  if (content.includes('checkWatching')) {
    console.log('ℹ️  Polling already in place');
  }
}

// ─────────────────────────────────────────────────────────────────
// 3. Replace the WATCHING badge in the profile header with a
//    dual-state badge (WATCHING NOW green / JUST CLOSED red)
// ─────────────────────────────────────────────────────────────────
const OLD_BADGE = `              {isWatching && (
                <Animated.View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.3)', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8, transform: [{ scale: watchPulse }] }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>WATCHING NOW</Text>
                </Animated.View>
              )}`;

const NEW_BADGE = `              {isWatching ? (
                <Animated.View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.35)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, transform: [{ scale: watchPulse }], borderWidth: 1, borderColor: 'rgba(16,185,129,0.6)' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 5 }} />
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>WATCHING NOW</Text>
                </Animated.View>
              ) : recentlyClosed ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.3)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 5 }} />
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>CLOSED VIDEO</Text>
                </View>
              ) : null}`;

if (content.includes(OLD_BADGE)) {
  content = content.replace(OLD_BADGE, NEW_BADGE);
  console.log('✅ Replaced badge with dual-state WATCHING/CLOSED');
} else {
  console.warn('⚠️  Badge block not found exactly — trying substring search');
  const idx = content.indexOf('WATCHING NOW');
  console.log('WATCHING NOW at char index:', idx);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ All frontend changes saved!');
