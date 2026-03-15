import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  User, 
  TrendingUp, 
  LogOut,
  ChevronRight,
  CreditCard,
  Target,
  Users
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const UserDashboard = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1E3A8A', '#1E40AF', '#111827']} style={styles.background}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Member Portal</Text>
            <Text style={styles.subtitle}>Welcome to the Network</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Login')}>
            <LogOut color="#EF4444" size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* User Card */}
          <View style={styles.userCard}>
             <View style={styles.userInfo}>
                <View style={styles.avatar}>
                   <User color="#FFFFFF" size={30} />
                </View>
                <View style={styles.details}>
                   <Text style={styles.userName}>Mikiyas</Text>
                   <Text style={styles.userRole}>Standard Member</Text>
                </View>
                <View style={[styles.badge, styles.activeBadge]}>
                   <Text style={styles.badgeText}>ACTIVE</Text>
                </View>
             </View>
          </View>

          {/* User Stats/Shortcuts */}
          <View style={styles.statsRow}>
             <View style={styles.miniStat}>
                <Target color="#F59E0B" size={24} />
                <Text style={styles.statVal}>8</Text>
                <Text style={styles.statLab}>Directs</Text>
             </View>
             <View style={styles.miniStat}>
                <Users color="#3B82F6" size={24} />
                <Text style={styles.statVal}>42</Text>
                <Text style={styles.statLab}>Team Size</Text>
             </View>
             <View style={styles.miniStat}>
                <CreditCard color="#10B981" size={24} />
                <Text style={styles.statVal}>$2.4k</Text>
                <Text style={styles.statLab}>Earnings</Text>
             </View>
          </View>

           {/* Call to Action */}
           <TouchableOpacity style={styles.mainCall}>
              <LinearGradient 
                colors={['#0D9488', '#0F766E']} 
                start={{x:0, y:0}} 
                end={{x:1, y:0}} 
                style={styles.callGradient}
              >
                 <View>
                    <Text style={styles.callTitle}>Network Growth</Text>
                    <Text style={styles.callSub}>Invite new members to grow</Text>
                 </View>
                 <TrendingUp color="#FFFFFF" size={24} />
              </LinearGradient>
           </TouchableOpacity>

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default UserDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
  },
  iconBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollContent: {
    paddingHorizontal: 25,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  badgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  miniStat: {
    width: (width - 70) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLab: {
     fontSize: 11,
     color: '#6B7280',
     marginTop: 2,
  },
  mainCall: {
     borderRadius: 20,
     overflow: 'hidden',
     marginBottom: 30,
  },
  callGradient: {
     padding: 25,
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
  },
  callTitle: {
     color: '#FFFFFF',
     fontSize: 18,
     fontWeight: 'bold',
  },
  callSub: {
     color: 'rgba(255,255,255,0.7)',
     fontSize: 13,
     marginTop: 4,
  }
});
