import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Users, Search, ChevronRight } from 'lucide-react-native';

const MyNetwork = ({ C }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'direct', label: 'Direct' },
    { key: 'team', label: 'Team' },
  ];

  const networkMembers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', level: 'Direct', joined: '2 days ago', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', level: 'Direct', joined: '5 days ago', status: 'active' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', level: 'Team', joined: '1 week ago', status: 'active' },
    { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', level: 'Team', joined: '2 weeks ago', status: 'inactive' },
  ];

  const filtered = networkMembers.filter(member =>
    filter === 'all' ? true : member.level.toLowerCase() === filter
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="flex-row items-center mb-1">
        <Users color={C.green} size={26} />
        <Text className="text-xl font-bold ml-2" style={{ color: C.text }}>My Network</Text>
      </View>
      <Text className="text-sm mb-4" style={{ color: C.muted }}>View and manage your network members</Text>

      {/* Network Stats */}
      <View className="flex-row justify-between mb-4" style={{ gap: 8 }}>
        <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
          <Text className="text-2xl font-bold" style={{ color: C.green }}>8</Text>
          <Text className="text-xs mt-1" style={{ color: C.muted }}>Direct Referrals</Text>
        </View>
        <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
          <Text className="text-2xl font-bold" style={{ color: C.blue }}>42</Text>
          <Text className="text-xs mt-1" style={{ color: C.muted }}>Total Team</Text>
        </View>
      </View>

      {/* Search */}
      <View
        className="flex-row items-center rounded-xl px-4 h-12 mb-4"
        style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border }}
      >
        <Search color={C.muted} size={18} />
        <TextInput
          className="flex-1 ml-2 text-sm"
          placeholder="Search network..."
          placeholderTextColor={C.muted}
          style={{ color: C.text }}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Tabs */}
      <View className="flex-row mb-4" style={{ gap: 8 }}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setFilter(t.key)}
            className="px-4 py-1.5 rounded-full"
            style={{
              backgroundColor: filter === t.key ? C.accent : C.card,
              borderWidth: 1,
              borderColor: filter === t.key ? C.accent : C.border,
            }}
          >
            <Text className="text-xs font-semibold" style={{ color: filter === t.key ? '#fff' : C.muted }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Members List */}
      {filtered.map((member, i) => (
        <View
          key={member.id}
          className="flex-row items-center rounded-2xl px-4 py-3 mb-3"
          style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
        >
          <View
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: member.status === 'active' ? C.green : C.muted }}
          >
            <Text className="text-white text-base font-bold">
              {member.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-sm font-semibold" style={{ color: C.text }}>{member.name}</Text>
            <Text className="text-xs" style={{ color: C.muted }}>{member.email}</Text>
            <Text className="text-xs mt-0.5" style={{ color: C.sub }}>{member.level} • {member.joined}</Text>
          </View>
          <View className="items-end">
            <View
              className="px-2 py-0.5 rounded-full mb-1"
              style={{ backgroundColor: member.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)' }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: member.status === 'active' ? C.green : C.muted }}
              >
                {member.status.toUpperCase()}
              </Text>
            </View>
            <ChevronRight color={C.muted} size={16} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

export default MyNetwork;
