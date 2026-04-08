import React, { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Video } from 'expo-av';
import { Video as VideoCompressor } from 'react-native-compressor';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { Package, Plus, Check, Image as ImageIcon, Video as VideoIcon } from 'lucide-react-native';
import apiClient from '../../api/authService';

const AddProductScreen = ({ C }) => {
  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    stock: '',
    image: null,
    mediaType: 'image', // track if it's an image or video
  });
  const [selCat, setSelCat] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Local state to store products
  const [addedProducts, setAddedProducts] = useState([]);
  const [showProducts, setShowProducts] = useState(false);
  const [editProductId, setEditProductId] = useState(null);

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
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setForm(p => ({ 
        ...p, 
        image: result.assets[0].uri,
        mediaType: result.assets[0].type || 'image',
      }));
    }
  };
  
  // Helper to determine if a URL/URI is a video
  const isVideoUrl = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mov') || lowerUrl.endsWith('.avi');
  };

  // Helper to force HTTPS for media URLs (fixes Android cleartext traffic block)
  const getSecureUrl = (url) => {
    if (!url) return null;
    return url.replace(/^http:\/\//i, 'https://');
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price || !selCat) {
      Alert.alert('Missing Fields', 'Please fill in Name, Price, and Category.');
      return;
    }
    setLoading(true);

    try {
      console.log(editProductId ? 'Updating product...' : 'Submitting product...');

      let response;

      // Determine if there is a *new* file to upload
      if (form.image && form.image.startsWith('file://')) {
        let uploadUri = form.image;

        // Compress video if necessary
        if (form.mediaType === 'video' || isVideoUrl(form.image)) {
          console.log('Compressing video...');
          try {
            uploadUri = await VideoCompressor.compress(form.image, {
              compressionMethod: 'auto',
            });
            console.log('Compressed video saved at:', uploadUri);
          } catch (compErr) {
            console.log('Compression failed, using original video.', compErr);
          }
        }

        const filename = uploadUri.split('/').pop();
        const match    = /\.(\w+)$/.exec(filename);
        
        let mime = form.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
        if (match) {
          const ext = match[1].toLowerCase();
          if (form.mediaType === 'video') {
            if (ext === 'mov') mime = 'video/quicktime';
            else if (ext === 'avi') mime = 'video/x-msvideo';
            else mime = 'video/mp4';
          } else {
            if (ext === 'png') mime = 'image/png';
            else if (ext === 'webp') mime = 'image/webp';
            else mime = 'image/jpeg';
          }
        }

        const token = await AsyncStorage.getItem('authToken');
        const url   = apiClient.defaults.baseURL + '/products' + (editProductId ? `/${editProductId}` : '');

        const uploadOptions = {
          httpMethod: 'POST', // Always POST for FileSystem multipart mapped mapped _method
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'image',
          mimeType: mime,
          parameters: {
            name: form.name,
            price: String(parseFloat(form.price)),
            category: selCat,
            stock: form.stock ? String(parseInt(form.stock)) : '0',
            description: form.description || '',
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        };

        if (editProductId) {
          uploadOptions.parameters._method = 'PUT';
        }

        const uploadResult = await FileSystem.uploadAsync(url, uploadUri, uploadOptions);
        
        response = {
          data: JSON.parse(uploadResult.body),
          status: uploadResult.status,
        };

      } else {
        // Build generic JSON payload without new file
        const payload = {
          name:        form.name,
          price:       parseFloat(form.price),
          category:    selCat,
          stock:       form.stock ? parseInt(form.stock) : 0,
          description: form.description || '',
        };

        const apiResponse = editProductId 
          ? await apiClient.put(`/products/${editProductId}`, payload)
          : await apiClient.post('/products', payload);
          
        response = apiResponse;
      }

      console.log('Response:', response.data);

      if (response.data && response.data.status === 'success') {
        if (editProductId) {
          // Update in place
          setAddedProducts(prev => 
            prev.map(p => p.id === editProductId ? response.data.data : p)
          );
        } else {
          // Add to top
          setAddedProducts(prev => [response.data.data, ...prev]);
        }

        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setForm({ name: '', price: '', description: '', stock: '', image: null, mediaType: 'image' });
          setSelCat('');
          setEditProductId(null);
        }, 2500);
      } else {
         throw new Error(response.data?.message || 'Upload failed');
      }
    } catch (err) {
      console.log('Error adding product:', err);
      console.log('Error response:', err.response?.data);
      console.log('Error status:', err.response?.status);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.errors ||
        err.message ||
        'Unknown error occurred';
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

  const handleEditClick = (product) => {
    setEditProductId(product.id);
    setForm({
      name: product.name,
      price: String(product.price),
      description: product.description || '',
      stock: product.stock ? String(product.stock) : '',
      image: product.image || null,
      mediaType: isVideoUrl(product.image) ? 'video' : 'image',
    });
    setSelCat(product.category);
    setShowProducts(false); // Switch to form view
  };

  const handleCancelEdit = () => {
    setEditProductId(null);
    setForm({ name: '', price: '', description: '', stock: '', image: null, mediaType: 'image' });
    setSelCat('');
    setShowProducts(true);
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
            {showProducts 
              ? 'Added Products' 
              : (editProductId ? 'Edit Product' : 'Add Product')
            }
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (editProductId && !showProducts) {
               // If editing and in form view, cancel edit and go to products view
               handleCancelEdit();
            } else {
               setShowProducts(!showProducts);
               if (!showProducts) {
                  // Going back to view products
                  setEditProductId(null);
                  setForm({ name: '', price: '', description: '', stock: '', image: null });
                  setSelCat('');
               }
            }
          }}
          className="px-3 py-1.5 rounded-full"
          style={{ backgroundColor: C.accent + '20' }}
        >
          <Text className="text-xs font-semibold" style={{ color: C.accent }}>
            {showProducts 
              ? 'Add New' 
              : (editProductId ? 'Cancel Edit' : `View Products (${addedProducts.length})`)
            }
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
                  <View className="flex-row items-center justify-between w-full">
                    <View className="flex-row items-center">
                      <View className="px-2 py-0.5 rounded-md mr-2" style={{ backgroundColor: C.accent + '20' }}>
                        <Text className="text-[10px] font-semibold" style={{ color: C.accent }}>{product.category}</Text>
                      </View>
                      <Text className="text-xs" style={{ color: C.muted }}>Stock: {product.stock || '0'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleEditClick(product)}>
                      <Text className="text-xs font-bold" style={{ color: C.amber }}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                {product.image && (
                  isVideoUrl(product.image) ? (
                    <Video 
                      source={{ uri: getSecureUrl(product.image) }}
                      useNativeControls
                      style={{ width: '100%', height: 160, borderRadius: 8, marginBottom: 8 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image source={{ uri: getSecureUrl(product.image) }} className="w-full h-32 rounded-lg mb-2" resizeMode="cover" />
                  )
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
          className="w-full h-32 rounded-xl mb-4 items-center justify-center overflow-hidden relative"
          style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' }}
        >
          {form.image ? (
            <>
              {form.mediaType === 'video' || isVideoUrl(form.image) ? (
                 <Video 
                   source={{ uri: getSecureUrl(form.image) }}
                   style={{ width: '100%', height: '100%' }}
                   resizeMode="cover"
                   useNativeControls
                 />
              ) : (
                 <Image source={{ uri: getSecureUrl(form.image) }} className="w-full h-full" resizeMode="cover" />
              )}
              <View className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded-md">
                 <Text className="text-white text-xs font-bold shadow-lg">Change Media</Text>
              </View>
            </>
          ) : (
            <View className="items-center">
              <View className="flex-row gap-2">
                <ImageIcon color={C.muted} size={28} />
                <VideoIcon color={C.muted} size={28} />
              </View>
              <Text className="text-xs mt-2" style={{ color: C.muted }}>Tap to upload an image or video</Text>
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
                  {editProductId ? 'Save Changes' : 'Add Product'}
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
