import React, { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useVideoPlayer, VideoView } from 'expo-video';
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
  AppState,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, Plus, Check, Image as ImageIcon, Video as VideoIcon, Search, Tag, DollarSign, Archive, FileText, Edit2, Trash2, X } from 'lucide-react-native';
import apiClient from '../../api/authService';
import { deleteProduct } from '../../api/authService';

const ProductVideo = ({ uri, isPreview }) => {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = !isPreview;
    p.play();
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        player.play();
      } else if (nextAppState.match(/inactive|background/)) {
        player.pause();
      }
    });
    return () => subscription.remove();
  }, [player]);

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      nativeControls={isPreview}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
};

const AddProductScreen = ({ C }) => {
  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    stock: '',
    point: '',
    image: null,
    mediaType: 'image',
  });
  const [selCat, setSelCat] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Local state to store products
  const [addedProducts, setAddedProducts] = useState([]);
  const [showProducts, setShowProducts] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [viewMedia, setViewMedia] = useState(null);

  // Filtering stuff
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  const appState = useRef(AppState.currentState);

  const categories = [
    'Electronics',
    'Clothing',
    'Health',
    'Food',
    'Digital',
    'Other',
  ];

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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        fetchProducts();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  const pickImage = async () => {
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
  
  const isVideoUrl = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mov') || lowerUrl.endsWith('.avi');
  };

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
      let response;

      if (form.image && form.image.startsWith('file://')) {
        let uploadUri = form.image;

        if (form.mediaType === 'video' || isVideoUrl(form.image)) {
          try {
            uploadUri = await VideoCompressor.compress(form.image, {
              compressionMethod: 'auto',
            });
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
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'image',
          mimeType: mime,
          parameters: {
            name: form.name,
            price: String(parseFloat(form.price)),
            category: selCat,
            stock: form.stock ? String(parseInt(form.stock)) : '0',
            point: form.point ? String(parseInt(form.point)) : '0',
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
        const payload = {
          name:        form.name,
          price:       parseFloat(form.price),
          category:    selCat,
          stock:       form.stock ? parseInt(form.stock) : 0,
          point:       form.point ? parseInt(form.point) : 0,
          description: form.description || '',
        };

        const apiResponse = editProductId 
          ? await apiClient.put(`/products/${editProductId}`, payload)
          : await apiClient.post('/products', payload);
          
        response = apiResponse;
      }

      if (response.data && response.data.status === 'success') {
        if (editProductId) {
          setAddedProducts(prev => 
            prev.map(p => p.id === editProductId ? response.data.data : p)
          );
        } else {
          setAddedProducts(prev => [response.data.data, ...prev]);
        }

        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setForm({ name: '', price: '', description: '', stock: '', point: '', image: null, mediaType: 'image' });
          setSelCat('');
          setEditProductId(null);
        }, 2500);
      } else {
         throw new Error(response.data?.message || 'Upload failed');
      }
    } catch (err) {
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
          className="w-full rounded-full p-10 items-center justify-center border border-green-500/20"
          style={{ shadowColor: '#10B981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 }}
        >
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: 'rgba(16,185,129,0.3)' }}
          >
            <Check color={C.green} size={48} />
          </View>
          <Text
            className="text-2xl font-black mb-2 text-center"
            style={{ color: C.text }}
          >
            {editProductId ? 'Product Updated!' : 'Product Added!'}
          </Text>
          <Text
            className="text-sm text-center font-medium"
            style={{ color: C.muted }}
          >
            {editProductId ? 'Changes saved successfully.' : 'New product is live in the catalog.'}
          </Text>
        </LinearGradient>
      </View>
    );
  }

  const handleEditClick = (product) => {
    setEditProductId(product.id);
    setForm({
      name: product.name,
      price: String(product.price),
      description: product.description || '',
      stock: product.stock ? String(product.stock) : '',
      point: product.point ? String(product.point) : '',
      image: product.image || null,
      mediaType: isVideoUrl(product.image) ? 'video' : 'image',
    });
    setSelCat(product.category);
    setShowProducts(false);
  };

  const handleCancelEdit = () => {
    setEditProductId(null);
    setForm({ name: '', price: '', description: '', stock: '', point: '', image: null, mediaType: 'image' });
    setSelCat('');
    setShowProducts(true);
  };

  const handleDeleteProduct = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              setAddedProducts(prev => prev.filter(p => p.id !== product.id));
              Alert.alert('Deleted', `"${product.name}" has been removed.`);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete product.');
            }
          },
        },
      ]
    );
  };

  const filteredProducts = addedProducts.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCat === 'All' || p.category === filterCat;
    return matchesSearch && matchesCat;
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER SECTION */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
          >
            <Package color="#fff" size={22} />
          </LinearGradient>
          <View>
            <Text className="text-xl font-bold" style={{ color: C.text }}>
              {showProducts 
                ? 'Added Products' 
                : (editProductId ? 'Edit Product' : 'Add Product')
              }
            </Text>
            <Text className="text-xs font-semibold" style={{ color: C.muted }}>
              {showProducts ? 'Manage catalog' : 'Fill product details'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (editProductId && !showProducts) {
               handleCancelEdit();
            } else {
               setShowProducts(!showProducts);
               if (!showProducts) {
                  setEditProductId(null);
                  setForm({ name: '', price: '', description: '', stock: '', point: '', image: null });
                  setSelCat('');
                  setFilterCat('All');
                  setSearchQuery('');
               }
            }
          }}
          className="px-4 py-2 rounded-xl"
          style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
        >
          <Text className="text-xs font-bold" style={{ color: C.text }}>
            {showProducts 
              ? '+ Add New' 
              : (editProductId ? 'Cancel Edit' : `View All (${addedProducts.length})`)
            }
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 1, backgroundColor: C.border, marginVertical: 16 }} />

      {/* DISPLAY ADDED PRODUCTS */}
      {showProducts ? (
        <View className="mb-4">
          {/* Filtering UI */}
          <View className="flex-row items-center rounded-xl px-4 h-12 mb-4" style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border }}>
            <Search color={C.muted} size={18} />
            <TextInput
              className="flex-1 ml-2 text-sm font-medium"
              placeholder="Search by name or description..."
              placeholderTextColor={C.muted}
              style={{ color: C.text }}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {['All', ...categories].map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setFilterCat(cat)}
                className="px-5 py-2 rounded-full mr-2"
                style={{
                  backgroundColor: filterCat === cat ? C.accent : 'transparent',
                  borderWidth: 1,
                  borderColor: filterCat === cat ? C.accent : C.border,
                }}
              >
                <Text style={{ color: filterCat === cat ? '#fff' : C.muted, fontWeight: '700', fontSize: 13 }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* List Products */}
          {filteredProducts.length === 0 ? (
            <View className="py-16 items-center justify-center mt-4 border border-dashed rounded-3xl" style={{ borderColor: C.border, borderWidth: 1 }}>
              <Archive color={C.muted} size={48} />
              <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 16, marginTop: 12 }}>No products found</Text>
              <Text style={{ color: C.muted, marginTop: 4, textAlign: 'center' }}>Try adjusting your filters or search query, or add a new product.</Text>
            </View>
          ) : (
            filteredProducts.map(product => {
              const url = getSecureUrl(product.image);
              const isVid = isVideoUrl(product.image);
              
              return (
                <View 
                  key={product.id} 
                  className="rounded-2xl p-3 mb-3 flex-row items-center"
                  style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
                >
                  {/* Thumbnail area */}
                  <TouchableOpacity 
                    onPress={() => url && setViewMedia({ url, isVid })}
                    className="w-20 h-20 rounded-xl overflow-hidden mr-3 items-center justify-center relative" 
                    style={{ backgroundColor: C.inputBg }}
                  >
                    {url ? (
                      isVid ? (
                        <ProductVideo uri={url} isPreview={false} />
                      ) : (
                        <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      )
                    ) : (
                      <Package color={C.muted} size={24} />
                    )}
                    {/* Tiny category badge on image overlay optionally */}
                    {product.category && (
                      <View className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold' }}>{product.category.toUpperCase()}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Body area */}
                  <View className="flex-1 justify-center">
                    <Text className="font-bold text-base mb-1" numberOfLines={1} style={{ color: C.text }}>{product.name}</Text>
                    <View className="flex-row items-center justify-between mb-1.5 pr-2">
                       <Text className="font-extrabold text-sm" style={{ color: C.green }}>${parseFloat(product.price).toFixed(2)}</Text>
                       <Text className="text-xs font-semibold" style={{ color: C.muted }}>Stock: <Text style={{ color: C.text }}>{product.stock || '0'}</Text></Text>
                    </View>
                    
                    {/* Action buttons area */}
                    <View className="flex-row mt-1 gap-2 border-t border-gray-500/10 pt-2 pr-2">
                      <TouchableOpacity onPress={() => handleEditClick(product)} className="flex-1 flex-row items-center justify-center py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                        <Edit2 color={C.amber} size={12} />
                        <Text className="text-xs font-bold ml-1.5" style={{ color: C.amber }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteProduct(product)} className="flex-1 flex-row items-center justify-center py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                        <Trash2 color="#EF4444" size={12} />
                        <Text className="text-xs font-bold ml-1.5" style={{ color: '#EF4444' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : (
      
      /* ADD PRODUCT FORM SECTION */
      <View
        className="rounded-3xl p-6 mb-8"
        style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        {/* Image Picker */}
        <Text className="text-sm font-bold mb-2 ml-1" style={{ color: C.text }}>Media Cover *</Text>
        <TouchableOpacity 
          onPress={pickImage}
          className="w-full h-44 rounded-2xl mb-6 items-center justify-center overflow-hidden relative border-2 border-dashed"
          style={{ backgroundColor: C.inputBg, borderColor: form.image ? 'transparent' : C.border }}
        >
          {form.image ? (
            <>
              {form.mediaType === 'video' || isVideoUrl(form.image) ? (
                 <ProductVideo uri={getSecureUrl(form.image)} isPreview={true} />
              ) : (
                 <Image source={{ uri: getSecureUrl(form.image) }} className="w-full h-full" resizeMode="cover" />
              )}
              {/* Overlay edit button */}
              <View className="absolute top-3 right-3 bg-black/60 rounded-xl px-3 py-1.5 flex-row items-center backdrop-blur-md">
                 <Edit2 color="#fff" size={12} />
                 <Text className="text-white text-xs font-bold ml-1.5">Change</Text>
              </View>
            </>
          ) : (
            <View className="items-center">
              <View className="flex-row gap-3 mb-3 bg-black/5 p-4 rounded-full">
                <ImageIcon color={C.muted} size={28} />
                <View style={{ width: 1, height: 28, backgroundColor: C.border }} />
                <VideoIcon color={C.muted} size={28} />
              </View>
              <Text className="text-sm font-semibold" style={{ color: C.text }}>Tap to upload product media</Text>
              <Text className="text-xs mt-1" style={{ color: C.muted }}>Jpg, Png, Mp4 supported</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Name */}
        <Text className="text-sm font-bold mb-2 ml-1" style={{ color: C.text }}>Product Name *</Text>
        <View className="flex-row items-center rounded-xl px-4 h-14 mb-5" style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border }}>
          <Tag color={C.muted} size={18} />
          <TextInput
            className="flex-1 ml-3 text-sm font-medium"
            style={{ color: C.text }}
            placeholder="e.g. Premium Health Kit"
            placeholderTextColor={C.muted}
            value={form.name}
            onChangeText={v => setForm(p => ({ ...p, name: v }))}
          />
        </View>

        {/* Layout Row for Price & Stock */}
        <View className="flex-row w-full gap-4 mb-5">
          <View className="flex-1">
            <Text className="text-sm font-bold mb-2 ml-1" style={{ color: C.text }}>Price (USD) *</Text>
            <View className="flex-row items-center rounded-xl px-4 h-14" style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border }}>
              <DollarSign color={C.green} size={18} />
              <TextInput
                className="flex-1 ml-2 text-sm font-bold"
                style={{ color: C.text }}
                placeholder="0.00"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                value={form.price}
                onChangeText={v => setForm(p => ({ ...p, price: v }))}
              />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold mb-2 ml-1" style={{ color: C.text }}>Stock</Text>
            <View className="flex-row items-center rounded-xl px-4 h-14" style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border }}>
              <Archive color={C.muted} size={18} />
              <TextInput
                className="flex-1 ml-3 text-sm font-medium"
                style={{ color: C.text }}
                placeholder="Qty"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                value={form.stock}
                onChangeText={v => setForm(p => ({ ...p, stock: v }))}
              />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold mb-2 ml-1" style={{ color: C.text }}>Points</Text>
            <View className="flex-row items-center rounded-xl px-4 h-14" style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border }}>
              <Tag color={C.muted} size={18} />
              <TextInput
                className="flex-1 ml-3 text-sm font-medium"
                style={{ color: C.text }}
                placeholder="Pts"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                value={form.point}
                onChangeText={v => setForm(p => ({ ...p, point: v }))}
              />
            </View>
          </View>
        </View>

        {/* Category */}
        <Text className="text-sm font-bold mb-3 ml-1" style={{ color: C.text }}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-row" contentContainerStyle={{ paddingBottom: 4 }}>
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setSelCat(c)}
              className="px-5 py-3 rounded-full mr-3 shadow-sm"
              style={{
                backgroundColor: selCat === c ? C.accent : C.card,
                borderWidth: 1,
                borderColor: selCat === c ? C.accent : C.border,
                elevation: selCat === c ? 2 : 0,
              }}
            >
              <Text
                className="text-sm font-bold tracking-wide"
                style={{ color: selCat === c ? '#fff' : C.muted }}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Description */}
        <Text className="text-sm font-bold mb-2 ml-1" style={{ color: C.text }}>Description</Text>
        <View className="flex-row rounded-xl px-4 py-3 mb-8" style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border }}>
          <FileText color={C.muted} size={18} style={{ marginTop: 2 }} />
          <TextInput
            className="flex-1 ml-3 text-sm font-medium"
            style={{ color: C.text, height: 100, textAlignVertical: 'top' }}
            placeholder="Type your product's description..."
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={4}
            value={form.description}
            onChangeText={v => setForm(p => ({ ...p, description: v }))}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className="h-14 rounded-2xl overflow-hidden shadow-lg"
          style={{ elevation: 5, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3 }}
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
                <Text className="text-white font-black text-lg mr-2 tracking-wide">
                  {editProductId ? 'SAVE CHANGES' : 'CREATE PRODUCT'}
                </Text>
                <Plus color="#fff" size={20} strokeWidth={3} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
      )}

      {/* Media Viewer Modal */}
      {viewMedia && (
        <Modal transparent animationType="fade" onRequestClose={() => setViewMedia(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setViewMedia(null)}>
              <X color="#fff" size={32} />
            </TouchableOpacity>
            
            <View style={{ width: '100%', aspectRatio: 3/4, alignItems: 'center', justifyContent: 'center' }}>
              {viewMedia.isVid ? (
                <ProductVideo uri={viewMedia.url} isPreview={true} />
              ) : (
                <Image source={{ uri: viewMedia.url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              )}
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

export default AddProductScreen;
