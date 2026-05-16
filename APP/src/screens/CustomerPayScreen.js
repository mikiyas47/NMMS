/**
 * CustomerPayScreen.js
 * Independent checkout page accessible via deep-link or direct navigation.
 * After a successful payment the customer is offered a choice:
 *   A) Stay as a customer (close / new checkout)
 *   B) Become a distributor — set a password and get full app access
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, Alert, Image, Dimensions,
  Animated, StatusBar, KeyboardAvoidingView, Platform, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShoppingBag, User, Mail, Phone, ChevronDown,
  CheckCircle, XCircle, ArrowLeft, CreditCard,
  Shield, Lock, Package, Zap, TrendingUp, Eye, EyeOff,
} from 'lucide-react-native';
import {
  getProducts, initiatePayment, verifyPayment, getUser,
  upgradeToDistributor, checkCustomerStatus, joinNetwork, getDistributorStatus, stayAsCustomer,
} from '../api/authService';

const { width, height } = Dimensions.get('window');

const toHttps = (url) => url ? url.replace(/^http:\/\//, 'https://') : null;

const ACCENT  = '#6366F1';
const SUCCESS = '#10B981';
const ERROR   = '#EF4444';
const GOLD    = '#F59E0B';
const DARK_BG = '#0A0F1E';
const SURFACE = '#111827';
const BORDER  = 'rgba(255,255,255,0.08)';
const TEXT    = '#F9FAFB';
const MUTED   = 'rgba(255,255,255,0.45)';

// ─── Animated Input ───────────────────────────────────────────────────────────
const FloatingInput = ({
  label, value, onChangeText, keyboardType = 'default',
  icon: Icon, autoCapitalize = 'words', required = false,
  secureTextEntry = false,
}) => {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw]   = useState(false);
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
    inputRange: [0, 1], outputRange: [BORDER, ACCENT],
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
            secureTextEntry={secureTextEntry && !showPw}
            style={{ fontSize: 15, color: TEXT, fontWeight: '600', padding: 0 }}
            placeholderTextColor={MUTED}
          />
        </View>
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ padding: 4 }}>
            {showPw
              ? <EyeOff color={MUTED} size={18} />
              : <Eye    color={MUTED} size={18} />}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

// ─── Product Video Player ─────────────────────────────────────────────────────
const ProductVideo = ({ uri }) => {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') player.play();
      else player.pause();
    });
    return () => sub.remove();
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

// ─── Product Card (shown when product is selected on checkout) ───────────────
const ProductCard = ({ product, onChangeProduct, canChange }) => {
  const uri = toHttps(product?.image);
  const isVideo = uri && (
    uri.includes('.mp4') || uri.includes('.mov') ||
    uri.includes('.avi') || uri.includes('.mkv') ||
    uri.includes('/video/')
  );

  return (
    <View style={{
      borderRadius: 20, overflow: 'hidden', marginBottom: 20,
      borderWidth: 1.5, borderColor: ACCENT,
      backgroundColor: 'rgba(99,102,241,0.08)',
    }}>
      {/* Media area */}
      <View style={{ width: '100%', height: 240, backgroundColor: '#111', position: 'relative' }}>
        {uri ? (
          isVideo ? (
            <ProductVideo uri={uri} />
          ) : (
            <Image
              source={{ uri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          )
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(99,102,241,0.15)' }}>
            <Package color={ACCENT} size={52} />
          </View>
        )}
        {/* Category badge overlay */}
        {product?.category ? (
          <View style={{
            position: 'absolute', top: 12, left: 12,
            backgroundColor: ACCENT, paddingHorizontal: 10,
            paddingVertical: 4, borderRadius: 20,
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
              {product.category.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Product details */}
      <View style={{ padding: 16 }}>
        <Text style={{ color: TEXT, fontSize: 18, fontWeight: '900', marginBottom: 6 }}>
          {product?.name}
        </Text>
        {product?.description ? (
          <Text style={{ color: MUTED, fontSize: 13, lineHeight: 18, marginBottom: 10 }}
            numberOfLines={3}>
            {product.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: ACCENT, fontSize: 22, fontWeight: '900' }}>
            ETB {parseFloat(product?.price ?? 0).toFixed(2)}
          </Text>
          {product?.point ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: 'rgba(245,158,11,0.15)',
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
            }}>
              <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '800' }}>
                ★ {product.point} pts
              </Text>
            </View>
          ) : null}
        </View>
        {canChange ? (
          <TouchableOpacity
            onPress={onChangeProduct}
            style={{
              marginTop: 12, alignSelf: 'flex-start',
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1, borderColor: BORDER,
            }}>
            <Text style={{ color: MUTED, fontSize: 12, fontWeight: '600' }}>Change product</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
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
            letterSpacing: 0.8, marginBottom: 2 }}>PRODUCT *</Text>
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
              {products.map(product => (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => { onSelect(product); setOpen(false); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: 14,
                    borderRadius: 16, marginBottom: 10,
                    backgroundColor: selected?.id === product.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    borderWidth: 1, borderColor: selected?.id === product.id ? ACCENT : BORDER,
                  }}
                >
                  {product.image ? (
                    <Image source={{ uri: toHttps(product.image) }}
                      style={{ width: 50, height: 60, borderRadius: 10, marginRight: 14 }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: 50, height: 60, borderRadius: 10, marginRight: 14,
                      backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Package color={ACCENT} size={22} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: TEXT, fontWeight: '700', fontSize: 14, marginBottom: 4 }}
                      numberOfLines={2}>{product.name}</Text>
                    <Text style={{ color: MUTED, fontSize: 12 }}>{product.category}</Text>
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

const Row = ({ label, value, accent, last }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: last ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{label}</Text>
    <Text style={{ color: accent ?? TEXT, fontWeight: '700', fontSize: 13, maxWidth: '60%', textAlign: 'right' }}
      numberOfLines={1}>{value}</Text>
  </View>
);

const SectionTitle = ({ title }) => (
  <Text style={{ color: TEXT, fontSize: 16, fontWeight: '800', marginBottom: 14, marginTop: 4 }}>
    {title}
  </Text>
);

// ─── Upgrade to Distributor Modal ─────────────────────────────────────────────
// Shown after a successful payment. Customer chooses to stay or become a distributor.
const UpgradeModal = ({ visible, customerName, customerEmail, txRef, onStay, onUpgraded }) => {
  const [step, setStep]           = useState('choice'); // 'choice' | 'form' | 'loading' | 'done'
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setStep('choice');
      setPassword('');
      setConfirm('');
      setError('');
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 5 }).start();
    }
  }, [visible]);

  const handleUpgrade = async () => {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setStep('loading');
    try {
      const res = await upgradeToDistributor({
        email: customerEmail,
        password,
        password_confirmation: confirm,
        tx_ref: txRef,
      });
      setStep('done');
      // Give the animation a moment then notify parent
      setTimeout(() => onUpgraded(res), 1200);
    } catch (e) {
      setStep('form');
      setError(e.message || 'Upgrade failed. Please try again.');
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onStay}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={step === 'choice' ? onStay : undefined} />
        <Animated.View style={{
          transform: [{ translateY: slideAnim }],
          backgroundColor: SURFACE,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingHorizontal: 24, paddingBottom: 44, paddingTop: 8,
          borderTopWidth: 1, borderColor: BORDER,
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER,
            alignSelf: 'center', marginBottom: 24 }} />

          {/* ── Choice step ── */}
          {step === 'choice' && (
            <>
              {/* Header */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <LinearGradient
                  colors={[GOLD, '#F97316']}
                  style={{ width: 72, height: 72, borderRadius: 24, alignItems: 'center',
                    justifyContent: 'center', marginBottom: 16 }}
                >
                  <TrendingUp color="#fff" size={34} />
                </LinearGradient>
                <Text style={{ color: TEXT, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>
                  Want to Earn Too?
                </Text>
                <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                  Hi {customerName}! You can now become a distributor{'\n'}
                  and earn commissions by selling to others.
                </Text>
              </View>

              {/* Benefits */}
              <View style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 16, padding: 16,
                marginBottom: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' }}>
                {[
                  { icon: '💰', text: 'Earn referral commissions on every sale' },
                  { icon: '🌳', text: 'Build your own 4-leg downline network' },
                  { icon: '🏆', text: 'Climb ranks from CT to Alpha Legend' },
                  { icon: '📱', text: 'Full access to the distributor dashboard' },
                ].map((b, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < 3 ? 10 : 0 }}>
                    <Text style={{ fontSize: 18, marginRight: 12 }}>{b.icon}</Text>
                    <Text style={{ color: TEXT, fontSize: 13, flex: 1 }}>{b.text}</Text>
                  </View>
                ))}
              </View>

              {/* Become distributor button */}
              <TouchableOpacity
                onPress={() => setStep('form')}
                style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}
              >
                <LinearGradient
                  colors={[GOLD, '#F97316']}
                  start={[0, 0]} end={[1, 0]}
                  style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                >
                  <TrendingUp color="#fff" size={20} />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, marginLeft: 10 }}>
                    Yes, Become a Distributor!
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Stay as customer */}
              <TouchableOpacity
                onPress={onStay}
                style={{ paddingVertical: 14, alignItems: 'center', borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: BORDER }}
              >
                <Text style={{ color: MUTED, fontWeight: '600', fontSize: 15 }}>
                  No thanks, stay as customer
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Password form step ── */}
          {step === 'form' && (
            <>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: TEXT, fontSize: 20, fontWeight: '900' }}>Set Your Password</Text>
                <Text style={{ color: MUTED, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                  Your email is already registered:{'\n'}
                  <Text style={{ color: ACCENT }}>{customerEmail}</Text>
                </Text>
              </View>

              <FloatingInput
                label="New Password"
                value={password}
                onChangeText={setPassword}
                icon={Lock}
                autoCapitalize="none"
                secureTextEntry
                required
              />
              <FloatingInput
                label="Confirm Password"
                value={confirm}
                onChangeText={setConfirm}
                icon={Lock}
                autoCapitalize="none"
                secureTextEntry
                required
              />

              {error ? (
                <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12,
                  marginBottom: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                  <Text style={{ color: ERROR, fontSize: 13, textAlign: 'center' }}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleUpgrade}
                style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}
              >
                <LinearGradient
                  colors={[GOLD, '#F97316']}
                  start={[0, 0]} end={[1, 0]}
                  style={{ paddingVertical: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>
                    Activate My Distributor Account
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStep('choice')}
                style={{ paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: MUTED, fontSize: 14 }}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Loading step ── */}
          {step === 'loading' && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={GOLD} />
              <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', marginTop: 20 }}>
                Activating your account…
              </Text>
            </View>
          )}

          {/* ── Done step ── */}
          {step === 'done' && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <LinearGradient
                colors={[SUCCESS, '#34D399']}
                style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center',
                  justifyContent: 'center', marginBottom: 20 }}
              >
                <CheckCircle color="#fff" size={44} />
              </LinearGradient>
              <Text style={{ color: TEXT, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
                Welcome, Distributor!
              </Text>
              <Text style={{ color: MUTED, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                Logging you in…
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Success Screen ───────────────────────────────────────────────────────────
// Shown after payment is confirmed. Includes the upgrade prompt for non-self-purchases.
const SuccessScreen = ({
  txRef, amount, product, customerName, customerEmail,
  isSelfPurchase, productId, distributorId, preferredLeg, navigation, onNewCheckout,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [alreadyDist, setAlreadyDist] = useState(false);
  const [joiningNetwork, setJoiningNetwork] = useState(false);
  const [joinDone, setJoinDone] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const joinCalledRef = useRef(false);

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 12 }).start();

    if (isSelfPurchase) {
      // Self-purchase: call joinNetwork to register the doubled node
      if (!joinCalledRef.current) {
        joinCalledRef.current = true;
        setJoiningNetwork(true);
        getDistributorStatus()
          .then(statusRes => {
            return joinNetwork({
              product_id: productId,
              sponsor_id: statusRes?.upline_id ?? null,
              quantity: 1,
              preferred_leg: preferredLeg ?? null,
            });
          })
          .then(() => {
            setJoinDone(true);
            setJoiningNetwork(false);
          })
          .catch(err => {
            getDistributorStatus()
              .then(s => {
                if (s?.has_joined) setJoinDone(true);
                else setJoinError(err.message);
              })
              .catch(() => setJoinError(err.message))
              .finally(() => setJoiningNetwork(false));
          });
      }
    } else {
      // Customer purchase: ALWAYS register the customer node immediately on payment success.
      // This runs regardless of whether they choose to become a distributor or stay as customer.
      // If they later choose "Become a Distributor", CustomerUpgradeController will update
      // the existing inactive record to active. The stayAsCustomer call is idempotent.
      stayAsCustomer({ tx_ref: txRef, customer_email: customerEmail }).catch(() => {});

      // Check if already an active distributor (to show correct button)
      if (customerEmail) {
        checkCustomerStatus(customerEmail, txRef).then(res => {
          if (res.is_distributor) setAlreadyDist(true);
        });
      }
    }
  }, []);

  const handleUpgraded = (res) => {
    setShowUpgrade(false);
    navigation.replace('UserDashboard');
  };

  return (
    <LinearGradient
      colors={['#064E3B', '#065F46', DARK_BG]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center', width: '100%' }}>

            {/* Success icon */}
            <LinearGradient
              colors={[SUCCESS, '#34D399']}
              style={{ width: 100, height: 100, borderRadius: 50,
                alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
            >
              <CheckCircle color="#fff" size={52} />
            </LinearGradient>

            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
              Payment Successful!
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, textAlign: 'center',
              marginBottom: 28, lineHeight: 22 }}>
              Your order for {product} has been confirmed.
            </Text>

            {/* Receipt */}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20,
              width: '100%', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
              <Row label="Customer"   value={customerName} />
              <Row label="Email"      value={customerEmail} />
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 }} />
              <Row label="Amount"     value={`ETB ${parseFloat(amount).toFixed(2)}`} accent={SUCCESS} />
              <Row label="Ref"        value={txRef} />
              <Row label="Status"     value="Verified ✓" accent={SUCCESS} last />
            </View>

            {/* ── Self-purchase: show node registration status ── */}
            {isSelfPurchase && (
              <View style={{ width: '100%', borderRadius: 16, padding: 16, marginBottom: 16,
                backgroundColor: joiningNetwork ? 'rgba(99,102,241,0.1)' : joinDone ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                borderWidth: 1, borderColor: joiningNetwork ? 'rgba(99,102,241,0.3)' : joinDone ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                flexDirection: 'row', alignItems: 'center' }}>
                {joiningNetwork
                  ? <ActivityIndicator color={ACCENT} size="small" style={{ marginRight: 12 }} />
                  : joinDone
                    ? <CheckCircle color={SUCCESS} size={20} style={{ marginRight: 12 }} />
                    : <Zap color={ERROR} size={20} style={{ marginRight: 12 }} />
                }
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TEXT, fontWeight: '800', fontSize: 13 }}>
                    {joiningNetwork ? 'Registering your new account…' : joinDone ? 'Account added to tree!' : 'Could not register node'}
                  </Text>
                  {joiningNetwork && (
                    <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>This may take up to 30 seconds</Text>
                  )}
                  {joinError && (
                    <Text style={{ color: ERROR, fontSize: 11, marginTop: 2 }}>{joinError}</Text>
                  )}
                </View>
              </View>
            )}

            {/* ── Upgrade prompt (only for real customer purchases) ── */}
            {!isSelfPurchase && !alreadyDist && (
              <TouchableOpacity
                onPress={() => setShowUpgrade(true)}
                style={{ width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}
              >
                <LinearGradient
                  colors={[GOLD, '#F97316']}
                  start={[0, 0]} end={[1, 0]}
                  style={{ paddingVertical: 16, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center' }}
                >
                  <TrendingUp color="#fff" size={20} />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, marginLeft: 10 }}>
                    Become a Distributor & Earn!
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Already a distributor — go to dashboard */}
            {!isSelfPurchase && alreadyDist && (
              <TouchableOpacity
                onPress={() => navigation.replace('UserDashboard')}
                style={{ width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}
              >
                <LinearGradient
                  colors={[ACCENT, '#8B5CF6']}
                  start={[0, 0]} end={[1, 0]}
                  style={{ paddingVertical: 16, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center' }}
                >
                  <TrendingUp color="#fff" size={20} />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, marginLeft: 10 }}>
                    Go to My Dashboard
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Go to dashboard after self-purchase */}
            {isSelfPurchase && (
              <TouchableOpacity
                onPress={() => navigation.replace('UserDashboard')}
                style={{ width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}
              >
                <LinearGradient
                  colors={[ACCENT, '#8B5CF6']}
                  start={[0, 0]} end={[1, 0]}
                  style={{ paddingVertical: 16, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center' }}
                >
                  <TrendingUp color="#fff" size={20} />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, marginLeft: 10 }}>
                    Go to My Dashboard
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* New checkout */}
            <TouchableOpacity
              onPress={onNewCheckout}
              style={{ width: '100%', paddingVertical: 14, alignItems: 'center', borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: BORDER }}
            >
              <Text style={{ color: TEXT, fontWeight: '700', fontSize: 15 }}>New Checkout</Text>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Upgrade modal */}
      <UpgradeModal
        visible={showUpgrade}
        customerName={customerName}
        customerEmail={customerEmail}
        txRef={txRef}
        onStay={() => setShowUpgrade(false)}
        onUpgraded={handleUpgraded}
      />
    </LinearGradient>
  );
};

// ─── Failure Screen ───────────────────────────────────────────────────────────
const FailureScreen = ({ onRetry }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 12 }).start();
  }, []);
  return (
    <LinearGradient colors={['#450A0A', '#7F1D1D', DARK_BG]}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center', width: '100%' }}>
        <LinearGradient colors={[ERROR, '#F87171']}
          style={{ width: 100, height: 100, borderRadius: 50,
            alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <XCircle color="#fff" size={52} />
        </LinearGradient>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
          Payment Failed
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, textAlign: 'center',
          marginBottom: 32, lineHeight: 22 }}>
          Your payment could not be processed.{'\n'}Please try again or use a different method.
        </Text>
        <TouchableOpacity onPress={onRetry} style={{ borderRadius: 16, overflow: 'hidden', width: '100%' }}>
          <LinearGradient colors={[ACCENT, '#8B5CF6']} start={[0, 0]} end={[1, 0]}
            style={{ paddingVertical: 16, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CustomerPayScreen = ({ route, navigation }) => {
  const {
    distributor_id,
    product_id: preSelectedProductId,
    leg,
    self_purchase,
  } = route?.params ?? {};

  const [products, setProducts]               = useState([]);
  const [selectedProduct, setSelected]        = useState(null);
  const [quantity, setQuantity]               = useState(1);
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [phone, setPhone]                     = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting]           = useState(false);

  // Payment flow state
  const [paymentUrl, setPaymentUrl]           = useState(null);
  const [txRef, setTxRef]                     = useState(null);
  const [paymentStatus, setPaymentStatus]     = useState(null); // null | 'success' | 'failed'
  const [paymentAmount, setPaymentAmount]     = useState(0);
  const [polling, setPolling]                 = useState(false);
  const pollRef                               = useRef(null);
  const [selfPayReady, setSelfPayReady]       = useState(false);

  // Load products + pre-fill for self-purchase
  useEffect(() => {
    (async () => {
      try {
        const res  = await getProducts();
        const list = res?.data ?? [];
        setProducts(list);
        if (preSelectedProductId) {
          const found = list.find(p => String(p.id) === String(preSelectedProductId));
          if (found) setSelected(found);
        }
        if (self_purchase) {
          const user = await getUser();
          if (user) {
            setName(user.name  ?? '');
            setEmail(user.email ?? '');
            setPhone(user.phone ?? '');
          }
          setSelfPayReady(true);
        }
      } catch {
        Alert.alert('Error', 'Could not load products. Please check your connection.');
      } finally {
        setLoadingProducts(false);
      }
    })();
    return () => clearInterval(pollRef.current);
  }, []);

  // Poll backend for payment confirmation — checks every 2 seconds
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
      if (attempts > 150) { clearInterval(pollRef.current); setPolling(false); }
    }, 2000); // poll every 2 seconds instead of 5
  }, []);

  // Initiate Chapa payment
  const handlePay = async () => {
    if (!selectedProduct) return Alert.alert('Select product', 'Please choose a product first.');
    if (!name.trim())     return Alert.alert('Required', 'Please enter your full name.');
    if (!email.trim())    return Alert.alert('Required', 'Please enter your email address.');
    if (!distributor_id)  return Alert.alert('Invalid Link', 'Missing distributor info. Ask your distributor to share a valid link.');

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
      Alert.alert('Error', err?.message ?? 'Payment initiation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-pay for self-purchase (distributor upgrading their own account)
  useEffect(() => {
    if (self_purchase && selfPayReady && selectedProduct && name && email
        && !submitting && !paymentUrl && !paymentStatus) {
      handlePay();
    }
  }, [self_purchase, selfPayReady, selectedProduct, name, email]);

  const total = selectedProduct
    ? (parseFloat(selectedProduct.price) * quantity).toFixed(2)
    : '0.00';

  const resetForm = () => {
    setPaymentStatus(null);
    setTxRef(null);
    setPaymentUrl(null);
    setName(''); setEmail(''); setPhone('');
    setSelected(null); setQuantity(1);
  };

  // ── Result screens ────────────────────────────────────────────────────────
  if (paymentStatus === 'success') {
    return (
      <SuccessScreen
        txRef={txRef}
        amount={paymentAmount}
        product={selectedProduct?.name ?? ''}
        customerName={name}
        customerEmail={email}
        isSelfPurchase={!!self_purchase}
        productId={selectedProduct?.id}
        distributorId={distributor_id}
        preferredLeg={leg ?? null}
        navigation={navigation}
        onNewCheckout={resetForm}
      />
    );
  }

  if (paymentStatus === 'failed') {
    return <FailureScreen onRetry={resetForm} />;
  }

  // ── Chapa WebView ─────────────────────────────────────────────────────────
  if (paymentUrl) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
          paddingVertical: 12, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER }}>
          <TouchableOpacity
            onPress={() => { clearInterval(pollRef.current); setPaymentUrl(null); setPolling(false); }}
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
          // Intercept BEFORE the return URL page loads — this fires instantly
          // when Chapa redirects, without waiting for the page to render.
          onShouldStartLoadWithRequest={(request) => {
            if (request.url && request.url.includes('/api/payments/return')) {
              // Don't load the return page — jump straight to success screen
              setPaymentUrl(null);
              setPaymentStatus('success');
              setPolling(false);
              clearInterval(pollRef.current);
              return false; // block the WebView from loading this URL
            }
            return true;
          }}
          // Backup: also catch it in navigation state change
          onNavigationStateChange={(state) => {
            if (state.url && state.url.includes('/api/payments/return')) {
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

  // ── Loading (products or self-purchase auto-pay) ──────────────────────────
  if (loadingProducts || (self_purchase && !paymentUrl && !paymentStatus)) {
    return (
      <LinearGradient colors={[DARK_BG, SURFACE]}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ color: TEXT, marginTop: 18, fontSize: 17, fontWeight: '800', textAlign: 'center' }}>
          {self_purchase ? 'Preparing your payment…' : 'Loading products…'}
        </Text>
        {self_purchase && (
          <Text style={{ color: MUTED, marginTop: 8, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
            We are setting up your account upgrade.{'\n'}You will be redirected to Chapa shortly.
          </Text>
        )}
      </LinearGradient>
    );
  }

  // ── Main checkout form ────────────────────────────────────────────────────
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
                  Pay directly · Safe and verified
                </Text>
              </View>
            </View>

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
                    marginLeft: 5, letterSpacing: 0.3 }}>{label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <SectionTitle title="Product" />
            {/* Show rich product card whenever a product is selected AND we came via
                a payment link (distributor_id in params = came from outside the app).
                Show the picker only when no product is pre-selected. */}
            {selectedProduct ? (
              <ProductCard
                product={selectedProduct}
                onChangeProduct={() => setSelected(null)}
                canChange={!preSelectedProductId}
              />
            ) : (
              <ProductPicker products={products} selected={selectedProduct} onSelect={setSelected} />
            )}

            {selectedProduct && (
              <>
                <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700',
                  letterSpacing: 0.8, marginBottom: 10 }}>QUANTITY</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20,
                  backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
                  borderWidth: 1.5, borderColor: BORDER, padding: 10, justifyContent: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setQuantity(q => Math.max(1, q - 1))}
                    style={{ width: 40, height: 40, borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: 22, fontWeight: '300' }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ color: TEXT, fontSize: 26, fontWeight: '800', width: 60, textAlign: 'center' }}>
                    {quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setQuantity(q => q + 1)}
                    style={{ width: 40, height: 40, borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: 22, fontWeight: '300' }}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 16,
                  padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)' }}>
                  <Row label={`Unit price x ${quantity}`}
                    value={`ETB ${parseFloat(selectedProduct.price).toFixed(2)} x ${quantity}`} />
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 10 }} />
                  <Row label="Total Due" value={`ETB ${total}`} accent={ACCENT} last />
                </View>
              </>
            )}

            <SectionTitle title="Your Information" />
            <FloatingInput label="Full Name"      value={name}  onChangeText={setName}  icon={User} required />
            <FloatingInput label="Email Address"  value={email} onChangeText={setEmail} icon={Mail}
              keyboardType="email-address" autoCapitalize="none" required />
            <FloatingInput label="Phone Number"   value={phone} onChangeText={setPhone} icon={Phone}
              keyboardType="phone-pad" autoCapitalize="none" />

            <TouchableOpacity
              onPress={handlePay}
              disabled={submitting || !selectedProduct}
              style={{ borderRadius: 18, overflow: 'hidden', marginTop: 8 }}
            >
              <LinearGradient
                colors={submitting || !selectedProduct ? ['#374151', '#374151'] : ['#4338CA', ACCENT, '#8B5CF6']}
                start={[0, 0]} end={[1, 0]}
                style={{ paddingVertical: 18, alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center' }}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
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

            <Text style={{ color: MUTED, fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 17 }}>
              Your payment is processed securely by Chapa.{'\n'}
              Prices are fixed and verified by the system.{'\n'}
              Your distributor cannot change the price.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default CustomerPayScreen;
