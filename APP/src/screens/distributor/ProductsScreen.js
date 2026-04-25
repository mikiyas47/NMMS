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
  Share,
} from 'react-native';
import { ShoppingCart, Search, X, Package, RefreshCw, AlertCircle,
  CheckCircle, Share2, ExternalLink, CreditCard } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getProducts, getUser } from '../../api/authService';

const API_BASE = 'https://nmms-backend.onrender.com';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with 16px side padding & 16px gap

// Force https so Android doesn't block http:// image URLs
const toHttps = (url) => {
  if (!url) return null;
  let secure = url.replace(/^http:\/\//, 'https://');
  
  // Validate that it's a proper URL
  try {
    new URL(secure);
    return secure;
  } catch {
    console.error('Invalid URL:', secure);
    return null;
  }
};

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
  const [error, setError] = useState(null);
  
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

  if (error) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#EF4444', fontSize: 12 }}>Video unavailable</Text>
      </View>
    );
  }

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
      onError={(e) => {
        console.error('Video error:', e);
        setError(e);
      }}
    />
  );
};

const ModalVideo = ({ uri }) => {
  const [error, setError] = useState(null);
  
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

  if (error) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#EF4444', fontSize: 14 }}>Video failed to load</Text>
      </View>
    );
  }

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      nativeControls={true}
      onError={(e) => {
        console.error('Modal video error:', e);
        setError(e);
      }}
    />
  );
};

