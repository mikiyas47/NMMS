import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Search, AlertCircle } from 'lucide-react-native';
import axios from 'axios';

const API_BASE = 'https://nmms-backend.onrender.com/api';

const AdminsScreen = ({ C }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios
      .get(`${API_BASE}/all-users`)
      .then(r => setUsers(r.data.filter(u => u.role === 'admin')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(
    u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="flex-row items-center mb-1">
        <ShieldCheck color={C.blue} size={26} />
        <Text className="text-xl font-bold ml-2" style={{ color: C.text }}>
          Administrators
        </Text>
      </View>
      <Text className="text-sm mb-4" style={{ color: C.muted }}>
        Manage system administrators and their permissions
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
          placeholder="Search admins..."
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
          {filtered.length} admin{filtered.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View className="items-center py-12">
          <AlertCircle color={C.muted} size={48} />
          <Text className="mt-3 text-sm" style={{ color: C.muted }}>
            No admins found
          </Text>
        </View>
      ) : (
        filtered.map((u, i) => (
          <View
            key={u.userid || i}
            className="rounded-2xl overflow-hidden mb-3"
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <LinearGradient
              colors={['rgba(59,130,246,0.15)', 'rgba(59,130,246,0.03)']}
              className="p-4"
              start={[0, 0]}
              end={[1, 1]}
            >
              <View className="flex-row items-center mb-3">
                <View
                  className="w-11 h-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: C.blue }}
                >
                  <Text className="text-white text-base font-bold">
                    {u.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text
                    className="text-base font-bold"
                    style={{ color: C.text }}
                  >
                    {u.name}
                  </Text>
                  <Text className="text-xs" style={{ color: C.muted }}>
                    {u.email}
                  </Text>
                </View>
                <View
                  className="flex-row items-center px-2 py-1 rounded-lg"
                  style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}
                >
                  <ShieldCheck color={C.blue} size={12} />
                  <Text
                    className="text-xs font-bold ml-1"
                    style={{ color: C.blue }}
                  >
                    Admin
                  </Text>
                </View>
              </View>
              <View className="flex-row">
                {[
                  ['Status', 'Active', C.green],
                  ['Role', 'Super Admin', C.text],
                  ['ID', `#${u.userid || '—'}`, C.muted],
                ].map(([lbl, val, clr], j) => (
                  <View key={j} className="flex-1">
                    <Text className="text-xs" style={{ color: C.muted }}>
                      {lbl}
                    </Text>
                    <Text
                      className="text-xs font-semibold mt-0.5"
                      style={{ color: clr }}
                    >
                      {val}
                    </Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default AdminsScreen;
