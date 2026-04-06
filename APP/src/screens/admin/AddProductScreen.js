import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, Plus, Check } from 'lucide-react-native';

const AddProductScreen = ({ C }) => {
  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    stock: '',
  });
  const [selCat, setSelCat] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    'Electronics',
    'Clothing',
    'Health',
    'Food',
    'Digital',
    'Other',
  ];

  const handleSubmit = () => {
    if (!form.name || !form.price || !selCat) {
      Alert.alert(
        'Missing Fields',
        'Please fill in Name, Price, and Category.'
      );
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setForm({ name: '', price: '', description: '', stock: '' });
        setSelCat('');
      }, 2500);
    }, 1500);
  };

  if (submitted) {
    return (
      <View className="flex-1 justify-center items-center px-6">
        <LinearGradient
          colors={['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.05)']}
          className="w-full rounded-3xl p-10 items-center"
        >
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(16,185,129,0.2)' }}
          >
            <Check color={C.green} size={40} />
          </View>
          <Text
            className="text-xl font-bold mb-2"
            style={{ color: C.text }}
          >
            Product Added!
          </Text>
          <Text
            className="text-sm text-center"
            style={{ color: C.muted }}
          >
            Your product has been successfully added to the catalog.
          </Text>
        </LinearGradient>
      </View>
    );
  }

  const inputStyle = {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center mb-1">
        <Package color={C.amber} size={26} />
        <Text className="text-xl font-bold ml-2" style={{ color: C.text }}>
          Add Product
        </Text>
      </View>
      <Text className="text-sm mb-5" style={{ color: C.muted }}>
        Add a new product to the system catalog
      </Text>

      <View
        className="rounded-2xl p-5 mb-4"
        style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        {/* Name */}
        <Text
          className="text-xs font-semibold mb-1.5"
          style={{ color: C.muted }}
        >
          Product Name *
        </Text>
        <TextInput
          className="rounded-xl px-4 h-12 mb-4 text-sm"
          style={[inputStyle, { color: C.text }]}
          placeholder="e.g. Premium Health Kit"
          placeholderTextColor={C.muted}
          value={form.name}
          onChangeText={v => setForm(p => ({ ...p, name: v }))}
        />

        {/* Price */}
        <Text
          className="text-xs font-semibold mb-1.5"
          style={{ color: C.muted }}
        >
          Price (USD) *
        </Text>
        <TextInput
          className="rounded-xl px-4 h-12 mb-4 text-sm"
          style={[inputStyle, { color: C.text }]}
          placeholder="0.00"
          placeholderTextColor={C.muted}
          keyboardType="decimal-pad"
          value={form.price}
          onChangeText={v => setForm(p => ({ ...p, price: v }))}
        />

        {/* Category */}
        <Text
          className="text-xs font-semibold mb-2"
          style={{ color: C.muted }}
        >
          Category *
        </Text>
        <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setSelCat(c)}
              className="px-4 py-2 rounded-xl"
              style={{
                backgroundColor: selCat === c ? C.accent : C.card,
                borderWidth: 1,
                borderColor: selCat === c ? C.accent : C.border,
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: selCat === c ? '#fff' : C.muted }}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stock */}
        <Text
          className="text-xs font-semibold mb-1.5"
          style={{ color: C.muted }}
        >
          Stock Quantity
        </Text>
        <TextInput
          className="rounded-xl px-4 h-12 mb-4 text-sm"
          style={[inputStyle, { color: C.text }]}
          placeholder="0"
          placeholderTextColor={C.muted}
          keyboardType="number-pad"
          value={form.stock}
          onChangeText={v => setForm(p => ({ ...p, stock: v }))}
        />

        {/* Description */}
        <Text
          className="text-xs font-semibold mb-1.5"
          style={{ color: C.muted }}
        >
          Description
        </Text>
        <TextInput
          className="rounded-xl px-4 py-3 mb-5 text-sm"
          style={[
            inputStyle,
            { color: C.text, height: 90, textAlignVertical: 'top' },
          ]}
          placeholder="Describe the product..."
          placeholderTextColor={C.muted}
          multiline
          numberOfLines={4}
          value={form.description}
          onChangeText={v => setForm(p => ({ ...p, description: v }))}
        />

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className="h-12 rounded-xl overflow-hidden"
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={[0, 0]}
            end={[1, 0]}
            className="flex-1 flex-row justify-center items-center"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Plus color="#fff" size={20} />
                <Text className="text-white font-bold ml-2">
                  Add Product
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AddProductScreen;
