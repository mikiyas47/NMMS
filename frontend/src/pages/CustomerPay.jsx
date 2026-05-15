import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Lock, ShoppingBag, CreditCard, CheckCircle, XCircle, TrendingUp, Package, Eye, EyeOff } from 'lucide-react';

const API_BASE = 'https://nmms-backend.onrender.com/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toHttps = (url) => url ? url.replace(/^http:\/\//, 'https://') : null;
const isVideoUrl = (url) => url && (url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') || url.includes('/video/'));

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page:    { minHeight: '100vh', backgroundColor: '#0A0F1E', fontFamily: "'Inter', sans-serif", color: '#F9FAFB' },
  card:    { backgroundColor: '#111827', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
  label:   { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' },
  input:   { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.9rem 1rem', color: '#F9FAFB', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' },
  btn:     { width: '100%', background: 'linear-gradient(135deg, #4F46E5, #6366F1)', color: '#fff', fontWeight: '900', fontSize: '1.1rem', padding: '1.1rem', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' },
  btnGold: { width: '100%', background: 'linear-gradient(135deg, #F59E0B, #F97316)', color: '#fff', fontWeight: '900', fontSize: '1rem', padding: '1rem', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' },
  btnGray: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '1rem', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' },
  error:   { backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '0.9rem 1rem', borderRadius: '12px', marginBottom: '1.25rem', fontWeight: '500', fontSize: '0.9rem' },
};

// ─── Product Media ─────────────────────────────────────────────────────────────
const ProductMedia = ({ product }) => {
  const uri = toHttps(product?.image);
  const isVid = isVideoUrl(uri);
  if (!uri) return (
    <div style={{ width: '100%', height: '220px', backgroundColor: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px 16px 0 0' }}>
      <Package color="#6366F1" size={52} />
    </div>
  );
  if (isVid) return (
    <video src={uri} autoPlay loop muted playsInline controls
      style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '16px 16px 0 0', display: 'block' }} />
  );
  return (
    <img src={uri} alt={product?.name}
      style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '16px 16px 0 0', display: 'block' }} />
  );
};

// ─── Product Card ──────────────────────────────────────────────────────────────
const ProductCard = ({ product }) => (
  <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #6366F1', backgroundColor: 'rgba(99,102,241,0.08)', marginBottom: '1.5rem', position: 'relative' }}>
    <ProductMedia product={product} />
    {product?.category && (
      <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: '#6366F1', padding: '3px 10px', borderRadius: '20px' }}>
        <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.05em' }}>{product.category.toUpperCase()}</span>
      </div>
    )}
    <div style={{ padding: '1rem' }}>
      <h2 style={{ color: '#F9FAFB', fontSize: '1.2rem', fontWeight: '900', margin: '0 0 0.5rem 0' }}>{product?.name}</h2>
      {product?.description && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: '1.5', margin: '0 0 0.75rem 0' }}>{product.description}</p>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#6366F1', fontSize: '1.4rem', fontWeight: '900' }}>ETB {parseFloat(product?.price ?? 0).toFixed(2)}</span>
        {product?.point && (
          <span style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '4px 10px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800' }}>★ {product.point} pts</span>
        )}
      </div>
    </div>
  </div>
);