// ─── Single Product Card ──────────────────────────────────────────────────────
const ProductCard = ({ item, onSell, onViewMedia, C }) => {
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
      <View
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
        <TouchableOpacity 
          activeOpacity={0.9}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => onViewMedia(item)}
          style={{ width: '100%', aspectRatio: 3/4, backgroundColor: C.inputBg }}
        >
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
        </TouchableOpacity>

        {/* ── Info ── */}
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => inStock && onSell(item)}
          style={{ padding: 12 }}
        >
          <Text numberOfLines={2} style={{ fontSize:12, fontWeight:'700', color:C.text, marginBottom:6, lineHeight:17 }}>
            {item.name}
          </Text>

          {/* Stock indicator */}
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
            <View style={{ width:6, height:6, borderRadius:3, backgroundColor: inStock ? '#10B981' : '#EF4444', marginRight:5 }} />
            <Text style={{ fontSize:10, color:C.muted }}>{inStock ? `${item.stock} in stock` : 'No stock'}</Text>
          </View>

          {/* Share Payment Link button */}
          <TouchableOpacity onPress={() => inStock && onSell(item)} disabled={!inStock} style={{ borderRadius:12, overflow:'hidden' }}>
            <LinearGradient
              colors={inStock ? ['#4338CA', '#6366F1'] : ['#9CA3AF','#9CA3AF']}
              start={[0,0]} end={[1,0]}
              style={{ paddingVertical:9, flexDirection:'row', justifyContent:'center', alignItems:'center' }}
            >
              <Share2 color="#fff" size={12} />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:11, marginLeft:5, letterSpacing:0.5 }}>
                {inStock ? 'SHARE LINK' : 'UNAVAILABLE'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Share Payment Modal ───────────────────────────────────────────────────────
const ShareModal = ({ product, distributorId, navigation, onClose, C }) => {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

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

  // Deep-link URL the customer will open (Mobile App)
  const payLink = `nmms-app://pay?distributor_id=${distributorId}&product_id=${product?.id}`;
  // Web fallback URL (React Frontend)
  const webLink = `https://nmms-ochre.vercel.app/pay?distributor_id=${distributorId}&product_id=${product?.id}`;

  const handleShareLink = async () => {
    try {
      await Share.share({
        title: `Buy ${product?.name}`,
        message:
          `🛒 *${product?.name}*\n` +
          `💰 Price: ETB ${parseFloat(product?.price ?? 0).toFixed(2)}\n\n` +
          `📱 Pay securely via the NMMS app:\n${payLink}\n\n` +
          `🌐 Or open in browser:\n${webLink}`,
      });
    } catch (e) {
      Alert.alert('Share failed', e.message);
    }
  };

  const handleOpenDirect = () => {
    close();
    // Open CustomerPayScreen directly (face-to-face with customer)
    setTimeout(() => {
      navigation.navigate('CustomerPay', {
        distributor_id: distributorId,
        product_id: product?.id,
      });
    }, 300);
  };

  const catColor = getCategoryColor(product?.category);

  return (
    <Modal transparent animationType="none" onRequestClose={close}>
      <Animated.View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.65)', justifyContent:'flex-end', opacity: fadeAnim }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
        <Animated.View style={{
          transform: [{ translateY: slideAnim }],
          backgroundColor: C.card,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8,
          borderTopWidth: 1, borderColor: C.border,
        }}>
          <View style={{ width:40, height:4, borderRadius:2, backgroundColor:C.border, alignSelf:'center', marginBottom:20 }} />

          {/* Header */}
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:20 }}>
            <LinearGradient colors={['#4338CA','#6366F1']} style={{ width:44, height:44, borderRadius:14, alignItems:'center', justifyContent:'center', marginRight:12 }}>
              <Share2 color="#fff" size={20} />
            </LinearGradient>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:18, fontWeight:'800', color:C.text }}>Send Payment Link</Text>
              <Text style={{ fontSize:12, color:C.muted, marginTop:1 }}>Customer pays directly — you earn commission</Text>
            </View>
            <TouchableOpacity onPress={close} style={{ width:34, height:34, borderRadius:10, backgroundColor:C.inputBg, alignItems:'center', justifyContent:'center' }}>
              <X color={C.muted} size={18} />
            </TouchableOpacity>
          </View>

          {/* Product card */}
          <View style={{ flexDirection:'row', backgroundColor:C.inputBg, borderRadius:16, padding:14, marginBottom:20, alignItems:'center' }}>
            <View style={{ width:54, height:68, borderRadius:12, overflow:'hidden', backgroundColor:C.border, marginRight:14 }}>
              {product?.image
                ? <Image source={{ uri: toHttps(product.image) }} style={{ width:'100%', height:'100%' }} resizeMode="cover" />
                : <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Package color={C.muted} size={22} /></View>}
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:15, fontWeight:'700', color:C.text, marginBottom:4 }} numberOfLines={2}>{product?.name}</Text>
              <View style={{ alignSelf:'flex-start', paddingHorizontal:8, paddingVertical:2, borderRadius:20, backgroundColor:catColor.light, marginBottom:6 }}>
                <Text style={{ color:catColor.bg, fontSize:10, fontWeight:'700' }}>{product?.category}</Text>
              </View>
              <Text style={{ fontSize:13, color:'#6366F1', fontWeight:'800' }}>ETB {parseFloat(product?.price ?? 0).toFixed(2)}</Text>
            </View>
          </View>

          {/* Commission preview */}
          <View style={{ backgroundColor:'rgba(16,185,129,0.08)', borderRadius:14, padding:14, marginBottom:20,
            borderWidth:1, borderColor:'rgba(16,185,129,0.2)', flexDirection:'row', alignItems:'center' }}>
            <View style={{ width:36, height:36, borderRadius:10, backgroundColor:'rgba(16,185,129,0.15)',
              alignItems:'center', justifyContent:'center', marginRight:12 }}>
              <CreditCard color="#10B981" size={18} />
            </View>
            <View>
              <Text style={{ color:C.muted, fontSize:11 }}>Your commission (10%)</Text>
              <Text style={{ color:'#10B981', fontWeight:'900', fontSize:17 }}>
                ETB {(parseFloat(product?.price ?? 0) * 0.10).toFixed(2)}
              </Text>
            </View>
            <View style={{ flex:1 }} />
            <Text style={{ color:C.muted, fontSize:10, textAlign:'right' }}>Credited{`\n`}automatically</Text>
          </View>

          {/* Action buttons */}
          <TouchableOpacity onPress={handleShareLink} style={{ borderRadius:16, overflow:'hidden', marginBottom:12 }}>
            <LinearGradient colors={['#4338CA','#6366F1']} start={[0,0]} end={[1,0]}
              style={{ paddingVertical:16, flexDirection:'row', alignItems:'center', justifyContent:'center' }}>
              <Share2 color="#fff" size={18} />
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:15, marginLeft:10 }}>Share Payment Link</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleOpenDirect}
            style={{ borderRadius:16, paddingVertical:15, flexDirection:'row', alignItems:'center',
              justifyContent:'center', backgroundColor:C.inputBg, borderWidth:1, borderColor:C.border }}>
            <ExternalLink color={C.accent} size={18} />
            <Text style={{ color:C.text, fontWeight:'700', fontSize:15, marginLeft:10 }}>Open Checkout Now</Text>
          </TouchableOpacity>

          <Text style={{ color:C.muted, fontSize:11, textAlign:'center', marginTop:14, lineHeight:16 }}>
            🔒 Price is locked by the system.{`\n`}You cannot modify it.
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Main ProductsScreen ──────────────────────────────────────────────────────
const ProductsScreen = ({ C, navigation }) => {
  const [products, setProducts]       = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sellTarget, setSellTarget]   = useState(null);
  const [distributorId, setDistributorId] = useState(null);

  // Load current distributor id
  useEffect(() => {
    getUser().then(u => {
      if (u?.distributor_id) setDistributorId(u.distributor_id);
    });
  }, []);
  const [viewMedia, setViewMedia]     = useState(null);
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

  // ── Sell handler — now opens ShareModal instead of fake alert ───────────────

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
          <ProductCard item={item} onSell={setSellTarget} onViewMedia={setViewMedia} C={C} />
        )}
      />

      {/* Share Payment Modal */}
      {sellTarget && (
        <ShareModal
          product={sellTarget}
          distributorId={distributorId}
          navigation={navigation}
          onClose={() => setSellTarget(null)}
          C={C}
        />
      )}

      {/* Media Viewer Modal */}
      {viewMedia && (
        <Modal transparent animationType="fade" onRequestClose={() => setViewMedia(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setViewMedia(null)}>
              <X color="#fff" size={32} />
            </TouchableOpacity>
            
            <View style={{ width: width, height: width * 1.5, alignItems: 'center', justifyContent: 'center' }}>
              {(() => {
                const uri = toHttps(viewMedia.image);
                if (!uri) return <Package color="rgba(255,255,255,0.2)" size={64} />;
                const isVid = uri.endsWith('.mp4') || uri.endsWith('.mov') || uri.endsWith('.avi') || uri.endsWith('.mkv');
                if (isVid) return <ModalVideo uri={uri} />;
                return <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
              })()}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default ProductsScreen;
