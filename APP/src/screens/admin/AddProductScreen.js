import React, { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, Plus, Check, Image as ImageIcon } from 'lucide-react-native';
import apiClient from '../../api/authService';

const AddProductScreen = ({ C }) => {
  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    stock: '',
    image: null,
  });
  const [selCat, setSelCat] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Local state to store products
  const [addedProducts, setAddedProducts] = useState([]);
  const [showProducts, setShowProducts] = useState(false);

  const categories = [
    'Electronics',
    'Clothing',
    'Health',
    'Food',
    'Digital',
    'Other',
  ];

  // Fetch products from backend
  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      if (response.data && response.data.data) {
        setAddedProducts(response.data.data);
      }
    } catch (error) {
      console.log('Error fetching products:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setForm(p => ({ ...p, image: result.assets[0].uri }));
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price || !selCat) {
      Alert.alert(
        'Missing Fields',
        'Please fill in Name, Price, and Category.'
      );
      return;
    }
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('price', parseFloat(form.price));
      formData.append('category', selCat);
      formData.append('stock', form.stock ? parseInt(form.stock) : 0);
      if (form.description) formData.append('description', form.description);

      if (form.image) {
        const uriParts = form.image.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('image', {
          uri: form.image,
          name: `photo.${fileType}`,
          type: `image/${fileType}`,
        });
      }
      
      const response = await apiClient.post('/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data && response.data.status === 'success') {
        const newProduct = response.data.data;
        // Optionally prepend instead of append, but fetching again also works
        setAddedProducts(prev => [newProduct, ...prev]);
        
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setForm({ name: '', price: '', description: '', stock: '', image: null });
          setSelCat('');
        }, 2500);
      }
    } catch (err) {
      console.log('Error adding product:', err);
      const errorMessage = err.response && err.response.data && err.response.data.message 
                           ? err.response.data.message 
                           : err.message || 'Unknown error occurred';
      Alert.alert('Error', `Failed to add the product: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
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
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center">
          <Package color={C.amber} size={26} />
          <Text className="text-xl font-bold ml-2" style={{ color: C.text }}>
            {showProducts ? 'Added Products' : 'Add Product'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowProducts(!showProducts)}
          className="px-3 py-1.5 rounded-full"
          style={{ backgroundColor: C.accent + '20' }}
        >
          <Text className="text-xs font-semibold" style={{ color: C.accent }}>
            {showProducts ? 'Add New' : `View Products (${addedProducts.length})`}
          </Text>
        </TouchableOpacity>
      </View>
      <Text className="text-sm mb-5" style={{ color: C.muted }}>
        {showProducts ? 'View all products currently added during this session' : 'Add a new product to the system catalog'}
      </Text>

      {showProducts ? (
        <View className="mb-4">
          {addedProducts.length === 0 ? (
            <View className="py-10 items-center justify-center">
              <Text style={{ color: C.muted }}>No products added yet.</Text>
            </View>
          ) : (
            addedProducts.map(product => (
              <View 
                key={product.id} 
                className="rounded-xl p-4 mb-3"
                style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
              >
                <View className="flex-row justify-between mb-1">
                  <Text className="font-bold text-base" style={{ color: C.text }}>{product.name}</Text>
                  <Text className="font-bold" style={{ color: C.green }}>${product.price}</Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <View className="px-2 py-0.5 rounded-md mr-2" style={{ backgroundColor: C.accent + '20' }}>
                    <Text className="text-[10px] font-semibold" style={{ color: C.accent }}>{product.category}</Text>
                  </View>
                  <Text className="text-xs" style={{ color: C.muted }}>Stock: {product.stock || '0'}</Text>
                </View>
                {product.image && (
                  <Image source={{ uri: product.image }} className="w-full h-32 rounded-lg mb-2" resizeMode="cover" />
                )}
                {product.description ? (
                  <Text className="text-xs" style={{ color: C.muted }}>{product.description}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : (
      <View
        className="rounded-2xl p-5 mb-4"
        style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        {/* Image Picker */}
        <Text
          className="text-xs font-semibold mb-1.5"
          style={{ color: C.muted }}
        >
          Product Image
        </Text>
        <TouchableOpacity 
          onPress={pickImage}
          className="w-full h-32 rounded-xl mb-4 items-center justify-center overflow-hidden"
          style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' }}
        >
          {form.image ? (
            <Image source={{ uri: form.image }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <ImageIcon color={C.muted} size={30} />
              <Text className="text-xs mt-2" style={{ color: C.muted }}>Tap to upload an image</Text>
            </View>
          )}
        </TouchableOpacity>

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
      )}
    </ScrollView>
  );
};

export default AddProductScreen;
