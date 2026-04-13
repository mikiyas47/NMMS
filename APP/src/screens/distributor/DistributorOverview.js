import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users, DollarSign, Target, Star, ArrowUpRight,
  Zap, Gift, TrendingUp, ChevronRight,
  Award, Bell, BarChart2,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

// Fade-in wrapper
const FadeIn = ({ delay = 0, children }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
};

const DistributorOverview = ({ C }) => {
  const stats = [
    { label: 'Direct', value: '8', sub: '+3 this wk', icon: Users, grad: ['#6366F1','#818CF8'], glow: '#6366F1' },
    { label: 'Team', value: '42', sub: '+12 this mo', icon: Users, grad: ['#10B981','#34D399'], glow: '#10B981' },
    { label: 'Earned', value: '$2,450', sub: '+$320 wk', icon: DollarSign, grad: ['#F59E0B','#FCD34D'], glow: '#F59E0B' },
    { label: 'Rank', value: 'Silver', sub: 'Next: Gold', icon: Star, grad: ['#8B5CF6','#A78BFA'], glow: '#8B5CF6' },
  ];

  const quickActions = [
    { label: 'Invite', icon: Users, grad: ['#6366F1','#8B5CF6'] },
    { label: 'Earnings', icon: DollarSign, grad: ['#10B981','#059669'] },
    { label: 'Goals', icon: Target, grad: ['#F59E0B','#EF4444'] },
    { label: 'Alerts', icon: Bell, grad: ['#3B82F6','#6366F1'] },
  ];

  const activity = [
    { id: 1, text: 'New referral: John Doe', sub: '2 hours ago', color: '#10B981', icon: Users },
    { id: 2, text: 'Commission: $45 credited', sub: '5 hours ago', color: '#F59E0B', icon: DollarSign },
    { id: 3, text: 'Milestone: 40 team members!', sub: '1 day ago', color: '#6366F1', icon: Award },
    { id: 4, text: 'New referral: Jane Smith', sub: '2 days ago', color: '#10B981', icon: Users },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

      {/* ── Hero Banner ── */}
      <FadeIn delay={0}>
        <LinearGradient
          colors={['#4338CA', '#7C3AED', '#6366F1']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 22, marginBottom: 18, overflow: 'hidden' }}
        >
          {/* Decorative circles */}
          <View style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,255,255,0.07)' }} />
          <View style={{ position:'absolute', right:40, bottom:-20, width:80, height:80, borderRadius:40, backgroundColor:'rgba(255,255,255,0.05)' }} />

          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <View>
              <Text style={{ color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:'600', letterSpacing:0.5 }}>WELCOME BACK</Text>
              <Text style={{ color:'#fff', fontSize:24, fontWeight:'800', marginTop:2 }}>Good day! 👋</Text>
            </View>
            <View style={{ backgroundColor:'rgba(255,255,255,0.18)', borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:'rgba(255,255,255,0.25)' }}>
              <Text style={{ color:'#FCD34D', fontSize:11, fontWeight:'800', letterSpacing:0.5 }}>⭐ SILVER</Text>
            </View>
          </View>

          {/* Progress to Gold */}
          <View style={{ backgroundColor:'rgba(255,255,255,0.12)', borderRadius:14, padding:12 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
              <Text style={{ color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:'600' }}>Progress to Gold</Text>
              <Text style={{ color:'#FCD34D', fontSize:12, fontWeight:'800' }}>8 / 15 referrals</Text>
            </View>
            <View style={{ height:6, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:3 }}>
              <View style={{ height:6, width:'53%', backgroundColor:'#FCD34D', borderRadius:3 }} />
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', marginTop:8 }}>
              <TrendingUp color="#86EFAC" size={13} />
              <Text style={{ color:'rgba(255,255,255,0.75)', fontSize:12, marginLeft:6 }}>Top 30% of distributors this month</Text>
            </View>
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── Stats Grid ── */}
      <FadeIn delay={80}>
        <Text style={{ fontSize:13, fontWeight:'700', color:C.muted, letterSpacing:1, marginBottom:10 }}>PERFORMANCE</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:20 }}>
          {stats.map((s, i) => (
            <View
              key={i}
              style={{
                width: CARD_W, borderRadius:20,
                backgroundColor: C.surface,
                borderWidth:1, borderColor:C.border,
                padding:16, overflow:'hidden',
              }}
            >
              {/* Glow accent */}
              <View style={{ position:'absolute', top:-18, right:-18, width:64, height:64, borderRadius:32, backgroundColor:s.glow+'22' }} />
              <LinearGradient colors={s.grad} style={{ width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                <s.icon color="#fff" size={18} />
              </LinearGradient>
              <Text style={{ fontSize:22, fontWeight:'800', color:C.text }}>{s.value}</Text>
              <Text style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.label}</Text>
              <View style={{ flexDirection:'row', alignItems:'center', marginTop:6 }}>
                <ArrowUpRight color={s.glow} size={11} />
                <Text style={{ fontSize:10, color:s.glow, fontWeight:'700', marginLeft:3 }}>{s.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </FadeIn>

      {/* ── Quick Actions ── */}
      <FadeIn delay={160}>
        <Text style={{ fontSize:13, fontWeight:'700', color:C.muted, letterSpacing:1, marginBottom:10 }}>QUICK ACTIONS</Text>
        <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:20 }}>
          {quickActions.map((a, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.75}
              style={{ alignItems:'center', flex:1 }}
            >
              <LinearGradient
                colors={a.grad}
                style={{ width:52, height:52, borderRadius:16, alignItems:'center', justifyContent:'center', marginBottom:8 }}
              >
                <a.icon color="#fff" size={22} />
              </LinearGradient>
              <Text style={{ fontSize:11, fontWeight:'700', color:C.text }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </FadeIn>

      {/* ── Streak Banner ── */}
      <FadeIn delay={220}>
        <LinearGradient
          colors={['rgba(245,158,11,0.15)','rgba(239,68,68,0.10)']}
          start={{ x:0, y:0 }} end={{ x:1, y:0 }}
          style={{ borderRadius:18, padding:16, marginBottom:20, borderWidth:1, borderColor:'rgba(245,158,11,0.25)' }}
        >
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <Zap color="#F59E0B" size={20} />
            <View style={{ flex:1, marginLeft:12 }}>
              <Text style={{ color:C.text, fontWeight:'800', fontSize:14 }}>7-day Active Streak 🔥</Text>
              <Text style={{ color:C.muted, fontSize:12, marginTop:2 }}>Keep it up to unlock a $50 bonus!</Text>
            </View>
            <View style={{ backgroundColor:'rgba(245,158,11,0.2)', borderRadius:12, paddingHorizontal:10, paddingVertical:4 }}>
              <Text style={{ color:'#F59E0B', fontSize:12, fontWeight:'800' }}>7 days</Text>
            </View>
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── Recent Activity ── */}
      <FadeIn delay={280}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <Text style={{ fontSize:13, fontWeight:'700', color:C.muted, letterSpacing:1 }}>RECENT ACTIVITY</Text>
          <TouchableOpacity style={{ flexDirection:'row', alignItems:'center' }}>
            <Text style={{ fontSize:12, color:C.accent, fontWeight:'700' }}>See all</Text>
            <ChevronRight color={C.accent} size={14} />
          </TouchableOpacity>
        </View>
        <View style={{ backgroundColor:C.surface, borderRadius:20, borderWidth:1, borderColor:C.border, overflow:'hidden' }}>
          {activity.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              style={{
                flexDirection:'row', alignItems:'center',
                paddingHorizontal:16, paddingVertical:14,
                borderBottomWidth: i < activity.length - 1 ? 1 : 0,
                borderBottomColor:C.border,
              }}
            >
              <View style={{ width:36, height:36, borderRadius:12, backgroundColor:item.color+'22', alignItems:'center', justifyContent:'center' }}>
                <item.icon color={item.color} size={16} />
              </View>
              <View style={{ flex:1, marginLeft:12 }}>
                <Text style={{ fontSize:13, fontWeight:'600', color:C.text }}>{item.text}</Text>
                <Text style={{ fontSize:11, color:C.muted, marginTop:2 }}>{item.sub}</Text>
              </View>
              <ChevronRight color={C.border} size={16} />
            </TouchableOpacity>
          ))}
        </View>
      </FadeIn>
    </ScrollView>
  );
};

export default DistributorOverview;
