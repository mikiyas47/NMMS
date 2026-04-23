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
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios
      .get(`${API_BASE}/all-users`)
      .then(r => setUsers(r.data.filter(u => u.role !== 'admin')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users
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
          Distributors
        </Text>
      </View>
      <Text className="text-sm mb-4" style={{ color: C.muted }}>
        Monitor and manage all registered distributors
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
          placeholder="Search distributors..."
          placeholderTextColor={C.muted}
          style={{ color: C.text }}
          value={search}
          onChangeText={setSearch}
        />
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
          {filtered.length} distributor{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View className="items-center py-12">
          <Users color={C.muted} size={48} />
          <Text className="mt-3 text-sm" style={{ color: C.muted }}>
            No distributors found
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
                backgroundColor: 'rgba(16,185,129,0.2)'
              }}
            >
              <Text
                className="text-base font-bold"
                style={{ color: C.green }}
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
              <Text
                className="text-xs mt-0.5 font-bold"
                style={{ color: C.accent }}
              >
                Rank: {u.rank || 'CT'}
              </Text>
            </View>
            <View className="items-end">
              <ChevronRight color={C.muted} size={16} />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default ProspectsScreen;
