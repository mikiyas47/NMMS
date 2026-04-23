import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Search, AlertCircle, Edit2, Power } from 'lucide-react-native';
import axios from 'axios';

const API_BASE = 'https://nmms-backend.onrender.com/api';

const OwnerScreen = ({ C }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });

  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', password: '', role: 'admin' });

  const fetchAdmins = () => {
    setLoading(true);
    axios
      .get(`${API_BASE}/all-users`)
      .then(r => setUsers(r.data.filter(u => u.role === 'admin')))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleToggleStatus = (admin) => {
    Alert.alert('Confirm Status Change', `Are you sure you want to make ${admin.name} ${admin.status === 'active' ? 'inactive' : 'active'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: () => {
        axios.patch(`${API_BASE}/users/${admin.userid}/status`)
          .then(() => fetchAdmins())
          .catch(err => Alert.alert('Error', 'Failed to update status'));
      }}
    ]);
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setEditForm({ name: admin.name, email: admin.email, phone: admin.phone || '' });
  };

  const handleSaveEdit = () => {
    if (!editForm.name || !editForm.email) {
      Alert.alert('Validation Error', 'Name and Email are required.');
      return;
    }
    axios.put(`${API_BASE}/users/${editingAdmin.userid}`, editForm)
      .then(() => {
        setEditingAdmin(null);
        fetchAdmins();
      })
      .catch(err => {
        Alert.alert('Error', err.response?.data?.message || 'Failed to update admin info');
      });
  };

  const handleAddAdmin = () => {
    if (!addForm.name || !addForm.email || !addForm.password) {
      Alert.alert('Validation Error', 'Name, Email, and Password are required.');
      return;
    }
    axios.post(`${API_BASE}/users`, addForm)
      .then(() => {
        setAddingAdmin(false);
        setAddForm({ name: '', email: '', phone: '', password: '', role: 'admin' });
        fetchAdmins();
      })
      .catch(err => {
        Alert.alert('Error', err.response?.data?.message || 'Failed to add admin');
      });
  };

  const filtered = users.filter(
    u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-1 mt-2">
          <View className="flex-row items-center">
            <ShieldCheck color={C.blue} size={26} />
            <Text className="text-xl font-bold ml-2" style={{ color: C.text }}>
              Administrators
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => setAddingAdmin(true)}
            className="px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: C.blue }}
          >
            <Text className="text-xs font-bold text-white">+ Add Admin</Text>
          </TouchableOpacity>
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
              key={u.userid ? `${u.role}-${u.userid}` : i}
              className="rounded-2xl overflow-hidden mb-3"
              style={{ borderWidth: 1, borderColor: C.border, opacity: u.status === 'inactive' ? 0.7 : 1 }}
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
                    style={{ backgroundColor: u.status === 'inactive' ? C.muted : C.blue }}
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
                
                <View className="flex-row mb-3">
                  {[
                    ['Status', (u.status || 'active').charAt(0).toUpperCase() + (u.status || 'active').slice(1), u.status === 'inactive' ? '#EF4444' : C.green],
                    ['Phone', u.phone || '—', C.text],
                    ['Row Num', `#${i + 1}`, C.muted],
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

                {/* Actions */}
                <View className="flex-row items-center mt-1 pt-3" style={{ borderTopWidth: 1, borderTopColor: 'rgba(59,130,246,0.1)' }}>
                  <TouchableOpacity onPress={() => handleEdit(u)} className="flex-row items-center px-2 py-1">
                    <Edit2 color={C.blue} size={14} />
                    <Text className="text-xs ml-1.5" style={{color: C.blue, fontWeight: '700'}}>Edit Info</Text>
                  </TouchableOpacity>
                  
                  <View style={{ flex: 1 }} />
                  
                  <TouchableOpacity onPress={() => handleToggleStatus(u)} className="flex-row items-center px-2 py-1">
                    <Power color={u.status === 'inactive' ? C.green : '#EF4444'} size={14} />
                    <Text className="text-xs ml-1.5" style={{color: u.status === 'inactive' ? C.green : '#EF4444', fontWeight: '700'}}>
                      {u.status === 'inactive' ? 'Set Active' : 'Set Inactive'}
                    </Text>
                  </TouchableOpacity>
                </View>

              </LinearGradient>
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={!!editingAdmin} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: C.text, marginBottom: 16 }}>
              Edit Admin Info
            </Text>
            
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Name</Text>
            <TextInput
              value={editForm.name}
              onChangeText={val => setEditForm(prev => ({...prev, name: val}))}
              style={{ backgroundColor: C.inputBg, color: C.text, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, borderWidth: 1, borderColor: C.border }}
            />
            
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Email</Text>
            <TextInput
              value={editForm.email}
              onChangeText={val => setEditForm(prev => ({...prev, email: val}))}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ backgroundColor: C.inputBg, color: C.text, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, borderWidth: 1, borderColor: C.border }}
            />
            
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Phone</Text>
            <TextInput
              value={editForm.phone}
              onChangeText={val => setEditForm(prev => ({...prev, phone: val}))}
              keyboardType="phone-pad"
              style={{ backgroundColor: C.inputBg, color: C.text, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 24, borderWidth: 1, borderColor: C.border }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setEditingAdmin(null)}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.inputBg, alignItems: 'center' }}
              >
                <Text style={{ color: C.muted, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.blue, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal visible={addingAdmin} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: C.text, marginBottom: 16 }}>
              Add New Admin/Owner
            </Text>
            
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Name</Text>
            <TextInput
              value={addForm.name}
              onChangeText={val => setAddForm(prev => ({...prev, name: val}))}
              style={{ backgroundColor: C.inputBg, color: C.text, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, borderWidth: 1, borderColor: C.border }}
            />
            
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Email</Text>
            <TextInput
              value={addForm.email}
              onChangeText={val => setAddForm(prev => ({...prev, email: val}))}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ backgroundColor: C.inputBg, color: C.text, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, borderWidth: 1, borderColor: C.border }}
            />
            
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Phone</Text>
            <TextInput
              value={addForm.phone}
              onChangeText={val => setAddForm(prev => ({...prev, phone: val}))}
              keyboardType="phone-pad"
              style={{ backgroundColor: C.inputBg, color: C.text, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, borderWidth: 1, borderColor: C.border }}
            />

            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Password</Text>
            <TextInput
              value={addForm.password}
              onChangeText={val => setAddForm(prev => ({...prev, password: val}))}
              secureTextEntry
              style={{ backgroundColor: C.inputBg, color: C.text, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, borderWidth: 1, borderColor: C.border }}
            />

            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Role (admin or owner)</Text>
            <TextInput
              value={addForm.role}
              onChangeText={val => setAddForm(prev => ({...prev, role: val.toLowerCase()}))}
              style={{ backgroundColor: C.inputBg, color: C.text, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 24, borderWidth: 1, borderColor: C.border }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setAddingAdmin(false)}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.inputBg, alignItems: 'center' }}
              >
                <Text style={{ color: C.muted, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddAdmin}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.blue, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OwnerScreen;
