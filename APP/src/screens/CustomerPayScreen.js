/**
 * CustomerPayScreen.js
 * ─────────────────────────────────────────────────────────────────────────────
 * INDEPENDENT page — accessible via a shareable deep-link:
 *   nmmsapp://pay?distributor_id=5&product_id=3
 *
 * Flow:
 *   1. Customer arrives (no login needed)
 *   2. Selects product (or product pre-selected via param)
 *   3. Fills name / email / phone
 *   4. Backend initiates payment → returns Chapa checkout URL
 *   5. WebView opens Chapa page
 *   6. App polls /verify until confirmed
 *   7. Success / failure screen shown
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, Alert, Image, Dimensions,
  Animated, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShoppingBag, User, Mail, Phone, ChevronDown,
  CheckCircle, XCircle, ArrowLeft, CreditCard,
  Shield, Lock, Package, Zap,
} from 'lucide-react-native';
import { getProducts, initiatePayment, verifyPayment } from '../api/authService';

const { width, height } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toHttps = (url) => url ? url.replace(/^http:\/\//, 'https://') : null;

const ACCENT   = '#6366F1';
const SUCCESS  = '#10B981';
const ERROR    = '#EF4444';
const DARK_BG  = '#0A0F1E';
const SURFACE  = '#111827';
const BORDER   = 'rgba(255,255,255,0.08)';
const TEXT      = '#F9FAFB';
const MUTED    = 'rgba(255,255,255,0.45)';

// ─── Animated Input ───────────────────────────────────────────────────────────
const FloatingInput = ({ label, value, onChangeText, keyboardType = 'default',
  icon: Icon, autoCapitalize = 'words', required = false }) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BORDER, ACCENT],
  });

  return (
    <Animated.View style={{
      borderRadius: 16, borderWidth: 1.5, borderColor,
      backgroundColor: 'rgba(255,255,255,0.04)',
      marginBottom: 14, overflow: 'hidden',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
        <Icon color={focused ? ACCENT : MUTED} size={18} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: focused ? ACCENT : MUTED, fontWeight: '700',
            letterSpacing: 0.8, marginBottom: 2 }}>
            {label.toUpperCase()}{required ? ' *' : ''}
          </Text>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            style={{ fontSize: 15, color: TEXT, fontWeight: '600', padding: 0 }}
            placeholderTextColor={MUTED}
          />
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Product Picker ───────────────────────────────────────────────────────────
const ProductPicker = ({ products, selected, onSelect }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          borderRadius: 16, borderWidth: 1.5, borderColor: selected ? ACCENT : BORDER,
          backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 14,
          paddingHorizontal: 16, paddingVertical: 14,
          flexDirection: 'row', alignItems: 'center',
        }}
      >
        <Package color={selected ? ACCENT : MUTED} size={18} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: selected ? ACCENT : MUTED, fontWeight: '700',
            letterSpacing: 0.8, marginBottom: 2 }}>
            PRODUCT *
          </Text>
          <Text style={{ fontSize: 15, color: selected ? TEXT : MUTED, fontWeight: '600' }}>
            {selected ? selected.name : 'Select a product…'}
          </Text>
        </View>
        {selected && (
          <Text style={{ color: ACCENT, fontWeight: '800', fontSize: 15 }}>
            ETB {parseFloat(selected.price).toFixed(2)}
          </Text>
        )}
        <ChevronDown color={MUTED} size={16} style={{ marginLeft: 8 }} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View style={{ backgroundColor: SURFACE, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            maxHeight: height * 0.65, borderTopWidth: 1, borderColor: BORDER }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER,
              alignSelf: 'center', marginVertical: 14 }} />
            <Text style={{ color: TEXT, fontSize: 18, fontWeight: '800', paddingHorizontal: 20, marginBottom: 12 }}>
              Choose Product
            </Text>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
              {products.filter(p => (p.stock ?? 0) > 0).map(product => (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => { onSelect(product); setOpen(false); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: 14,
                    borderRadius: 16, marginBottom: 10,
                    backgroundColor: selected?.id === product.id
                      ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: selected?.id === product.id ? ACCENT : BORDER,
                  }}
                >
                  {product.image ? (
                    <Image source={{ uri: toHttps(product.image) }}
                      style={{ width: 50, height: 60, borderRadius: 10, marginRight: 14 }}
                      resizeMode="cover" />
                  ) : (
                    <View style={{ width: 50, height: 60, borderRadius: 10, marginRight: 14,
                      backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Package color={ACCENT} size={22} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: TEXT, fontWeight: '700', fontSize: 14, marginBottom: 4 }}
                      numberOfLines={2}>{product.name}</Text>
                    <Text style={{ color: MUTED, fontSize: 12 }}>{product.category} · {product.stock} in stock</Text>
                  </View>
                  <Text style={{ color: ACCENT, fontWeight: '900', fontSize: 15, marginLeft: 8 }}>
                    ETB {parseFloat(product.price).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── Result Screen ────────────────────────────────────────────────────────────
const ResultScreen = ({ status, txRef, amount, product, customerName, customerEmail, onDone }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 12 }).start();
  }, []);

  const isSuccess = status === 'success';
  return (
    <LinearGradient
      colors={isSuccess ? ['#064E3B', '#065F46', DARK_BG] : ['#450A0A', '#7F1D1D', DARK_BG]}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center', width: '100%' }}>
        <LinearGradient
          colors={isSuccess ? [SUCCESS, '#34D399'] : [ERROR, '#F87171']}
          style={{ width: 100, height: 100, borderRadius: 50,
            alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
        >
          {isSuccess
            ? <CheckCircle color="#fff" size={52} />
            : <XCircle color="#fff" size={52} />}
        </LinearGradient>

        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
          {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
          {isSuccess
            ? `Your order for ${product} has been confirmed.\nA receipt has been sent to your email.`
            : 'Your payment could not be processed.\nPlease try again or use a different method.'}
        </Text>

        {isSuccess && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20,
            width: '100%', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <Row label="Customer Name" value={customerName} />
            <Row label="Customer Email" value={customerEmail} />
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 }} />
            <Row label="Amount Paid" value={`ETB ${parseFloat(amount).toFixed(2)}`} accent={SUCCESS} />
            <Row label="Transaction Ref" value={txRef} />
            <Row label="Status" value="Verified ✓" accent={SUCCESS} last />
          </View>
        )}

        <TouchableOpacity onPress={onDone} style={{ borderRadius: 16, overflow: 'hidden', width: '100%' }}>
          <LinearGradient
            colors={isSuccess ? [SUCCESS, '#059669'] : [ACCENT, '#8B5CF6']}
            start={[0, 0]} end={[1, 0]}
            style={{ paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
              {isSuccess ? 'New Checkout' : 'Try Again'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

const Row = ({ label, value, accent, last }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: last ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{label}</Text>
    <Text style={{ color: accent ?? TEXT, fontWeight: '700', fontSize: 13, maxWidth: '60%', textAlign: 'right' }}
      numberOfLines={1}>{value}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CustomerPayScreen = ({ route, navigation }) => {
  // Params can come from deep-link or from distributor sharing a link
  const { distributor_id, product_id: preSelectedProductId, leg } = route?.params ?? {};

  const [products, setProducts]         = useState([]);
  const [selectedProduct, setSelected]  = useState(null);
  const [quantity, setQuantity]         = useState(1);
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [phone, setPhone]               = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting]     = useState(false);

  // Payment states
  const [paymentUrl, setPaymentUrl]     = useState(null);   // Chapa checkout URL
  const [txRef, setTxRef]               = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'success' | 'failed'
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [polling, setPolling]           = useState(false);
  const pollRef                         = useRef(null);

  // Load products on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getProducts();
        const list = res?.data ?? [];
        setProducts(list);
        if (preSelectedProductId) {
          const found = list.find(p => String(p.id) === String(preSelectedProductId));
          if (found) setSelected(found);
        }
      } catch (e) {
        Alert.alert('Error', 'Could not load products. Please check your connection.');
      } finally {
        setLoadingProducts(false);
      }
    })();
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Poll backend for payment status ─────────────────────────────────────────
  const startPolling = useCallback((ref) => {
    setPolling(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await verifyPayment(ref);
        if (res.status === 'success') {
          clearInterval(pollRef.current);
          setPolling(false);
          setPaymentUrl(null);
          setPaymentStatus('success');
        } else if (res.status === 'failed' || res.status === 'rejected') {
          clearInterval(pollRef.current);
          setPolling(false);
          setPaymentUrl(null);
          setPaymentStatus('failed');
        }
      } catch {}
      // After 5 min stop polling
      if (attempts > 60) {
        clearInterval(pollRef.current);
        setPolling(false);
      }
    }, 5000); // every 5 seconds
  }, []);

  // ── Submit: initiate Chapa payment ──────────────────────────────────────────
  const handlePay = async () => {
    if (!selectedProduct) return Alert.alert('Select product', 'Please choose a product first.');
    if (!name.trim())     return Alert.alert('Required', 'Please enter your full name.');
    if (!email.trim())    return Alert.alert('Required', 'Please enter your email address.');

    if (!distributor_id) {
      return Alert.alert('Invalid Link', 'This payment link is missing distributor information. Please ask your distributor to share a valid link.');
    }

    setSubmitting(true);
    try {
      const res = await initiatePayment({
        product_id:     selectedProduct.id,
        distributor_id: distributor_id,
        quantity:       quantity,
        customer_name:  name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || undefined,
        leg:            leg,
      });

      if (res.payment_url && res.tx_ref) {
        setTxRef(res.tx_ref);
        setPaymentAmount(res.amount);
        setPaymentUrl(res.payment_url);
        startPolling(res.tx_ref);
      } else {
        Alert.alert('Payment Error', res.message ?? 'Could not create payment link.');
      }
    } catch (err) {
      const msg = err?.message ?? 'Payment initiation failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const total = selectedProduct
    ? (parseFloat(selectedProduct.price) * quantity).toFixed(2)
    : '0.00';

  // ── Result screen ────────────────────────────────────────────────────────────
  if (paymentStatus) {
    return (
      <ResultScreen
        status={paymentStatus}
        txRef={txRef}
        amount={paymentAmount}
        product={selectedProduct?.name ?? ''}
        customerName={name}
        customerEmail={email}
        onDone={() => {
          // Reset the form so they can do another checkout immediately
          setPaymentStatus(null);
          setTxRef(null);
          setPaymentUrl(null);
          setName(''); setEmail(''); setPhone('');
          setSelected(null); setQuantity(1);
        }}
      />
    );
  }

  // ── Chapa WebView ─────────────────────────────────────────────────────────
  if (paymentUrl) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
          paddingVertical: 12, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER }}>
          <TouchableOpacity
            onPress={() => {
              clearInterval(pollRef.current);
              setPaymentUrl(null);
              setPolling(false);
            }}
            style={{ marginRight: 12 }}
          >
            <ArrowLeft color={TEXT} size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: TEXT, fontWeight: '800', fontSize: 15 }}>Secure Checkout</Text>
            <Text style={{ color: MUTED, fontSize: 11 }}>Powered by Chapa · ETB {total}</Text>
          </View>
          <Lock color={SUCCESS} size={18} />
          {polling && <ActivityIndicator color={ACCENT} size="small" style={{ marginLeft: 10 }} />}
        </View>
        <WebView
          source={{ uri: paymentUrl }}
          style={{ flex: 1 }}
          onNavigationStateChange={(state) => {
            // Detect return URL pattern
            if (state.url && state.url.includes('/api/payments/return')) {
              // Immediately show the receipt! No loading screens.
              setPaymentUrl(null);
              setPaymentStatus('success');
              setPolling(false);
              clearInterval(pollRef.current);
            }
          }}
        />
      </SafeAreaView>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loadingProducts) {
    return (
      <LinearGradient colors={[DARK_BG, SURFACE]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ color: MUTED, marginTop: 14, fontSize: 14 }}>Loading products…</Text>
      </LinearGradient>
    );
  }

  // ── Main Form ─────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={[DARK_BG, SURFACE, DARK_BG]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

          {/* Header */}
          <LinearGradient
            colors={['#312E81', '#4338CA', ACCENT]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: 20, paddingBottom: 28, paddingHorizontal: 24, overflow: 'hidden' }}
          >
            {/* Decorative circles */}
            <View style={{ position: 'absolute', right: -30, top: -30, width: 130, height: 130,
              borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <View style={{ position: 'absolute', left: -20, bottom: -40, width: 90, height: 90,
              borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.04)' }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center',
                  justifyContent: 'center', marginRight: 14, borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.25)' }}>
                <ShoppingBag color="#fff" size={22} />
              </LinearGradient>
              <View>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>Secure Checkout</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 }}>
                  Pay directly · Safe & verified
                </Text>
              </View>
            </View>

            {/* Trust badges */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { icon: Shield, label: 'SSL Encrypted' },
                { icon: Lock,   label: 'Chapa Secured' },
                { icon: Zap,    label: 'Instant Confirm' },
              ].map(({ icon: Icon, label }) => (
                <View key={label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10,
                  paddingHorizontal: 8, paddingVertical: 6 }}>
                  <Icon color="#A5F3FC" size={12} />
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '700',
                    marginLeft: 5, letterSpacing: 0.3 }}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Section: Product ── */}
            <SectionTitle title="Select Product" />
            <ProductPicker products={products} selected={selectedProduct} onSelect={setSelected} />

            {selectedProduct && (
              <>
                {/* Quantity */}
                <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700',
                  letterSpacing: 0.8, marginBottom: 10 }}>QUANTITY</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20,
                  backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
                  borderWidth: 1.5, borderColor: BORDER, padding: 10, justifyContent: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setQuantity(q => Math.max(1, q - 1))}
                    style={{ width: 40, height: 40, borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: 22, fontWeight: '300' }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ color: TEXT, fontSize: 26, fontWeight: '800', width: 60, textAlign: 'center' }}>
                    {quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setQuantity(q => Math.min(selectedProduct.stock, q + 1))}
                    style={{ width: 40, height: 40, borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: 22, fontWeight: '300' }}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Price summary */}
                <View style={{ backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 16,
                  padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)' }}>
                  <Row label={`Unit price × ${quantity}`}
                    value={`ETB ${parseFloat(selectedProduct.price).toFixed(2)} × ${quantity}`} />
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 10 }} />
                  <Row label="Total Due" value={`ETB ${total}`} accent={ACCENT} last />
                </View>
              </>
            )}

            {/* ── Section: Your Info ── */}
            <SectionTitle title="Your Information" />
            <FloatingInput label="Full Name" value={name} onChangeText={setName} icon={User} required />
            <FloatingInput label="Email Address" value={email} onChangeText={setEmail}
              icon={Mail} keyboardType="email-address" autoCapitalize="none" required />
            <FloatingInput label="Phone Number" value={phone} onChangeText={setPhone}
              icon={Phone} keyboardType="phone-pad" autoCapitalize="none" />

            {/* ── Pay Button ── */}
            <TouchableOpacity
              onPress={handlePay}
              disabled={submitting || !selectedProduct}
              style={{ borderRadius: 18, overflow: 'hidden', marginTop: 8 }}
            >
              <LinearGradient
                colors={submitting || !selectedProduct
                  ? ['#374151', '#374151']
                  : ['#4338CA', ACCENT, '#8B5CF6']}
                start={[0, 0]} end={[1, 0]}
                style={{ paddingVertical: 18, alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center' }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <CreditCard color="#fff" size={20} />
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17,
                      marginLeft: 10, letterSpacing: 0.5 }}>
                      Pay ETB {total} via Chapa
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Fine print */}
            <Text style={{ color: MUTED, fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 17 }}>
              🔒 Your payment is processed securely by Chapa.{'\n'}
              Prices are fixed and verified by the system.{'\n'}
              Your distributor cannot change the price.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const SectionTitle = ({ title }) => (
  <Text style={{ color: TEXT, fontSize: 16, fontWeight: '800', marginBottom: 14, marginTop: 4 }}>
    {title}
  </Text>
);

export default CustomerPayScreen;
