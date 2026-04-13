import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Target, Star, Trophy, CheckCircle2,
  Flame, Lock, Gift, Zap,
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

// Animated progress bar
const ProgressBar = ({ pct, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(anim, { toValue:pct, duration:800, delay:300, useNativeDriver:false }).start(); }, []);
  return (
    <View style={{ height:8, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden' }}>
      <Animated.View style={{
        height:8, borderRadius:4,
        backgroundColor:color,
        width:anim.interpolate({ inputRange:[0,100], outputRange:['0%','100%'] }),
        shadowColor:color, shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:6,
      }} />
    </View>
  );
};

const GoalsScreen = ({ C }) => {
  const goals = [
    { id:1, title:'Reach Gold Rank', desc:'Get 15 direct referrals', current:8, target:15, reward:'$500 Bonus', icon:Star, grad:['#F59E0B','#EF4444'] },
    { id:2, title:'Team Size: 50', desc:'Grow your team to 50 members', current:42, target:50, reward:'$1,000 Bonus', icon:Target, grad:['#10B981','#059669'] },
    { id:3, title:'Monthly $3,000', desc:'Earn $3,000 in one month', current:2450, target:3000, reward:'Platinum Status', icon:Trophy, grad:['#8B5CF6','#EC4899'] },
  ];

  const achievements = [
    { id:1, title:'First Referral', date:'Nov 15, 2024', done:true, icon:Star, color:'#F59E0B' },
    { id:2, title:'5 Direct Referrals', date:'Dec 1, 2024', done:true, icon:Users2, color:'#10B981' },
    { id:3, title:'10 Team Members', date:'Dec 10, 2024', done:true, icon:Trophy, color:'#3B82F6' },
    { id:4, title:'Silver Rank', date:'Dec 20, 2024', done:true, icon:Zap, color:'#8B5CF6' },
    { id:5, title:'50 Team Members', date:'Locked', done:false, icon:Lock, color:'#6B7280' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>

      {/* ── Header banner ── */}
      <FadeIn delay={0}>
        <LinearGradient
          colors={['#1E1B4B','#312E81','#4338CA']}
          start={{ x:0, y:0 }} end={{ x:1, y:1 }}
          style={{ borderRadius:24, padding:22, marginBottom:18, overflow:'hidden' }}
        >
          <View style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,255,255,0.05)' }} />
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <View style={{ width:44, height:44, borderRadius:14, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center', marginRight:14 }}>
              <Flame color="#FCD34D" size={22} />
            </View>
            <View>
              <Text style={{ color:'rgba(255,255,255,0.65)', fontSize:12, fontWeight:'600', letterSpacing:1 }}>YOU'RE ON FIRE</Text>
              <Text style={{ color:'#fff', fontSize:20, fontWeight:'800', marginTop:2 }}>Goals & Milestones</Text>
            </View>
          </View>
          <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:13, marginTop:12 }}>
            Complete goals to unlock bonuses and climb ranks 🏆
          </Text>
        </LinearGradient>
      </FadeIn>

      {/* ── Active goals ── */}
      <FadeIn delay={80}>
        <Text style={{ fontSize:13, fontWeight:'700', color:C.muted, letterSpacing:1, marginBottom:12 }}>ACTIVE GOALS</Text>
        {goals.map((g, index) => {
          const pct = Math.min((g.current / g.target) * 100, 100);
          return (
            <View
              key={g.id}
              style={{ backgroundColor:C.surface, borderRadius:22, borderWidth:1, borderColor:C.border, marginBottom:12, overflow:'hidden' }}
            >
              {/* Color top stripe */}
              <LinearGradient
                colors={[...g.grad, 'transparent']}
                start={{ x:0, y:0 }} end={{ x:1, y:0 }}
                style={{ height:3 }}
              />
              <View style={{ padding:18 }}>
                <View style={{ flexDirection:'row', alignItems:'center', marginBottom:14 }}>
                  <LinearGradient colors={g.grad} style={{ width:44, height:44, borderRadius:14, alignItems:'center', justifyContent:'center', marginRight:14 }}>
                    <g.icon color="#fff" size={20} />
                  </LinearGradient>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:15, fontWeight:'800', color:C.text }}>{g.title}</Text>
                    <Text style={{ fontSize:12, color:C.muted, marginTop:2 }}>{g.desc}</Text>
                  </View>
                  <View style={{ backgroundColor:g.grad[0]+'22', paddingHorizontal:10, paddingVertical:5, borderRadius:12 }}>
                    <Text style={{ fontSize:13, fontWeight:'900', color:g.grad[0] }}>{pct.toFixed(0)}%</Text>
                  </View>
                </View>

                <ProgressBar pct={pct} color={g.grad[0]} />

                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
                  <Text style={{ fontSize:13, color:C.muted }}>
                    <Text style={{ fontWeight:'800', color:C.text }}>{g.current}</Text> / {g.target}
                  </Text>
                  <View style={{ flexDirection:'row', alignItems:'center', backgroundColor:'rgba(16,185,129,0.12)', paddingHorizontal:10, paddingVertical:5, borderRadius:10 }}>
                    <Gift color="#10B981" size={12} />
                    <Text style={{ fontSize:11, color:'#10B981', fontWeight:'700', marginLeft:5 }}>{g.reward}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </FadeIn>

      {/* ── Achievements ── */}
      <FadeIn delay={200}>
        <Text style={{ fontSize:13, fontWeight:'700', color:C.muted, letterSpacing:1, marginBottom:12 }}>ACHIEVEMENTS</Text>
        <View style={{ backgroundColor:C.surface, borderRadius:22, borderWidth:1, borderColor:C.border, overflow:'hidden' }}>
          {achievements.map((a, i) => (
            <View
              key={a.id}
              style={{
                flexDirection:'row', alignItems:'center',
                paddingHorizontal:16, paddingVertical:14,
                borderBottomWidth: i < achievements.length-1 ? 1 : 0,
                borderBottomColor:C.border,
                opacity: a.done ? 1 : 0.5,
              }}
            >
              <View style={{
                width:38, height:38, borderRadius:12,
                backgroundColor: a.done ? a.color+'22' : C.card,
                alignItems:'center', justifyContent:'center',
              }}>
                {a.done
                  ? <CheckCircle2 color={a.color} size={18} />
                  : <Lock color={C.muted} size={16} />}
              </View>
              <View style={{ flex:1, marginLeft:12 }}>
                <Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{a.title}</Text>
                <Text style={{ fontSize:11, color:C.muted, marginTop:2 }}>{a.date}</Text>
              </View>
              {a.done && (
                <View style={{ backgroundColor:a.color+'22', paddingHorizontal:8, paddingVertical:4, borderRadius:8 }}>
                  <Text style={{ fontSize:10, fontWeight:'800', color:a.color }}>DONE</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </FadeIn>
    </ScrollView>
  );
};

// placeholder to satisfy import inside FadeIn for Users2
const Users2 = Target;

export default GoalsScreen;
