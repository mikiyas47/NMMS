import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  AppState,
} from 'react-native';
import { ShoppingCart, Search, X, Package, Tag, Star, RefreshCw, AlertCircle, CheckCircle, Filter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getProducts } from '../../api/authService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with 16px side padding & 16px gap

// Force https so Android doesn't block http:// image URLs
const toHttps = (url) => url ? url.replace(/^http:\/\//, 'https://') : url;

// ─── Category pill colours ────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  default:  { bg: '#6366F1', light: 'rgba(99,102,241,0.12)' },
  health:   { bg: '#10B981', light: 'rgba(16,185,129,0.12)' },
  beauty:   { bg: '#EC4899', light: 'rgba(236,72,153,0.12)' },
  wellness: { bg: '#8B5CF6', light: 'rgba(139,92,246,0.12)' },
  nutrition:{ bg: '#F59E0B', light: 'rgba(245,158,11,0.12)' },
  fitness:  { bg: '#3B82F6', light: 'rgba(59,130,246,0.12)' },
};

const getCategoryColor = (category = '') => {
  const key = category.toLowerCase();
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
};

// ─── Video Player Components ──────────────────────────────────────────────────
const ProductVideo = ({ uri }) => {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = true;
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
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
};

const ModalVideo = ({ uri }) => {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = false;
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
      nativeControls={true}
    />
  );
};

