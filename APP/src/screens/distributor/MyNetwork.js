import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users, Search, ChevronRight, UserPlus,
  TrendingUp, Star, Shield, ArrowUpRight,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const FadeIn = ({ delay = 0, children }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue:1, duration:420, delay, useNativeDriver:true }),
      Animated.timing(slide, { toValue:0, duration:420, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity:anim, transform:[{ translateY:slide }] }}>{children}</Animated.View>;
};

const AVATAR_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#3B82F6','#EC4899'];

const MyNetwork = ({ C }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const members = [
    { id:1, name:'John Doe',      email:'john@example.com',  level:'Direct', joined:'2 days ago',  status:'active',   earnings:'$145', referrals:3 },
    { id:2, name:'Jane Smith',    email:'jane@example.com',  level:'Direct', joined:'5 days ago',  status:'active',   earnings:'$210', referrals:7 },
    { id:3, name:'Mike Johnson',  email:'mike@example.com',  level:'Team',   joined:'1 week ago',  status:'active',   earnings:'$88',  referrals:2 },
    { id:4, name:'Sarah Williams',email:'sarah@example.com', level:'Team',   joined:'2 weeks ago', status:'inactive', earnings:'$0',   referrals:0 },
    { id:5, name:'Alex Carter',   email:'alex@example.com',  level:'Direct', joined:'3 weeks ago', status:'active',   earnings:'$320', referrals:5 },
  ];

  const filtered = members.filter(m => {
    const matchFilter = filter === 'all' || m.level.toLowerCase() === filter;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const tabs = [
    { key:'all',    label:'All',    count: members.length },
    { key:'direct', label:'Direct', count: members.filter(m => m.level==='Direct').length },
    { key:'team',   label:'Team',   count: members.filter(m => m.level==='Team').length },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>

      {/* ── Header banner ── */}
      <FadeIn delay={0}>
        <LinearGradient
          colors={['#064E3B','#065F46','#10B981']}
          start={{ x:0, y:0 }} end={{ x:1, y:1 }}
          style={{ borderRadius:24, padding:20, marginBottom:18, overflow:'hidden' }}
        >
          <View style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,255,255,0.06)' }} />
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View>
              <Text style={{ color:'rgba(255,255,255,0.65)', fontSize:12, fontWeight:'600', letterSpacing:1 }}>YOUR NETWORK</Text>
              <Text style={{ color:'#fff', fontSize:22, fontWeight:'800', marginTop:2 }}>My Team</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor:'rgba(255,255,255,0.18)', borderRadius:14, paddingHorizontal:14, paddingVertical:9, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.25)' }}
            >
              <UserPlus color="#fff" size={15} />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:13, marginLeft:6 }}>Invite</Text>
            </TouchableOpacity>
          </View>

          {/* Mini stats row */}
          <View style={{ flexDirection:'row', marginTop:16, gap:10 }}>
            {[
              { label:'Direct', value:'8', icon:ArrowUpRight },
              { label:'Total Team', value:'42', icon:Users },
              { label:'Active', value:'38', icon:TrendingUp },
            ].map((s, i) => (
              <View key={i} style={{ flex:1, backgroundColor:'rgba(255,255,255,0.12)', borderRadius:12, padding:10, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'900', fontSize:18 }}>{s.value}</Text>
                <Text style={{ color:'rgba(255,255,255,0.65)', fontSize:10, marginTop:3 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── Search ── */}
      <FadeIn delay={80}>
        <View style={{ flexDirection:'row', alignItems:'center', backgroundColor:C.inputBg, borderWidth:1, borderColor:C.border, borderRadius:14, paddingHorizontal:14, height:46, marginBottom:14 }}>
          <Search color={C.muted} size={16} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search members..."
            placeholderTextColor={C.muted}
            style={{ flex:1, marginLeft:10, color:C.text, fontSize:14 }}
          />
        </View>
      </FadeIn>

      {/* ── Filter tabs ── */}
      <FadeIn delay={120}>
        <View style={{ flexDirection:'row', backgroundColor:C.inputBg, borderRadius:14, padding:4, marginBottom:16 }}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setFilter(t.key)}
              style={{
                flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center',
                paddingVertical:9, borderRadius:11, gap:6,
                backgroundColor: filter===t.key ? C.accent : 'transparent',
              }}
            >
              <Text style={{ fontSize:12, fontWeight:'700', color: filter===t.key ? '#fff' : C.muted }}>{t.label}</Text>
              <View style={{ backgroundColor: filter===t.key ? 'rgba(255,255,255,0.25)' : C.card, borderRadius:10, paddingHorizontal:6, paddingVertical:1 }}>
                <Text style={{ fontSize:10, fontWeight:'800', color: filter===t.key ? '#fff' : C.muted }}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </FadeIn>

      {/* ── Member cards ── */}
      <FadeIn delay={180}>
        {filtered.map((member, i) => {
          const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const isActive = member.status === 'active';
          return (
            <TouchableOpacity
              key={member.id}
              activeOpacity={0.8}
              style={{
                backgroundColor:C.surface, borderRadius:20,
                borderWidth:1, borderColor:C.border,
                padding:16, marginBottom:10,
                flexDirection:'row', alignItems:'center',
              }}
            >
              {/* Avatar */}
              <View style={{ position:'relative' }}>
                <LinearGradient
                  colors={[avatarColor, avatarColor+'BB']}
                  style={{ width:48, height:48, borderRadius:24, alignItems:'center', justifyContent:'center' }}
                >
                  <Text style={{ color:'#fff', fontWeight:'800', fontSize:18 }}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                {/* Online dot */}
                <View style={{
                  position:'absolute', bottom:0, right:0,
                  width:13, height:13, borderRadius:7,
                  backgroundColor: isActive ? '#10B981' : '#6B7280',
                  borderWidth:2, borderColor:C.surface,
                }} />
              </View>

              {/* Info */}
              <View style={{ flex:1, marginLeft:14 }}>
                <Text style={{ fontSize:15, fontWeight:'700', color:C.text }}>{member.name}</Text>
                <Text style={{ fontSize:11, color:C.muted, marginTop:1 }}>{member.email}</Text>
                <View style={{ flexDirection:'row', gap:10, marginTop:6 }}>
                  <View style={{ backgroundColor:C.card, borderRadius:8, paddingHorizontal:8, paddingVertical:3 }}>
                    <Text style={{ fontSize:10, fontWeight:'700', color:C.muted }}>{member.level}</Text>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center' }}>
                    <Users color={C.muted} size={10} />
                    <Text style={{ fontSize:10, color:C.muted, marginLeft:3 }}>{member.referrals} refs</Text>
                  </View>
                </View>
              </View>

              {/* Right */}
              <View style={{ alignItems:'flex-end' }}>
                <Text style={{ fontSize:14, fontWeight:'800', color:C.green }}>{member.earnings}</Text>
                <Text style={{ fontSize:10, color:C.muted, marginTop:2 }}>{member.joined}</Text>
                <ChevronRight color={C.border} size={16} style={{ marginTop:4 }} />
              </View>
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <View style={{ alignItems:'center', paddingTop:50, paddingBottom:30 }}>
            <Users color={C.muted} size={44} />
            <Text style={{ fontSize:16, fontWeight:'700', color:C.text, marginTop:12 }}>No members found</Text>
            <Text style={{ fontSize:13, color:C.muted, marginTop:6 }}>Try a different search or filter</Text>
          </View>
        )}
      </FadeIn>
    </ScrollView>
  );
};

export default MyNetwork;
