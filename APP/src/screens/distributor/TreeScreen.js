import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, Dimensions, Modal, Alert, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Network, ZoomIn, ZoomOut, Maximize, User, Zap, ArrowUpCircle, Package } from 'lucide-react-native';
import { getMyTree, getSubtreeData, getUser, getUpgradeOptions, initiateAccountUpgrade, completeAccountUpgrade } from '../../api/authService';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const RANK_COLORS = {
  None: ['#9CA3AF', '#4B5563'],
  CT: ['#9CA3AF', '#4B5563'],
  MT: ['#FBBF24', '#D97706'], // Yellow/Amber
  TT: ['#F97316', '#C2410C'], // Orange
  NTB: ['#34D399', '#059669'], // Green
  IBB: ['#60A5FA', '#2563EB'], // Blue
  GEB: ['#C084FC', '#7E22CE'], // Purple
  CA: ['#FBBF24', '#D97706'], // Gold
  C_AWARD: ['#F59E0B', '#B45309'], // Dark Gold
  AL: ['#FCD34D', '#B45309'], // Bright Gold
};

const TreeNode = ({ node, isRoot = false, C, onNodeClick }) => {
  if (!node) {
    return (
      <View style={{ alignItems: 'center', marginHorizontal: 10 }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>Empty</Text>
        </View>
      </View>
    );
  }

  const rankColors = RANK_COLORS[node.rank] || RANK_COLORS.None;

  return (
    <View style={{ alignItems: 'center', marginHorizontal: 5 }}>
      {/* Connector Line from Parent */}
      {!isRoot && <View style={{ width: 2, height: 20, backgroundColor: C.border }} />}

      {/* Node Card */}
      <TouchableOpacity 
        onPress={() => onNodeClick(node)}
        activeOpacity={0.8}
        style={{ alignItems: 'center' }}
      >
        <LinearGradient
          colors={rankColors}
          style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}
        >
          <User color="#fff" size={24} />
        </LinearGradient>
        <View style={{ backgroundColor: C.surface, marginTop: -10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ color: node.status === 'inactive' ? C.muted : C.text, fontSize: 10, fontWeight: '800' }}>
            {node.distributor_name} {node.status === 'inactive' && '(Customer)'}
          </Text>
        </View>
        <Text style={{ color: C.muted, fontSize: 9, marginTop: 2 }}>Own: {node.product_points || 0} PTS</Text>
        <Text style={{ color: node.status === 'inactive' ? C.muted : rankColors[0], fontSize: 9, fontWeight: '700' }}>
          {node.status === 'inactive' ? 'Inactive' : node.rank}
        </Text>
      </TouchableOpacity>

      {/* Children Container (Show 4 legs if children exist OR if it's the end of the loaded tree with no more to load) */}
      {(!node.has_more || (node.children && node.children.length > 0)) && (
        <>
          <View style={{ width: 2, height: 15, backgroundColor: C.border }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {/* Horizontal connection line */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: '12%',
              right: '12%',
              height: 2,
              backgroundColor: C.border,
            }} />
            
            {/* Render 4 legs (pad with empty if needed) */}
            {[1, 2, 3, 4].map((leg) => {
              const childrenArray = node.children || [];
              const child = childrenArray.find(c => c && c.leg === leg);
              return (
                <View key={`leg-${leg}`} style={{ alignItems: 'center', paddingHorizontal: 2 }}>
                  {child ? (
                    <TreeNode node={child} C={C} onNodeClick={onNodeClick} />
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                       <View style={{ width: 2, height: 20, backgroundColor: C.border }} />
                       <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Load More Button */}
      {node.has_more && (!node.children || node.children.length === 0) && (
        <>
          <View style={{ width: 2, height: 15, backgroundColor: C.border }} />
          <TouchableOpacity 
            onPress={() => onNodeClick(node)}
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}
          >
            <Text style={{ color: C.accent, fontSize: 10, fontWeight: '700' }}>Load Subtree</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

// ── Account Upgrade Modal ──────────────────────────────────────────────────────
const AccountUpgradeModal = ({ visible, node, distributorId, onClose, onUpgraded, C }) => {
  const [step, setStep]           = useState('options'); // 'options' | 'paying' | 'done'
  const [options, setOptions]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [selectedProduct, setSel] = useState(null);
  const [paymentUrl, setPayUrl]   = useState(null);
  const [txRef, setTxRef]         = useState(null);
  const [accountId, setAccId]     = useState(null);
  const [newProductId, setNewPid] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError]         = useState('');
  const pollRef                   = useRef(null);

  useEffect(() => {
    if (visible && node) {
      setStep('options');
      setSel(null);
      setPayUrl(null);
      setError('');
      setLoading(true);
      setAccId(node.id); // node.id is the tree node id
      getUpgradeOptions(node.id)
        .then(data => { setOptions(data); })
        .catch(() => setError('Could not load upgrade options.'))
        .finally(() => setLoading(false));
    }
    return () => clearInterval(pollRef.current);
  }, [visible, node]);

  const handlePay = async () => {
    if (!selectedProduct) return;
    setError('');
    setLoading(true);
    try {
      const res = await initiateAccountUpgrade({
        node_id:        accountId,   // accountId holds the node.id
        new_product_id: selectedProduct.id,
        distributor_id: distributorId,
      });
      setTxRef(res.tx_ref);
      setNewPid(selectedProduct.id);
      setPayUrl(res.payment_url);
      setStep('paying');
      // Poll for payment completion
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const vr = await fetch(`https://nmms-backend.onrender.com/api/payments/verify/${res.tx_ref}`);
          const vd = await vr.json();
          if (vd.status === 'success' || vd.status === 'pending') {
            clearInterval(pollRef.current);
            setPayUrl(null);
            setCompleting(true);
            const cr = await completeAccountUpgrade({
              tx_ref:         res.tx_ref,
              node_id:        accountId,
              new_product_id: selectedProduct.id,
            });
            setCompleting(false);
            setStep('done');
            setTimeout(() => { onUpgraded(cr); onClose(); }, 1500);
          } else if (vd.status === 'failed' || vd.status === 'rejected') {
            clearInterval(pollRef.current);
            setPayUrl(null);
            setStep('options');
            setError('Payment failed. Please try again.');
          }
        } catch {}
        if (attempts > 150) { clearInterval(pollRef.current); setPayUrl(null); setStep('options'); }
      }, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const GOLD = '#F59E0B';
  const ACCENT = '#6366F1';
  const TEXT = '#F9FAFB';
  const MUTED = 'rgba(255,255,255,0.45)';
  const BORDER = 'rgba(255,255,255,0.08)';

  const catColors = { Yellow: '#FBBF24', Orange: '#F97316', Green: '#10B981', Golden: '#F59E0B' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={step === 'options' ? onClose : undefined} />

        {/* Chapa WebView */}
        {step === 'paying' && paymentUrl && (
          <View style={{ height: '85%', backgroundColor: '#000', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
            <View style={{ padding: 16, backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => { clearInterval(pollRef.current); setPayUrl(null); setStep('options'); }} style={{ marginRight: 12 }}>
                <Text style={{ color: MUTED, fontSize: 22 }}>←</Text>
              </TouchableOpacity>
              <Text style={{ color: TEXT, fontWeight: '800', fontSize: 15 }}>Upgrade Payment</Text>
            </View>
            <WebView source={{ uri: paymentUrl }} style={{ flex: 1 }}
              onShouldStartLoadWithRequest={(req) => {
                if (req.url.includes('/api/payments/return')) {
                  setPayUrl(null);
                  setCompleting(true);
                  completeAccountUpgrade({ tx_ref: txRef, node_id: accountId, new_product_id: newProductId })
                    .then(cr => { setCompleting(false); setStep('done'); setTimeout(() => { onUpgraded(cr); onClose(); }, 1500); })
                    .catch(e => { setCompleting(false); setError(e.message); setStep('options'); });
                  return false;
                }
                return true;
              }}
            />
          </View>
        )}

        {/* Completing overlay */}
        {completing && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={{ color: TEXT, marginTop: 16, fontWeight: '700' }}>Applying upgrade…</Text>
          </View>
        )}

        {/* Options / Done sheet */}
        {(step === 'options' || step === 'done') && (
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8, borderTopWidth: 1, borderColor: BORDER, maxHeight: '80%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 20 }} />

            {step === 'done' ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
                <Text style={{ color: TEXT, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>Upgrade Successful!</Text>
                <Text style={{ color: MUTED, fontSize: 14, marginTop: 8, textAlign: 'center' }}>Account upgraded. Points recalculated.</Text>
              </View>
            ) : (
              <>
                <Text style={{ color: TEXT, fontSize: 18, fontWeight: '900', marginBottom: 4 }}>Upgrade Account</Text>
                <Text style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>
                  {node?.distributor_name} · Current: {options?.current_product?.category ?? '…'} ({options?.current_product?.point ?? 0} pts)
                </Text>

                {error ? (
                  <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                    <Text style={{ color: '#EF4444', fontSize: 13, textAlign: 'center' }}>{error}</Text>
                  </View>
                ) : null}

                {loading ? (
                  <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
                ) : options?.upgrades?.length === 0 ? (
                  <Text style={{ color: MUTED, textAlign: 'center', marginVertical: 24 }}>This account is already at the highest tier.</Text>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {(options?.upgrades ?? []).map(p => {
                      const active = selectedProduct?.id === p.id;
                      const color  = catColors[p.category] ?? ACCENT;
                      return (
                        <TouchableOpacity key={p.id} onPress={() => setSel(p)}
                          style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 10,
                            backgroundColor: active ? `${color}22` : 'rgba(255,255,255,0.04)',
                            borderWidth: 1.5, borderColor: active ? color : BORDER }}>
                          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${color}33`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                            <Text style={{ fontSize: 20 }}>
                              {p.category === 'Yellow' ? '🟡' : p.category === 'Orange' ? '🟠' : p.category === 'Green' ? '🟢' : '🏆'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: TEXT, fontWeight: '800', fontSize: 14 }}>{p.category} — {p.name}</Text>
                            <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>★ {p.point} pts · ETB {parseFloat(p.price).toLocaleString()}</Text>
                          </View>
                          {active && <Text style={{ color, fontSize: 18 }}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                <TouchableOpacity onPress={handlePay} disabled={!selectedProduct || loading}
                  style={{ borderRadius: 16, overflow: 'hidden', opacity: (!selectedProduct || loading) ? 0.5 : 1 }}>
                  <LinearGradient colors={[GOLD, '#F97316']} start={[0,0]} end={[1,0]}
                    style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : <ArrowUpCircle color="#fff" size={20} />}
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, marginLeft: 10 }}>
                      {loading ? 'Loading…' : selectedProduct ? `Pay ETB ${parseFloat(selectedProduct.price).toLocaleString()} & Upgrade` : 'Select a tier to upgrade'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={onClose} style={{ paddingVertical: 12, alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ color: MUTED, fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

// ── Node Info Modal Component ──
const NodeInfoModal = ({ visible, node, distributorId, onClose, onUpgrade, C }) => {
  if (!node) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: C.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border }}>

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <LinearGradient
              colors={node.status === 'inactive' ? RANK_COLORS.None : (RANK_COLORS[node.rank] || RANK_COLORS.None)}
              style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
            >
              <User color="#fff" size={28} />
            </LinearGradient>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>{node.distributor_name}</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
              {node.status === 'inactive' ? 'Inactive Customer' : `${node.rank} Rank`}
            </Text>
          </View>

          <View style={{ gap: 12, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: C.muted, fontSize: 12 }}>Email</Text>
              <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{node.distributor_email}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: C.muted, fontSize: 12 }}>Phone</Text>
              <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{node.distributor_phone}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
              <Text style={{ color: C.muted, fontSize: 12 }}>Package Points</Text>
              <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '800' }}>{node.own_points || node.product_points || 0} PTS</Text>
            </View>
          </View>

          {/* Upgrade button — shown for all nodes */}
          <TouchableOpacity onPress={onUpgrade}
            style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
            <LinearGradient colors={['#F59E0B', '#F97316']} start={[0,0]} end={[1,0]}
              style={{ paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpCircle color="#fff" size={18} />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginLeft: 8 }}>Upgrade Account</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 13, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.muted, fontWeight: '600', fontSize: 14 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const TreeScreen = ({ C, navigate }) => {
  const [treeData, setTreeData]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [notJoined, setNotJoined]     = useState(false);
  const [error, setError]             = useState(null);
  const [scale, setScale]             = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [distributorId, setDistributorId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchTree();
      getUser().then(u => { if (u?.distributor_id) setDistributorId(u.distributor_id); });
    }, [])
  );

  const fetchTree = async () => {
    try {
      setLoading(true);
      setNotJoined(false);
      setError(null);
      const res = await getMyTree();
      setTreeData(res.tree);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        // Distributor hasn't joined the network yet — not an error
        setNotJoined(true);
      } else if (status === 401) {
        console.log('Tree error: Unauthorized (401)');
        setError('Your session has expired or is invalid. Please log out and log in again.');
      } else {
        console.log('Tree error:', err.message);
        setError(err.message || 'Failed to load tree.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = async (node) => {
    setSelectedNode(node);
    if (!node.has_more) return;
    try {
      const res = await getSubtreeData(node.id);
      setTreeData(res.tree);
    } catch (err) {
      console.log('Expand error', err);
    }
  };

  const handleZoom = (factor) => {
    setScale(prev => Math.min(Math.max(0.3, prev + factor), 2));
  };

  const handleResetZoom = () => {
    setScale(1);
    fetchTree();
  };

  if (loading && !treeData) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.muted, marginTop: 12 }}>Loading your network tree...</Text>
      </View>
    );
  }

  // ── Not joined yet ──
  if (notJoined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <LinearGradient
          colors={['#064E3B', '#065F46', '#10B981']}
          style={{ width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
        >
          <Network color="#FCD34D" size={42} />
        </LinearGradient>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
          You're Not in the Tree Yet
        </Text>
        <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
          Purchase a product package from the Products screen to activate your account and get placed in the MLM network tree.
        </Text>
        <TouchableOpacity onPress={() => navigate('products')}>
          <LinearGradient
            colors={['#064E3B', '#10B981']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Text style={{ color: '#FCD34D', fontSize: 18 }}>⚡</Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Go to Products → Activate</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={fetchTree} style={{ marginTop: 16 }}>
          <Text style={{ color: C.muted, fontSize: 12 }}>Tap to refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Real error ──
  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Network color={C.muted} size={48} />
        <Text style={{ color: C.red, marginTop: 12, textAlign: 'center', fontWeight: '600' }}>{error}</Text>
        <TouchableOpacity
          onPress={fetchTree}
          style={{ marginTop: 20, backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header Info */}
      <View style={{ marginBottom: 10 }}>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: '800' }}>Placement Tree</Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>View and manage your 4-leg downline</Text>
      </View>

      {/* Controls */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 10, zIndex: 10 }}>
        <TouchableOpacity onPress={() => handleZoom(0.2)} style={{ backgroundColor: C.surface, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
          <ZoomIn color={C.text} size={18} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleZoom(-0.2)} style={{ backgroundColor: C.surface, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
          <ZoomOut color={C.text} size={18} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleResetZoom} style={{ backgroundColor: C.surface, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
          <Maximize color={C.text} size={18} />
        </TouchableOpacity>
      </View>

      {/* Interactive Tree View */}
      <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
        <ScrollView horizontal maximumZoomScale={3} minimumZoomScale={0.5} contentContainerStyle={{ minWidth: width * 2 }}>
          <ScrollView contentContainerStyle={{ paddingVertical: 40, alignItems: 'center', minWidth: width * 2 }}>
            <View style={{ transform: [{ scale }] }}>
              {treeData && <TreeNode node={treeData} isRoot={true} C={C} onNodeClick={handleNodeClick} />}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
      
      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, paddingBottom: 20 }}>
        {Object.entries(RANK_COLORS).map(([rank, colors]) => (
          <View key={rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors[0] }} />
            <Text style={{ color: C.muted, fontSize: 11 }}>{rank}</Text>
          </View>
        ))}
      </View>

      <NodeInfoModal
        visible={!!selectedNode && !showUpgrade}
        node={selectedNode}
        distributorId={distributorId}
        onClose={() => setSelectedNode(null)}
        onUpgrade={() => setShowUpgrade(true)}
        C={C}
      />

      <AccountUpgradeModal
        visible={showUpgrade}
        node={selectedNode}
        distributorId={distributorId}
        onClose={() => { setShowUpgrade(false); setSelectedNode(null); }}
        onUpgraded={() => { setShowUpgrade(false); setSelectedNode(null); fetchTree(); }}
        C={C}
      />
    </View>
  );
};

export default TreeScreen;
