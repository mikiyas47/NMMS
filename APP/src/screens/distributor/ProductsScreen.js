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
  CheckCircle, Share2, ExternalLink, CreditCard, Zap, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getProducts, getUser, joinNetwork, getDistributorStatus, getMyTree } from '../../api/authService';

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
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'900' }}>{parseFloat(item.price).toLocaleString()} ETB</Text>
          </View>

          {/* Points badge */}
          {item.point ? (
            <View style={{ position:'absolute', bottom:8, right:10, backgroundColor:'rgba(0,0,0,0.6)', paddingHorizontal:8, paddingVertical:4, borderRadius:12, flexDirection:'row', alignItems:'center' }}>
              <Text style={{ color:'#F59E0B', fontSize:10, fontWeight:'700', marginRight:4 }}>★</Text>
              <Text style={{ color:'#fff', fontSize:10, fontWeight:'700' }}>{item.point} pts</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* ── Info ── */}
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => onSell(item)}
          style={{ padding: 12 }}
        >
          <Text numberOfLines={2} style={{ fontSize:12, fontWeight:'700', color:C.text, marginBottom:6, lineHeight:17 }}>
            {item.name}
          </Text>

          {/* Share Payment Link button */}
          <TouchableOpacity onPress={() => onSell(item)} style={{ borderRadius:12, overflow:'hidden' }}>
            <LinearGradient
              colors={['#4338CA', '#6366F1']}
              start={[0,0]} end={[1,0]}
              style={{ paddingVertical:9, flexDirection:'row', justifyContent:'center', alignItems:'center' }}
            >
              <Share2 color="#fff" size={12} />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:11, marginLeft:5, letterSpacing:0.5 }}>
                SHARE LINK
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Share Payment Modal ───────────────────────────────────────────────────────
const ShareModal = ({ product, distributorId, accountCount, navigation, onClose, onBuyMore, C }) => {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const [selectedLeg, setSelectedLeg] = useState(1);
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    getMyTree().then(res => setTreeData(res?.tree || null)).catch(() => {});
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 400, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  };

  const isLegEmpty = treeData && !treeData.children?.find(c => c.leg === selectedLeg);

  // Deep-link URL the customer will open (Mobile App)
  const payLink = `nmms-app://pay?distributor_id=${distributorId}&product_id=${product?.id}&leg=${selectedLeg}`;
  // Web fallback URL (React Frontend)
  const webLink = `https://nmms-ochre.vercel.app/pay?distributor_id=${distributorId}&product_id=${product?.id}&leg=${selectedLeg}`;

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
        leg: selectedLeg,
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
          <View style={{ backgroundColor:'rgba(16,185,129,0.08)', borderRadius:14, padding:14, marginBottom:16,
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

          {/* Leg Selection */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 }}>SELECT PLACEMENT LEG</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {[1, 2, 3, 4].map(leg => (
              <TouchableOpacity
                key={leg}
                onPress={() => setSelectedLeg(leg)}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                  backgroundColor: selectedLeg === leg ? '#6366F1' : C.inputBg,
                  borderWidth: 1, borderColor: selectedLeg === leg ? '#6366F1' : C.border,
                }}
              >
                <Text style={{ color: selectedLeg === leg ? '#fff' : C.text, fontWeight: '800', fontSize: 15 }}>Leg {leg}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Account Recommendation */}
          {isLegEmpty && accountCount < 4 && (
            <LinearGradient
              colors={['rgba(99,102,241,0.15)', 'rgba(99,102,241,0.05)']}
              style={{ borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Zap color="#818CF8" size={20} style={{ marginRight: 8 }} />
                <Text style={{ color: '#E0E7FF', fontSize: 15, fontWeight: '800' }}>Increase Referral Spaces!</Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
                Double, triple, or quadruple your account by purchasing more products! Each new account adds another 4 empty legs under your main account, allowing you to build a wider network and maximize earnings.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  close();
                  setTimeout(() => {
                    if (onBuyMore) onBuyMore();
                  }, 300);
                }}
                style={{ backgroundColor: '#4F46E5', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Get More Accounts (Buy Products)</Text>
              </TouchableOpacity>
            </LinearGradient>
          )}

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

  // Load current distributor id + join status
  useEffect(() => {
    getUser().then(u => {
      if (u?.distributor_id) setDistributorId(u.distributor_id);
    });
    getDistributorStatus().then(res => {
      setHasJoined(res?.has_joined ?? false);
      setAccountCount(res?.account_count ?? 0);
    }).catch(() => {});
  }, []);
  const [viewMedia, setViewMedia]     = useState(null);
  const [hasJoined, setHasJoined]     = useState(false);
  const [accountCount, setAccountCount] = useState(0);
  const [joinModal, setJoinModal]     = useState(false);
  const [joinProduct, setJoinProduct] = useState(null);
  const [joinQty, setJoinQty]         = useState(1);
  const [joining, setJoining]         = useState(false);
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

  // ── Join Network handler ───────────────────────────────────────────────────
  const handleJoinNetwork = async () => {
    if (!joinProduct) return;
    setJoining(true);
    try {
      await joinNetwork({
        product_id: joinProduct.id,
        sponsor_id: null,
        quantity: joinQty,
      });
      setJoinModal(false);
      setHasJoined(true);
      setAccountCount(prev => prev + joinQty);
      Alert.alert(
        '🎉 Welcome to the Network!',
        `You joined with ${joinQty} account${joinQty > 1 ? 's' : ''}. Your node${joinQty > 1 ? 's have' : ' has'} been placed in the tree.`,
        [{ text: 'View Tree', onPress: () => {} }, { text: 'OK' }]
      );
    } catch (e) {
      Alert.alert('Join Failed', e.message || 'Could not join the network. Please try again.');
    } finally {
      setJoining(false);
    }
  };

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
            { label:'Categories', value: categories.length - 1 },
            { label:'Total Points', value: products.reduce((sum, p) => sum + (p.point || 0), 0) },
          ].map((s,i) => (
            <View key={i} style={{ flex:1, backgroundColor:'rgba(255,255,255,0.12)', borderRadius:12, padding:10, alignItems:'center' }}>
              <Text style={{ color:'#fff', fontWeight:'900', fontSize:18 }}>{s.value}</Text>
              <Text style={{ color:'rgba(255,255,255,0.65)', fontSize:10, marginTop:2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── Join Network Banner ── */}
      {!hasJoined ? (
        <LinearGradient
          colors={['#064E3B', '#065F46', '#10B981']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 16, marginBottom: 16, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', right: -20, top: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Zap color="#FCD34D" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Activate Your MLM Account</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>Purchase a package to join the network and start earning cycles</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => { setJoinProduct(products[0] ?? null); setJoinQty(1); setJoinModal(true); }}
            style={{ marginTop: 12, backgroundColor: '#FCD34D', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
          >
            <Text style={{ color: '#1F2937', fontWeight: '800', fontSize: 13 }}>Choose Package & Activate →</Text>
          </TouchableOpacity>
        </LinearGradient>
      ) : (
        <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 16, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CheckCircle color="#10B981" size={20} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 13 }}>Network Active · {accountCount} Account{accountCount > 1 ? 's' : ''}</Text>
            <Text style={{ color: '#34D399', fontSize: 11, marginTop: 1 }}>You are placed in the MLM tree and earning cycles</Text>
          </View>
          {accountCount < 4 && (
            <TouchableOpacity
              onPress={() => { setJoinProduct(products[0] ?? null); setJoinQty(1); setJoinModal(true); }}
              style={{ backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
          accountCount={accountCount}
          navigation={navigation}
          onClose={() => setSellTarget(null)}
          onBuyMore={() => {
            navigation.navigate('CustomerPay', {
              distributor_id: distributorId,
              product_id: sellTarget?.id,
            });
          }}
          C={C}
        />
      )}

      {/* ── Join Network Modal ── */}
      <Modal transparent animationType="slide" visible={joinModal} onRequestClose={() => setJoinModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setJoinModal(false)} />
          <View style={{
            backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8,
            borderTopWidth: 1, borderColor: C.border,
          }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <LinearGradient colors={['#064E3B', '#10B981']} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Zap color="#FCD34D" size={20} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>Join the MLM Network</Text>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>Choose your package and number of accounts</Text>
              </View>
              <TouchableOpacity onPress={() => setJoinModal(false)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                <X color={C.muted} size={18} />
              </TouchableOpacity>
            </View>

            {/* Product selector */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 }}>SELECT PACKAGE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {products.map(p => {
                const active = joinProduct?.id === p.id;
                return (
                  <TouchableOpacity key={p.id} onPress={() => setJoinProduct(p)} style={{
                    width: 140, marginRight: 10, borderRadius: 16, overflow: 'hidden',
                    borderWidth: 2, borderColor: active ? '#10B981' : C.border,
                    backgroundColor: active ? 'rgba(16,185,129,0.08)' : C.surface,
                  }}>
                    <View style={{ height: 90, backgroundColor: C.inputBg }}>
                      {p.image
                        ? <Image source={{ uri: toHttps(p.image) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Package color={C.muted} size={28} /></View>
                      }
                    </View>
                    <View style={{ padding: 10 }}>
                      <Text numberOfLines={1} style={{ color: C.text, fontWeight: '700', fontSize: 11, marginBottom: 2 }}>{p.name}</Text>
                      <Text style={{ color: active ? '#10B981' : C.muted, fontSize: 10 }}>{parseFloat(p.price).toLocaleString()} ETB</Text>
                      {p.point ? <Text style={{ color: '#F59E0B', fontSize: 10, marginTop: 2 }}>★ {p.point} pts</Text> : null}
                    </View>
                    {active && (
                      <View style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle color="#fff" size={14} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Number of accounts */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 }}>
              NUMBER OF ACCOUNTS ({accountCount} / 4 used)
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {[1, 2, 3, 4].map(n => {
                const remaining = 4 - accountCount;
                const disabled = n > remaining;
                const active = joinQty === n;
                return (
                  <TouchableOpacity
                    key={n} onPress={() => !disabled && setJoinQty(n)}
                    style={{
                      flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
                      backgroundColor: active ? '#10B981' : disabled ? C.inputBg : C.surface,
                      borderWidth: 1.5, borderColor: active ? '#10B981' : C.border,
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : C.text, fontWeight: '800', fontSize: 16 }}>{n}</Text>
                    <Text style={{ color: active ? 'rgba(255,255,255,0.7)' : C.muted, fontSize: 9, marginTop: 2 }}>
                      {n === 1 ? 'Single' : n === 2 ? 'Double' : n === 3 ? 'Triple' : 'Quad'}
                    </Text>
                    <Text style={{ color: active ? 'rgba(255,255,255,0.7)' : C.muted, fontSize: 8 }}>
                      {n * 4} legs
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Summary */}
            {joinProduct && (
              <View style={{ backgroundColor: C.inputBg, borderRadius: 14, padding: 14, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>Package</Text>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 12 }}>{joinProduct.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>Accounts</Text>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 12 }}>{joinQty} × = {joinQty * 4} legs</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>Points</Text>
                  <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 12 }}>{(joinProduct.point || 0) * joinQty} pts</Text>
                </View>
              </View>
            )}

            {/* Confirm button */}
            <TouchableOpacity
              onPress={handleJoinNetwork}
              disabled={!joinProduct || joining}
              style={{
                borderRadius: 16, overflow: 'hidden',
                opacity: !joinProduct || joining ? 0.6 : 1,
              }}
            >
              <LinearGradient colors={['#064E3B', '#10B981']} start={[0, 0]} end={[1, 0]}
                style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {joining
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Zap color="#FCD34D" size={18} />
                }
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginLeft: 10 }}>
                  {joining ? 'Activating…' : `Activate ${joinQty} Account${joinQty > 1 ? 's' : ''}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
