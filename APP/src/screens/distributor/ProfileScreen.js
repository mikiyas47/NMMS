import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { User, Mail, Phone, MapPin, Calendar, Edit, ChevronRight } from 'lucide-react-native';

const ProfileScreen = ({ C }) => {
  const profileInfo = [
    { icon: User, label: 'Full Name', value: 'Miki Prospect' },
    { icon: Mail, label: 'Email', value: 'miki@gmail.com' },
    { icon: Phone, label: 'Phone', value: '0912345678' },
    { icon: Calendar, label: 'Member Since', value: 'December 2024' },
    { icon: MapPin, label: 'Location', value: 'Addis Ababa, Ethiopia' },
  ];

  const stats = [
    { label: 'Rank', value: 'Silver', color: C.amber },
    { label: 'Status', value: 'Active', color: C.green },
    { label: 'Referrals', value: '8', color: C.blue },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View className="items-center mb-5">
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: C.accentLight }}
        >
          <User color={C.accent} size={48} />
        </View>
        <Text className="text-2xl font-bold" style={{ color: C.text }}>Miki Prospect</Text>
        <Text className="text-sm mt-1" style={{ color: C.muted }}>Distributor</Text>
        <View className="mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
          <Text className="text-xs font-bold" style={{ color: C.amber }}>SILVER MEMBER</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View className="flex-row justify-between mb-5" style={{ gap: 8 }}>
        {stats.map((stat, i) => (
          <View
            key={i}
            className="flex-1 rounded-2xl p-4 items-center"
            style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
          >
            <Text className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</Text>
            <Text className="text-xs mt-1" style={{ color: C.muted }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Profile Information */}
      <Text className="text-base font-bold mb-3" style={{ color: C.text }}>Profile Information</Text>
      <View className="rounded-2xl overflow-hidden mb-5" style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
        {profileInfo.map((info, i) => (
          <View
            key={i}
            className="flex-row items-center px-4 py-3"
            style={{ borderBottomWidth: i < profileInfo.length - 1 ? 1 : 0, borderBottomColor: C.border }}
          >
            <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: C.card }}>
              <info.icon color={C.muted} size={16} />
            </View>
            <View className="flex-1">
              <Text className="text-xs" style={{ color: C.muted }}>{info.label}</Text>
              <Text className="text-sm font-semibold" style={{ color: C.text }}>{info.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Edit Profile Button */}
      <TouchableOpacity className="rounded-2xl overflow-hidden mb-5">
        <View
          className="p-4 flex-row justify-center items-center"
          style={{ backgroundColor: C.accent }}
        >
          <Edit color="#fff" size={18} />
          <Text className="text-white text-base font-bold ml-2">Edit Profile</Text>
        </View>
      </TouchableOpacity>

      {/* Account Settings */}
      <Text className="text-base font-bold mb-3" style={{ color: C.text }}>Account Settings</Text>
      <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
        {['Change Password', 'Notification Preferences', 'Privacy Settings', 'Help & Support'].map((item, i) => (
          <TouchableOpacity
            key={i}
            className="flex-row items-center justify-between px-4 py-3"
            style={{ borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: C.border }}
          >
            <Text className="text-sm" style={{ color: C.text }}>{item}</Text>
            <ChevronRight color={C.muted} size={16} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;
