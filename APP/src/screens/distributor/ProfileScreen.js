import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User, Mail, Phone, MapPin, Calendar,
  Edit, ChevronRight, Shield, Star, Award,
  Bell, Lock, HelpCircle, LogOut,
} from 'lucide-react-native';

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

const ProfileScreen = ({ C }) => {
  const info = [
    { icon:User,     label:'Full Name',     value:'Miki Prospect' },
    { icon:Mail,     label:'Email',         value:'miki@gmail.com' },
    { icon:Phone,    label:'Phone',         value:'0912345678' },
    { icon:Calendar, label:'Member Since',  value:'December 2024' },
    { icon:MapPin,   label:'Location',      value:'Addis Ababa, Ethiopia' },
  ];

  const settingsGroups = [
    {
      title:'Account',
      items:[
        { label:'Change Password', icon:Lock,      color:'#6366F1' },
        { label:'Notifications',   icon:Bell,      color:'#F59E0B' },
        { label:'Privacy Settings',icon:Shield,    color:'#10B981' },
      ],
    },
    {
      title:'Support',
      items:[
        { label:'Help & Support',  icon:HelpCircle, color:'#3B82F6' },
      ],
    },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>

      {/* ── Profile hero ── */}
      <FadeIn delay={0}>
        <LinearGradient
          colors={['#1E1B4B','#3730A3','#4F46E5']}
          start={{ x:0, y:0 }} end={{ x:1, y:1 }}
          style={{ borderRadius:26, padding:24, marginBottom:18, alignItems:'center', overflow:'hidden' }}
        >
          {/* Background circles */}
          <View style={{ position:'absolute', right:-40, top:-40, width:140, height:140, borderRadius:70, backgroundColor:'rgba(255,255,255,0.05)' }} />
          <View style={{ position:'absolute', left:-30, bottom:-30, width:100, height:100, borderRadius:50, backgroundColor:'rgba(255,255,255,0.05)' }} />

          {/* Avatar */}
          <View style={{ width:84, height:84, borderRadius:42, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center', marginBottom:14, borderWidth:3, borderColor:'rgba(255,255,255,0.35)' }}>
            <User color="#fff" size={40} />
          </View>

          <Text style={{ color:'#fff', fontSize:22, fontWeight:'800' }}>Miki Prospect</Text>
          <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:13, marginTop:4 }}>Distributor · Addis Ababa</Text>

          <View style={{ flexDirection:'row', gap:8, marginTop:14 }}>
            <View style={{ backgroundColor:'rgba(245,158,11,0.25)', borderRadius:20, paddingHorizontal:14, paddingVertical:6, borderWidth:1, borderColor:'rgba(245,158,11,0.4)' }}>
              <Text style={{ color:'#FCD34D', fontSize:12, fontWeight:'800' }}>⭐ SILVER</Text>
            </View>
            <View style={{ backgroundColor:'rgba(16,185,129,0.25)', borderRadius:20, paddingHorizontal:14, paddingVertical:6, borderWidth:1, borderColor:'rgba(16,185,129,0.4)' }}>
              <Text style={{ color:'#6EE7B7', fontSize:12, fontWeight:'800' }}>✦ ACTIVE</Text>
            </View>
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── Stats ── */}
      <FadeIn delay={80}>
        <View style={{ flexDirection:'row', gap:10, marginBottom:20 }}>
          {[
            { label:'Referrals', value:'8',    icon:Award, color:'#6366F1', bg:'rgba(99,102,241,0.12)' },
            { label:'Team',      value:'42',   icon:User,  color:'#10B981', bg:'rgba(16,185,129,0.12)' },
            { label:'Earned',    value:'$2.4k',icon:Star,  color:'#F59E0B', bg:'rgba(245,158,11,0.12)' },
          ].map((s, i) => (
            <View key={i} style={{ flex:1, backgroundColor:C.surface, borderRadius:18, borderWidth:1, borderColor:C.border, padding:14, alignItems:'center' }}>
              <View style={{ width:36, height:36, borderRadius:10, backgroundColor:s.bg, alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <s.icon color={s.color} size={16} />
              </View>
              <Text style={{ fontSize:16, fontWeight:'800', color:C.text }}>{s.value}</Text>
              <Text style={{ fontSize:10, color:C.muted, marginTop:3 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </FadeIn>

      {/* ── Edit button ── */}
      <FadeIn delay={120}>
        <TouchableOpacity activeOpacity={0.85} style={{ marginBottom:20 }}>
          <LinearGradient
            colors={['#6366F1','#8B5CF6']}
            start={{ x:0, y:0 }} end={{ x:1, y:0 }}
            style={{ borderRadius:16, height:50, flexDirection:'row', alignItems:'center', justifyContent:'center' }}
          >
            <Edit color="#fff" size={17} />
            <Text style={{ color:'#fff', fontWeight:'800', fontSize:15, marginLeft:8 }}>Edit Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </FadeIn>

      {/* ── Profile info list ── */}
      <FadeIn delay={160}>
        <Text style={{ fontSize:13, fontWeight:'700', color:C.muted, letterSpacing:1, marginBottom:10 }}>PROFILE INFO</Text>
        <View style={{ backgroundColor:C.surface, borderRadius:20, borderWidth:1, borderColor:C.border, overflow:'hidden', marginBottom:20 }}>
          {info.map((row, i) => (
            <View
              key={i}
              style={{
                flexDirection:'row', alignItems:'center',
                paddingHorizontal:16, paddingVertical:14,
                borderBottomWidth: i < info.length-1 ? 1 : 0,
                borderBottomColor:C.border,
              }}
            >
              <View style={{ width:36, height:36, borderRadius:10, backgroundColor:C.card, alignItems:'center', justifyContent:'center', marginRight:14 }}>
                <row.icon color={C.muted} size={15} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:11, color:C.muted, fontWeight:'600' }}>{row.label}</Text>
                <Text style={{ fontSize:14, fontWeight:'700', color:C.text, marginTop:2 }}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </FadeIn>

      {/* ── Settings groups ── */}
      <FadeIn delay={220}>
        {settingsGroups.map((group, gi) => (
          <View key={gi} style={{ marginBottom:16 }}>
            <Text style={{ fontSize:13, fontWeight:'700', color:C.muted, letterSpacing:1, marginBottom:10 }}>
              {group.title.toUpperCase()}
            </Text>
            <View style={{ backgroundColor:C.surface, borderRadius:20, borderWidth:1, borderColor:C.border, overflow:'hidden' }}>
              {group.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  activeOpacity={0.75}
                  style={{
                    flexDirection:'row', alignItems:'center',
                    paddingHorizontal:16, paddingVertical:14,
                    borderBottomWidth: ii < group.items.length-1 ? 1 : 0,
                    borderBottomColor:C.border,
                  }}
                >
                  <View style={{ width:36, height:36, borderRadius:10, backgroundColor:item.color+'18', alignItems:'center', justifyContent:'center', marginRight:14 }}>
                    <item.icon color={item.color} size={16} />
                  </View>
                  <Text style={{ flex:1, fontSize:14, fontWeight:'600', color:C.text }}>{item.label}</Text>
                  <ChevronRight color={C.border} size={16} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </FadeIn>
    </ScrollView>
  );
};

export default ProfileScreen;
