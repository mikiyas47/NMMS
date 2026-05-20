const fs = require('fs');
const path = require('path');

const filePath = path.join('app', 'src', 'screens', 'distributor', 'ProspectsScreen.js');
let content = fs.readFileSync(filePath, 'utf-8');

// ------------------------------------------------------------------
// 1. Find the ProfileView return block that has the big Quick-Action
//    pills WITHOUT a header/card and replace it with the compact layout
// ------------------------------------------------------------------
const OLD_BLOCK = `  return (
    <View style={{ flex: 1 }}>
      {/* Quick Action Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {[
          { label: 'Invite', icon: <Target size={14} color="#8B5CF6"/>, action: () => setShowInviteModal(true) },
          { label: 'Move Stage', icon: <ArrowRight size={14} color="#6366F1"/>, action: () => setShowStageModal(true) },
          { label: 'Add Note', icon: <User size={14} color="#F59E0B"/>, action: () => setShowNoteModal(true) },
        ].map(btn => (
          <TouchableOpacity key={btn.label} onPress={btn.action} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: C.border }}>
            {btn.icon}
            <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: C.text }}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>`;

const NEW_BLOCK = `  return (
    <View style={{ flex: 1 }}>
      {/* ── Compact Profile Header ── */}
      <LinearGradient colors={stageColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, padding: 14, marginBottom: 12, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -20, top: -20, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{prospect.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>{prospect.name}</Text>
              {prospect.interest_score > 80 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>WATCHING</Text>
                </View>
              )}
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>{prospect.phone}</Text>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
            <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 18 }}>{prospect.interest_score ?? 0}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '800' }}>SCORE</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Next Best Action (compact inline) ── */}
      <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Zap color="#F59E0B" size={15} />
        <Text style={{ flex: 1, fontSize: 12, color: C.text, lineHeight: 16 }} numberOfLines={2}>
          {prospect.interest_score > 60
            ? \`\${prospect.name.split(' ')[0]} is highly engaged — send the Closing Script!\`
            : \`Send a presentation to \${prospect.name.split(' ')[0]} to start tracking engagement.\`}
        </Text>
        {prospect.interest_score > 60 ? (
          <TouchableOpacity onPress={() => setShowClosingModal(true)} style={{ backgroundColor: '#10B981', paddingVertical: 6, paddingHorizontal: 11, borderRadius: 9 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Close</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={openShareModal} style={{ backgroundColor: '#3B82F6', paddingVertical: 6, paddingHorizontal: 11, borderRadius: 9 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Present</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Quick Action Pills (compact) ── */}
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

// Normalize line endings for reliable matching
const normalized = content.replace(/\r\n/g, '\n');
const normalizedOld = OLD_BLOCK.replace(/\r\n/g, '\n');

if (!normalized.includes(normalizedOld)) {
  // Try to find with different spacing
  const idx = normalized.indexOf("      {/* Quick Action Pills */}\n      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>");
  if (idx === -1) {
    console.error('Could not find the target block. Searching for marker...');
    // Search for surrounding context
    const lines = normalized.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('Quick Action Pills')) console.log(`Line ${i}: ${l}`);
    });
    process.exit(1);
  }
  // Find the return statement before it
  const returnIdx = normalized.lastIndexOf('  return (\n    <View style={{ flex: 1 }}>', idx);
  if (returnIdx === -1) { console.error('Cannot find return block'); process.exit(1); }

  // Find the end of the ScrollView pills block
  const endMarker = '      </ScrollView>\n\n      {/* Tabs */}';
  const endIdx = normalized.indexOf(endMarker, idx);
  if (endIdx === -1) { console.error('Cannot find end marker'); process.exit(1); }

  const before = normalized.substring(0, returnIdx);
  const after = normalized.substring(endIdx + '      </ScrollView>'.length);
  const result = before + NEW_BLOCK + after;
  fs.writeFileSync(filePath, result, 'utf-8');
  console.log('✅ Layout patched via index-based approach');
} else {
  const result = normalized.replace(normalizedOld, NEW_BLOCK.replace(/\r\n/g, '\n'));
  fs.writeFileSync(filePath, result, 'utf-8');
  console.log('✅ Layout patched via string replace');
}