// ─── Single Product Card ──────────────────────────────────────────────────────
const ProductCard = ({ item, onSell, C }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const catColor  = getCategoryColor(item.category);
  const imageUri  = toHttps(item.image);
  const isVideo   =
    imageUri &&
    (imageUri.endsWith('.mp4') ||
     imageUri.endsWith('.mov') ||
     imageUri.endsWith('.avi') ||
     imageUri.endsWith('.mkv'));

  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 30 }).start();
  const inStock = (item.stock ?? 0) > 0;

  return (
    <Animated.View style={{ transform:[{ scale: scaleAnim }], width: CARD_WIDTH, marginBottom: 14 }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => inStock && onSell(item)}
        style={{
          borderRadius: 22, overflow: 'hidden',
          backgroundColor: C.surface,
          elevation: 8, shadowColor: catColor.bg,
          shadowOpacity: 0.18, shadowRadius: 16,
          shadowOffset: { width: 0, height: 5 },
          borderWidth: 1, borderColor: C.border,
        }}
      >
        {/* ── Image Frame 3:4 ── */}
        <View style={{ width: '100%', aspectRatio: 3/4, backgroundColor: C.inputBg }}>
          {imageUri && !isVideo ? (
            <Image source={{ uri: imageUri }} style={{ width:'100%', height:'100%' }} resizeMode="cover" />
          ) : imageUri && isVideo ? (
            <ProductVideo uri={imageUri} />
          ) : (
            <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:catColor.bg+'18' }}>
              <Package color={catColor.bg} size={44} />
            </View>
          )}

          {/* Category badge */}
          {item.category ? (
            <View style={{ position:'absolute', top:10, left:10, paddingHorizontal:9, paddingVertical:4, borderRadius:20, backgroundColor:catColor.bg }}>
              <Text style={{ color:'#fff', fontSize:9, fontWeight:'700', letterSpacing:0.5 }}>{item.category.toUpperCase()}</Text>
            </View>
          ) : null}

          {/* Gradient bottom fade */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.45)']}
            style={{ position:'absolute', bottom:0, left:0, right:0, height:50 }}
          />

          {/* Price on image */}
          <View style={{ position:'absolute', bottom:8, left:10 }}>
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'900' }}>${parseFloat(item.price).toFixed(2)}</Text>
          </View>

          {/* Out-of-stock overlay */}
          {!inStock && (
            <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.6)', alignItems:'center', justifyContent:'center' }}>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:12, letterSpacing:1 }}>OUT OF STOCK</Text>
            </View>
          )}
        </View>

        {/* ── Info ── */}
        <View style={{ padding: 12 }}>
          <Text numberOfLines={2} style={{ fontSize:12, fontWeight:'700', color:C.text, marginBottom:6, lineHeight:17 }}>
            {item.name}
          </Text>

          {/* Stock indicator */}
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
            <View style={{ width:6, height:6, borderRadius:3, backgroundColor: inStock ? '#10B981' : '#EF4444', marginRight:5 }} />
            <Text style={{ fontSize:10, color:C.muted }}>{inStock ? `${item.stock} in stock` : 'No stock'}</Text>
          </View>

          {/* Sell button */}
          <TouchableOpacity onPress={() => inStock && onSell(item)} disabled={!inStock} style={{ borderRadius:12, overflow:'hidden' }}>
            <LinearGradient
              colors={inStock ? [catColor.bg, catColor.bg+'BB'] : ['#9CA3AF','#9CA3AF']}
              start={[0,0]} end={[1,0]}
              style={{ paddingVertical:9, flexDirection:'row', justifyContent:'center', alignItems:'center' }}
            >
              <ShoppingCart color="#fff" size={12} />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:11, marginLeft:5, letterSpacing:0.5 }}>
                {inStock ? 'SELL NOW' : 'UNAVAILABLE'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Sell Confirmation Modal ──────────────────────────────────────────────────
const SellModal = ({ product, onClose, onConfirm, C }) => {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [qty, setQty] = useState(1);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 400, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  };

  const maxQty = product?.stock ?? 1;
  const total  = (parseFloat(product?.price ?? 0) * qty).toFixed(2);
  const catColor = getCategoryColor(product?.category);

  return (
    <Modal transparent animationType="none" onRequestClose={close}>
      {/* Backdrop */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'flex-end',
          opacity: fadeAnim,
        }}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />

        {/* Sheet */}
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            backgroundColor: C.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingBottom: 36,
            paddingTop: 8,
            borderTopWidth: 1,
            borderColor: C.border,
          }}
        >
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <ShoppingCart color="#fff" size={20} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>Confirm Sale</Text>
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>Review details before confirming</Text>
            </View>
            <TouchableOpacity onPress={close} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' }}>
              <X color={C.muted} size={18} />
            </TouchableOpacity>
          </View>

          {/* Product summary */}
          <View style={{ flexDirection: 'row', backgroundColor: C.inputBg, borderRadius: 16, padding: 14, marginBottom: 18, alignItems: 'center' }}>
            <View style={{ width: 62, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: C.border, marginRight: 14 }}>
              {product?.image ? (
                (() => {
                  const uri = toHttps(product.image);
                  const isVid = uri.endsWith('.mp4') || uri.endsWith('.mov') || uri.endsWith('.avi') || uri.endsWith('.mkv');
                  return isVid ? (
                    <ModalVideo uri={uri} />
                  ) : (
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  );
                })()
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Package color={C.muted} size={24} />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 5 }} numberOfLines={2}>{product?.name}</Text>
              {product?.category ? (
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: catColor.light, marginBottom: 6 }}>
                  <Text style={{ color: catColor.bg, fontSize: 10, fontWeight: '700' }}>{product.category}</Text>
                </View>
              ) : null}
              <Text style={{ fontSize: 12, color: C.muted }}>Unit price: <Text style={{ color: C.accent, fontWeight: '700' }}>${parseFloat(product?.price ?? 0).toFixed(2)}</Text></Text>
            </View>
          </View>

          {/* Quantity selector */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 10 }}>Quantity</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => setQty(q => Math.max(1, q - 1))}
              style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
            >
              <Text style={{ fontSize: 22, color: C.text, fontWeight: '300' }}>−</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, width: 70, textAlign: 'center' }}>{qty}</Text>
            <TouchableOpacity
              onPress={() => setQty(q => Math.min(maxQty, q + 1))}
              style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
            >
              <Text style={{ fontSize: 22, color: C.text, fontWeight: '300' }}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Total */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
            <Text style={{ fontSize: 14, color: C.muted, fontWeight: '600' }}>Total Amount</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#6366F1' }}>${total}</Text>
          </View>

          {/* Confirm button */}
          <TouchableOpacity onPress={() => onConfirm(product, qty)} style={{ borderRadius: 16, overflow: 'hidden' }}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} start={[0, 0]} end={[1, 0]} style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
              <CheckCircle color="#fff" size={18} />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginLeft: 8, letterSpacing: 0.5 }}>Confirm Sale</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Main ProductsScreen ──────────────────────────────────────────────────────