// ─── Password Input ────────────────────────────────────────────────────────────
const PasswordInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder}
        style={{ ...S.input, paddingRight: '3rem' }} />
      <button type="button" onClick={() => setShow(v => !v)}
        style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const CustomerPay = () => {
  const [searchParams] = useSearchParams();
  const distributorId       = searchParams.get('distributor_id');
  const preSelectedProductId = searchParams.get('product_id');
  const leg                 = searchParams.get('leg');
  const returnTxRef         = searchParams.get('tx_ref');

  const [products, setProducts]         = useState([]);
  const [selectedProduct, setSelected]  = useState(null);
  const [quantity, setQuantity]         = useState(1);
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [phone, setPhone]               = useState('');
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');

  // Post-payment state
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'success' | 'failed'
  const [txRef, setTxRef]               = useState(returnTxRef || null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Upgrade state
  const [upgradeStep, setUpgradeStep]   = useState('choice'); // 'choice' | 'form' | 'loading' | 'done'
  const [password, setPassword]         = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [upgradeError, setUpgradeError] = useState('');
  const stayCalledRef                   = useRef(false);

  useEffect(() => {
    if (returnTxRef) {
      // Came back from Chapa — restore customer info from localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('nmms_checkout') || '{}');
        if (saved.name)   setName(saved.name);
        if (saved.email)  setEmail(saved.email);
        if (saved.phone)  setPhone(saved.phone);
        if (saved.amount) setPaymentAmount(saved.amount);
        if (saved.tx_ref) setTxRef(saved.tx_ref);
      } catch {}
      verifyPayment(returnTxRef);
    } else {
      loadProducts();
    }
  }, [returnTxRef]);

  // When payment succeeds, immediately register customer as inactive in tree
  useEffect(() => {
    if (paymentStatus === 'success' && txRef && email && !stayCalledRef.current) {
      stayCalledRef.current = true;
      fetch(`${API_BASE}/payments/stay-as-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ tx_ref: txRef, customer_email: email }),
      }).catch(e => console.log('stayAsCustomer error (non-fatal):', e.message));
    }
  }, [paymentStatus, txRef, email]);

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const responseData = await res.json();
      const data = responseData.data || responseData || [];
      setProducts(data);
      if (preSelectedProductId) {
        const found = data.find(p => String(p.id) === String(preSelectedProductId));
        if (found) setSelected(found);
      }
    } catch {
      setError('Could not load products. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (ref) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/payments/verify/${ref}`);
      const data = await res.json();
      setPaymentStatus(data.status === 'success' ? 'success' : 'failed');
      if (data.amount) setPaymentAmount(data.amount);
    } catch {
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return setError('Please select a product.');
    if (!name.trim() || !email.trim()) return setError('Name and email are required.');
    if (!distributorId) return setError('Invalid link: missing distributor info.');
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          distributor_id: distributorId,
          quantity,
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim() || undefined,
          leg: leg || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment initiation failed.');
      if (data.payment_url) {
        // Save customer info to localStorage so we can restore it after Chapa redirect
        localStorage.setItem('nmms_checkout', JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          product_id: selectedProduct.id,
          tx_ref: data.tx_ref,
          amount: data.amount,
        }));
        window.location.href = data.payment_url;
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleUpgrade = async () => {
    if (!password || password.length < 6) return setUpgradeError('Password must be at least 6 characters.');
    if (password !== confirmPw) return setUpgradeError('Passwords do not match.');
    setUpgradeError('');
    setUpgradeStep('loading');
    try {
      const res = await fetch(`${API_BASE}/customer/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password, password_confirmation: confirmPw, tx_ref: txRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upgrade failed.');
      localStorage.removeItem('nmms_checkout');
      setUpgradeStep('done');
    } catch (err) {
      setUpgradeError(err.message);
      setUpgradeStep('form');
    }
  };

  const total = selectedProduct ? (parseFloat(selectedProduct.price) * quantity).toFixed(2) : '0.00';

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontSize: '1.1rem' }}>Loading secure checkout…</p>
    </div>
  );

  // ── Payment Failed ───────────────────────────────────────────────────────────
  if (paymentStatus === 'failed') return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ ...S.card, textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <XCircle color="#fff" size={40} />
        </div>
        <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>Payment Failed</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>Your payment could not be processed. Please try again.</p>
        <button onClick={() => window.location.href = window.location.pathname + `?distributor_id=${distributorId}&product_id=${preSelectedProductId}&leg=${leg}`}
          style={{ ...S.btn, background: '#DC2626' }}>Try Again</button>
      </div>
    </div>
  );

  // ── Payment Success ──────────────────────────────────────────────────────────
  if (paymentStatus === 'success') return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ ...S.card, maxWidth: '440px', width: '100%' }}>
        {/* Success header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #34D399)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <CheckCircle color="#fff" size={40} />
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: '900', margin: '0 0 0.5rem' }}>Payment Successful!</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>Your order has been confirmed.</p>
        </div>

        {/* Receipt */}
        <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { label: 'Customer', value: name },
            { label: 'Email', value: email },
            { label: 'Amount', value: `ETB ${parseFloat(paymentAmount || 0).toFixed(2)}`, accent: '#10B981' },
            { label: 'Status', value: 'Verified ✓', accent: '#10B981' },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{label}</span>
              <span style={{ color: accent || '#F9FAFB', fontWeight: '700', fontSize: '0.9rem' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Upgrade choice */}
        {upgradeStep === 'choice' && (
          <>
            <div style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <h3 style={{ color: '#F9FAFB', fontWeight: '900', fontSize: '1.1rem', margin: '0 0 0.75rem', textAlign: 'center' }}>🎉 Want to Earn Too?</h3>
              {[
                '💰 Earn referral commissions on every sale',
                '🌳 Build your own 4-leg downline network',
                '🏆 Climb ranks from CT to Alpha Legend',
                '📱 Full access to the distributor dashboard',
              ].map(t => <p key={t} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0.3rem 0' }}>{t}</p>)}
            </div>
            <button onClick={() => setUpgradeStep('form')} style={S.btnGold}>
              <TrendingUp size={20} /> Yes, Become a Distributor!
            </button>
            <button onClick={() => { localStorage.removeItem('nmms_checkout'); setUpgradeStep('stayed'); }} style={S.btnGray}>
              No thanks, stay as customer
            </button>
          </>
        )}

        {/* Password form */}
        {upgradeStep === 'form' && (
          <>
            <h3 style={{ color: '#F9FAFB', fontWeight: '900', textAlign: 'center', marginBottom: '0.5rem' }}>Set Your Password</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Your email: <strong style={{ color: '#6366F1' }}>{email}</strong>
            </p>
            {upgradeError && <div style={S.error}>{upgradeError}</div>}
            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>New Password</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={S.label}>Confirm Password</label>
              <PasswordInput value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password" />
            </div>
            <button onClick={handleUpgrade} style={S.btnGold}>Activate My Distributor Account</button>
            <button onClick={() => setUpgradeStep('choice')} style={{ ...S.btnGray, marginTop: '0.5rem' }}>← Back</button>
          </>
        )}

        {/* Loading */}
        {upgradeStep === 'loading' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ color: '#F9FAFB', fontWeight: '700', fontSize: '1.1rem' }}>Activating your account…</p>
          </div>
        )}

        {/* Done */}
        {upgradeStep === 'done' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #34D399)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <CheckCircle color="#fff" size={36} />
            </div>
            <h3 style={{ color: '#F9FAFB', fontWeight: '900', fontSize: '1.3rem', marginBottom: '0.5rem' }}>Welcome, Distributor!</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Your account is active. Download the NMMS app to get started.</p>
          </div>
        )}

        {/* Stayed as customer */}
        {upgradeStep === 'stayed' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
              ✅ You're registered as a customer. Enjoy your product!
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Checkout Form ────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #312E81, #4338CA)', padding: '2.5rem 1.5rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.9rem', borderRadius: '16px' }}>
            <ShoppingBag color="#fff" size={28} />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>Secure Checkout</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', margin: 0, fontSize: '0.9rem' }}>Official Product Portal · Powered by Chapa</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: '600px', width: '100%', margin: '-1.5rem auto 2rem', padding: '0 1rem', position: 'relative', zIndex: 10 }}>
        <div style={S.card}>
          {error && <div style={S.error}>{error}</div>}

          <form onSubmit={handlePay}>
            {/* Product — show card if pre-selected, picker otherwise */}
            {selectedProduct ? (
              <>
                <label style={S.label}>Product</label>
                <ProductCard product={selectedProduct} />
                {!preSelectedProductId && (
                  <button type="button" onClick={() => setSelected(null)}
                    style={{ ...S.btnGray, marginBottom: '1.5rem', padding: '0.6rem' }}>
                    Change product
                  </button>
                )}
              </>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={S.label}>Select Product *</label>
                <select value={selectedProduct?.id || ''} onChange={e => setSelected(products.find(p => String(p.id) === e.target.value))}
                  style={{ ...S.input, cursor: 'pointer' }} required>
                  <option value="" disabled>Choose a product…</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} style={{ color: '#000' }}>
                      {p.name} — ETB {parseFloat(p.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity + Total */}
            {selectedProduct && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Quantity</label>
                  <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.4rem' }}>
                    <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>−</button>
                    <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontWeight: '800', fontSize: '1.2rem' }}>{quantity}</span>
                    <button type="button" onClick={() => setQuantity(q => q + 1)}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
                <div style={{ flex: 1, backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '0.9rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ color: '#818CF8', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Total Due</span>
                  <span style={{ color: '#818CF8', fontSize: '1.4rem', fontWeight: '900' }}>ETB {total}</span>
                </div>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '1.5rem 0' }} />

            {/* Customer Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={S.label}>Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Email Address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john@example.com" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+251 911 234 567" style={S.input} />
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={submitting || !selectedProduct}
              style={{ ...S.btn, opacity: (submitting || !selectedProduct) ? 0.5 : 1, cursor: (submitting || !selectedProduct) ? 'not-allowed' : 'pointer' }}>
              <CreditCard size={22} />
              {submitting ? 'PROCESSING…' : `PAY ETB ${total} SECURELY`}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.25rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontWeight: '700' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Shield size={13} /> SSL Encrypted</span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Lock size={13} /> Chapa Secured</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerPay;
