import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Users, Search, ChevronRight } from 'lucide-react-native';
import axios from 'axios';

const API_BASE = 'https://nmms-backend.onrender.com/api';

const ProspectsScreen = ({ C }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios
      .get(`${API_BASE}/all-users`)
      .then(r => setUsers(r.data.filter(u => u.role !== 'admin')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'unpaid', label: 'Unpaid' },
  ];

  const filtered = users
    .filter(u =>
      filter === 'all' ? true : filter === 'paid' ? u.isPaid : !u.isPaid
    )
    .filter(
      u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="flex-row items-center mb-1">
        <Users color={C.green} size={26} />
        <Text className="text-xl font-bold ml-2" style={{ color: C.text }}>
          Prospects
        </Text>
      </View>
      <Text className="text-sm mb-4" style={{ color: C.muted }}>
        Monitor and manage all registered prospects
      </Text>

      {/* Search */}
      <View
        className="flex-row items-center rounded-xl px-4 h-12 mb-4"
        style={{
          backgroundColor: C.inputBg,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Search color={C.muted} size={18} />
        <TextInput
          className="flex-1 ml-2 text-sm"
          placeholder="Search prospects..."
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
            <Text
              className="text-xs font-semibold"
              style={{ color: filter === t.key ? '#fff' : C.muted }}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <View
        className="self-start px-3 py-1 rounded-full mb-4"
        style={{ backgroundColor: C.accentLight }}
      >
        <Text
          className="text-xs font-semibold"
          style={{ color: C.accent }}
        >
          {filtered.length} prospect{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View className="items-center py-12">
          <Users color={C.muted} size={48} />
          <Text className="mt-3 text-sm" style={{ color: C.muted }}>
            No prospects found
          </Text>
        </View>
      ) : (
        filtered.map((u, i) => (
          <View
            key={u.userid ? `${u.role}-${u.userid}` : i}
            className="flex-row items-center rounded-2xl px-4 py-3 mb-3"
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{
                backgroundColor: u.isPaid
                  ? 'rgba(16,185,129,0.2)'
                  : 'rgba(245,158,11,0.2)',
              }}
            >
              <Text
                className="text-base font-bold"
                style={{ color: u.isPaid ? C.green : C.amber }}
              >
                {u.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1 ml-3">
              <Text
                className="text-sm font-semibold"
                style={{ color: C.text }}
              >
                {u.name}
              </Text>
              <Text className="text-xs" style={{ color: C.muted }}>
                {u.email}
              </Text>
              <Text
                className="text-xs mt-0.5"
                style={{ color: C.sub }}
              >
                Phone: {u.phone || '—'}
              </Text>
            </View>
            <View className="items-end">
              <View
                className="px-2 py-0.5 rounded-full mb-1"
                style={{
                  backgroundColor: u.isPaid
                    ? 'rgba(16,185,129,0.15)'
                    : 'rgba(245,158,11,0.15)',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: u.isPaid ? C.green : C.amber,
                  }}
                >
                  {u.isPaid ? '✓ PAID' : 'UNPAID'}
                </Text>
              </View>
              <ChevronRight color={C.muted} size={16} />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default ProspectsScreen;