const ProductsScreen = ({ C }) => {
  const [products, setProducts]       = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sellTarget, setSellTarget]   = useState(null);
  const appState = useRef(AppState.currentState);

  // ── Fetch from API ──────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const res = await getProducts();
      const data = res?.data ?? [];
      setProducts(data);
      setFiltered(data);
    } catch (err) {
      setError('Could not load products. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── AppState listener: refetch when app becomes active ──────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App just came to foreground — user may have been offline
        fetchProducts(false);            // silently re-fetch product list
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [fetchProducts]);

  useEffect(() => { fetchProducts(); }, []);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  useEffect(() => {
    let result = products;
    if (activeCategory !== 'All') {
      result = result.filter(p => p.category?.toLowerCase() === activeCategory.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeCategory, products]);

  // ── Sell handler ────────────────────────────────────────────────────────────
  const handleSellConfirm = (product, qty) => {
    setSellTarget(null);
    Alert.alert(
      '✅ Sale Confirmed!',
      `${qty}x ${product.name}\nTotal: $${(parseFloat(product.price) * qty).toFixed(2)}`,
      [{ text: 'Great!', style: 'default' }]
    );
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={{ marginBottom: 4 }}>
      {/* ── Hero Banner ── */}
      <LinearGradient
        colors={['#312E81','#4338CA','#6366F1']}
        start={{ x:0, y:0 }} end={{ x:1, y:1 }}
        style={{ borderRadius:24, padding:20, marginBottom:16, overflow:'hidden' }}
      >
        <View style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,255,255,0.06)' }} />
        <View style={{ position:'absolute', left:60, bottom:-20, width:80, height:80, borderRadius:40, backgroundColor:'rgba(255,255,255,0.04)' }} />
        <Text style={{ color:'rgba(255,255,255,0.65)', fontSize:12, fontWeight:'600', letterSpacing:1 }}>PRODUCT CATALOG</Text>
        <Text style={{ color:'#fff', fontSize:24, fontWeight:'800', marginTop:4, marginBottom:14 }}>
          {products.length} item{products.length !== 1 ? 's' : ''} available
        </Text>
        <View style={{ flexDirection:'row', gap:10 }}>
          {[
            { label:'In Stock', value: products.filter(p=>(p.stock??0)>0).length },
            { label:'Categories', value: categories.length - 1 },
          ].map((s,i) => (
            <View key={i} style={{ flex:1, backgroundColor:'rgba(255,255,255,0.12)', borderRadius:12, padding:10, alignItems:'center' }}>
              <Text style={{ color:'#fff', fontWeight:'900', fontSize:18 }}>{s.value}</Text>
              <Text style={{ color:'rgba(255,255,255,0.65)', fontSize:10, marginTop:2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Search bar */}
      <View style={{
        flexDirection:'row', alignItems:'center',
        backgroundColor: C.inputBg, borderRadius:16, paddingHorizontal:14, marginBottom:14,
        borderWidth:1, borderColor: search ? '#6366F1' : C.border, height:50,
      }}>
        <Search color={search ? '#6366F1' : C.muted} size={18} />
        <TextInput
          style={{ flex:1, marginLeft:10, fontSize:14, color:C.text }}
          placeholder="Search products..."
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}><X color={C.muted} size={16} /></TouchableOpacity>
        ) : null}
      </View>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:14 }} contentContainerStyle={{ paddingRight:4 }}>
        {categories.map(cat => {
          const isActive = activeCategory === cat;
          const cc = getCategoryColor(cat);
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={{
                paddingHorizontal:16, paddingVertical:8, borderRadius:20, marginRight:8,
                backgroundColor: isActive ? cc.bg : C.inputBg,
                borderWidth:1, borderColor: isActive ? cc.bg : C.border,
              }}
            >
              <Text style={{ fontSize:12, fontWeight:'700', color: isActive ? '#fff' : C.muted }}>
                {cat === 'All' ? '🛍 All' : cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!loading && (
        <Text style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        {renderHeader()}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={{ color: C.muted, marginTop: 14, fontSize: 14 }}>Loading products...</Text>
        </View>
      </View>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={{ flex: 1 }}>
        {renderHeader()}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}>
          <LinearGradient colors={['rgba(239,68,68,0.1)', 'rgba(239,68,68,0.04)']} style={{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <AlertCircle color="#EF4444" size={38} />
          </LinearGradient>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8, textAlign: 'center' }}>Could not load products</Text>
          <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>{error}</Text>
          <TouchableOpacity onPress={() => fetchProducts()} style={{ borderRadius: 14, overflow: 'hidden' }}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} start={[0, 0]} end={[1, 0]} style={{ paddingVertical: 12, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center' }}>
              <RefreshCw color="#fff" size={16} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 8 }}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
      <LinearGradient colors={['rgba(99,102,241,0.1)', 'rgba(99,102,241,0.04)']} style={{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Package color="#6366F1" size={38} />
      </LinearGradient>
      <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8, textAlign: 'center' }}>
        {search || activeCategory !== 'All' ? 'No Matches' : 'No Products Yet'}
      </Text>
      <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 }}>
        {search || activeCategory !== 'All'
          ? 'Try different search terms or a different category.'
          : 'The admin has not added any products yet. Check back soon!'}
      </Text>
      {(search || activeCategory !== 'All') && (
        <TouchableOpacity
          onPress={() => { setSearch(''); setActiveCategory('All'); }}
          style={{ marginTop: 18, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)' }}
        >
          <Text style={{ color: '#6366F1', fontWeight: '700', fontSize: 13 }}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Main list ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchProducts(false); }}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        renderItem={({ item }) => (
          <ProductCard item={item} onSell={setSellTarget} C={C} />
        )}
      />

      {/* Sell Modal */}
      {sellTarget && (
        <SellModal
          product={sellTarget}
          onClose={() => setSellTarget(null)}
          onConfirm={handleSellConfirm}
          C={C}
        />
      )}
    </View>
  );
};

export default ProductsScreen;
