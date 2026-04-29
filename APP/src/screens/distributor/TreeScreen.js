import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Network, ZoomIn, ZoomOut, Maximize, User, Zap } from 'lucide-react-native';
import { getMyTree, getSubtreeData } from '../../api/authService';

const { width, height } = Dimensions.get('window');

const RANK_COLORS = {
  None: ['#9CA3AF', '#4B5563'],
  MT: ['#FBBF24', '#D97706'], // Yellow/Amber
  TT: ['#F97316', '#C2410C'], // Orange
  NTB: ['#34D399', '#059669'], // Green
  IBB: ['#60A5FA', '#2563EB'], // Blue
  GEB: ['#C084FC', '#7E22CE'], // Purple
};

const TreeNode = ({ node, isRoot = false, C, onExpand }) => {
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
        onPress={() => onExpand(node)}
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
          <Text style={{ color: C.text, fontSize: 10, fontWeight: '800' }}>{node.distributor_name}</Text>
        </View>
        <Text style={{ color: C.muted, fontSize: 9, marginTop: 2 }}>{node.total_points} PTS</Text>
        <Text style={{ color: rankColors[0], fontSize: 9, fontWeight: '700' }}>{node.rank}</Text>
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
                    <TreeNode node={child} C={C} onExpand={onExpand} />
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
            onPress={() => onExpand(node)}
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}
          >
            <Text style={{ color: C.accent, fontSize: 10, fontWeight: '700' }}>Load Subtree</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const TreeScreen = ({ C, navigate }) => {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notJoined, setNotJoined] = useState(false);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    fetchTree();
  }, []);

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
      } else {
        console.log('Tree error:', err.message);
        setError(err.message || 'Failed to load tree.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (node) => {
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
              {treeData && <TreeNode node={treeData} isRoot={true} C={C} onExpand={handleExpand} />}
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
    </View>
  );
};

export default TreeScreen;
