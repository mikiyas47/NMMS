import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DollarSign, TrendingUp, Wallet, CreditCard,
  ArrowUpRight, ArrowDownRight, ChevronRight, BarChart2, Clock,
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

const EarningsScreen = ({ C }) => {
  const cards = [
    { label:'Total Earned', value:'$2,450', icon:DollarSign, grad:['#10B981','#059669'], bg:'rgba(16,185,129,0.12)' },
    { label:'This Week', value:'$320', icon:TrendingUp, grad:['#3B82F6','#6366F1'], bg:'rgba(59,130,246,0.12)' },
    { label:'Pending', value:'$150', icon:Clock, grad:['#F59E0B','#EF4444'], bg:'rgba(245,158,11,0.12)' },
    { label:'Withdrawn', value:'$1,980', icon:CreditCard, grad:['#8B5CF6','#EC4899'], bg:'rgba(139,92,246,0.12)' },
  ];

  const transactions = [
    { id:1, type:'Commission', desc:'Direct referral bonus', amount:'+$45', date:'Today, 2:30 PM', positive:true },
    { id:2, type:'Team Bonus', desc:'Monthly performance', amount:'+$100', date:'Yesterday, 10:00 AM', positive:true },
    { id:3, type:'Withdrawal', desc:'Bank transfer', amount:'-$200', date:'Apr 12, 2026', positive:false },
    { id:4, type:'Commission', desc:'Product sale cut', amount:'+$75', date:'Apr 11, 2026', positive:true },
    { id:5, type:'Rank Bonus', desc:'Silver milestone', amount:'+$250', date:'Apr 8, 2026', positive:true },
  ];

  // Bar chart data (weekly)
  const barData = [40, 65, 80, 55, 90, 70, 100];
  const days = ['M','T','W','T','F','S','S'];
  const maxBar = Math.max(...barData);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>

      {/* ── Hero balance card ── */}
      <FadeIn delay={0}>
        <LinearGradient
          colors={['#064E3B','#065F46','#10B981']}
          start={{ x:0, y:0 }} end={{ x:1, y:1 }}
          style={{ borderRadius:26, padding:24, marginBottom:18, overflow:'hidden' }}
        >
          <View style={{ position:'absolute', right:-40, top:-40, width:140, height:140, borderRadius:70, backgroundColor:'rgba(255,255,255,0.06)' }} />
          <View style={{ position:'absolute', left:60, bottom:-30, width:100, height:100, borderRadius:50, backgroundColor:'rgba(255,255,255,0.04)' }} />

          <Text style={{ color:'rgba(255,255,255,0.65)', fontSize:13, fontWeight:'600', letterSpacing:1 }}>AVAILABLE BALANCE</Text>
          <Text style={{ color:'#fff', fontSize:38, fontWeight:'900', marginTop:6, marginBottom:16 }}>$470.00</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={{ backgroundColor:'rgba(255,255,255,0.18)', borderRadius:14, height:48, flexDirection:'row', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.3)' }}
          >
            <Wallet color="#fff" size={18} />
            <Text style={{ color:'#fff', fontWeight:'800', fontSize:15, marginLeft:8 }}>Withdraw Funds</Text>
          </TouchableOpacity>
        </LinearGradient>
      </FadeIn>

      {/* ── Stat cards ── */}
      <FadeIn delay={80}>
        <Text style={{ fontSize:13, fontWeight:'700', color:C.muted, letterSpacing:1, marginBottom:10 }}>EARNINGS OVERVIEW</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:20 }}>
          {cards.map((card, i) => (
            <View
              key={i}
              style={{
                width:(width-48)/2, borderRadius:20,
                backgroundColor:C.surface,
                borderWidth:1, borderColor:C.border, padding:16,
              }}
            >
              <View style={{ width:40, height:40, borderRadius:12, backgroundColor:card.bg, alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                <card.icon color={card.grad[0]} size={20} />
              </View>
              <Text style={{ fontSize:20, fontWeight:'800', color:C.text }}>{card.value}</Text>
              <Text style={{ fontSize:11, color:C.muted, marginTop:3 }}>{card.label}</Text>
            </View>
          ))}
        </View>
      </FadeIn>

      {/* ── Weekly mini bar chart ── */}
      <FadeIn delay={160}>
        <View style={{ backgroundColor:C.surface, borderRadius:20, borderWidth:1, borderColor:C.border, padding:18, marginBottom:20 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <Text style={{ fontSize:15, fontWeight:'800', color:C.text }}>Weekly Earnings</Text>
            <View style={{ flexDirection:'row', alignItems:'center' }}>
              <ArrowUpRight color="#10B981" size={14} />
              <Text style={{ fontSize:12, color:'#10B981', fontWeight:'700', marginLeft:3 }}>+18%</Text>
            </View>
          </View>
          <View style={{ flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between', height:80 }}>
            {barData.map((v, i) => {
              const h = (v / maxBar) * 70;
              const isToday = i === 6;
              return (
                <View key={i} style={{ alignItems:'center', flex:1 }}>
                  <View
                    style={{
                      width:'60%', height:h, borderRadius:6,
                      backgroundColor: isToday ? '#10B981' : C.accent+'55',
                    }}
                  />
                  <Text style={{ fontSize:10, color: isToday ? '#10B981' : C.muted, marginTop:6, fontWeight: isToday ? '800' : '400' }}>
                    {days[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </FadeIn>

      {/* ── Transaction history ── */}
      <FadeIn delay={240}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <Text style={{ fontSize:13, fontWeight:'700', color:C.muted, letterSpacing:1 }}>TRANSACTIONS</Text>
          <TouchableOpacity><Text style={{ fontSize:12, color:C.accent, fontWeight:'700' }}>View all</Text></TouchableOpacity>
        </View>
        <View style={{ backgroundColor:C.surface, borderRadius:20, borderWidth:1, borderColor:C.border, overflow:'hidden' }}>
          {transactions.map((tx, i) => (
            <View
              key={tx.id}
              style={{
                flexDirection:'row', alignItems:'center',
                paddingHorizontal:16, paddingVertical:14,
                borderBottomWidth: i < transactions.length-1 ? 1 : 0,
                borderBottomColor:C.border,
              }}
            >
              <View style={{
                width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center',
                backgroundColor: tx.positive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              }}>
                {tx.positive
                  ? <ArrowUpRight color="#10B981" size={18} />
                  : <ArrowDownRight color="#EF4444" size={18} />}
              </View>
              <View style={{ flex:1, marginLeft:12 }}>
                <Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{tx.type}</Text>
                <Text style={{ fontSize:11, color:C.muted, marginTop:2 }}>{tx.desc} · {tx.date}</Text>
              </View>
              <Text style={{ fontSize:15, fontWeight:'800', color: tx.positive ? '#10B981' : '#EF4444' }}>
                {tx.amount}
              </Text>
            </View>
          ))}
        </View>
      </FadeIn>
    </ScrollView>
  );
};

export default EarningsScreen;
