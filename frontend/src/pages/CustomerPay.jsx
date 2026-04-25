import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Lock, ShoppingBag, CreditCard, CheckCircle, XCircle } from 'lucide-react';

const API_BASE = 'https://nmms-backend.onrender.com/api';

const CustomerPay = () => {
  const [searchParams] = useSearchParams();
  const distributorId = searchParams.get('distributor_id');
  const preSelectedProductId = searchParams.get('product_id');

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Status after returning from Chapa
  const returnTxRef = searchParams.get('tx_ref');
  const [paymentResult, setPaymentResult] = useState(null); // 'success' | 'failed'

  useEffect(() => {
    if (returnTxRef) {
      verifyPayment(returnTxRef);
    } else {
      loadProducts();
    }
  }, [returnTxRef]);

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const responseData = await res.json();
      const data = responseData.data || responseData || []; // Handle wrapped or unwrapped
      setProducts(data);
      if (preSelectedProductId) {
        const found = data.find(p => String(p.id) === String(preSelectedProductId));
        if (found) setSelected(found);
      }
    } catch (err) {
      setError('Could not load products. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (txRef) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/payments/verify/${txRef}`);
      const data = await res.json();
      if (data.status === 'success') {
        setPaymentResult('success');
      } else {
        setPaymentResult('failed');
      }
    } catch (err) {
      setPaymentResult('failed');
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
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          distributor_id: distributorId,
          quantity: quantity,
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim()
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        let errorMsg = data.message || 'Payment initiation failed.';
        if (data.errors && typeof data.errors === 'object') {
          const firstError = Object.values(data.errors)[0];
          if (Array.isArray(firstError)) errorMsg = firstError[0];
          else if (typeof firstError === 'string') errorMsg = firstError;
        } else if (typeof errorMsg === 'object') {
          errorMsg = JSON.stringify(errorMsg);
        }
        throw new Error(errorMsg);
      }

      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const total = selectedProduct ? (parseFloat(selectedProduct.price) * quantity).toFixed(2) : '0.00';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#fff', fontSize: '1.2rem' }}>Loading secure checkout...</p>
      </div>
    );
  }

  if (paymentResult) {
    const isSuccess = paymentResult === 'success';
    return (
      <div style={{ minHeight: '100vh', backgroundColor: isSuccess ? '#064E3B' : '#450A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ backgroundColor: '#111827', borderRadius: '24px', padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: isSuccess ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            {isSuccess ? <CheckCircle color="#fff" size={40} /> : <XCircle color="#fff" size={40} />}
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
            {isSuccess ? 'Your order has been confirmed. A receipt has been sent to your email.' : 'Your payment could not be processed. Please try again.'}
          </p>
          <button 
            onClick={() => window.location.href = window.location.pathname + `?distributor_id=${distributorId}`}
            style={{ width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: isSuccess ? '#059669' : '#DC2626', color: '#fff' }}
          >
            {isSuccess ? 'Done' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0F1E', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #312E81, #4338CA)', padding: '3rem 2rem', position: 'relative' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '16px' }}>
            <ShoppingBag color="#fff" size={32} />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: '900', margin: 0 }}>Secure Checkout</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>Official Product Portal</p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div style={{ flex: 1, maxWidth: '600px', width: '100%', margin: '-2rem auto 2rem auto', padding: '0 1rem', position: 'relative', zIndex: 10 }}>
        <div style={{ backgroundColor: '#111827', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          
          {error && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '500' }}>
              {error}
            </div>
          )}

          <form onSubmit={handlePay}>
            {/* Product Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Selected Product</label>
              <select 
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find(p => String(p.id) === e.target.value);
                  setSelected(p);
                }}
                style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', color: '#fff', fontSize: '1rem', appearance: 'none', cursor: 'pointer' }}
                required
              >
                <option value="" disabled>Choose a product...</option>
                {products.filter(p => p.stock > 0).map(p => (
                  <option key={p.id} value={p.id} style={{ color: '#000' }}>{p.name} - ETB {parseFloat(p.price).toFixed(2)}</option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Quantity</label>
                  <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.5rem' }}>
                    <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>-</button>
                    <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>{quantity}</span>
                    <button type="button" onClick={() => setQuantity(q => Math.min(selectedProduct.stock, q + 1))} style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
                <div style={{ flex: 1, backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ color: '#818CF8', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Total Due</span>
                  <span style={{ color: '#818CF8', fontSize: '1.5rem', fontWeight: '900' }}>ETB {total}</span>
                </div>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '2rem 0' }} />

            {/* Customer Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe"
                  style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', color: '#fff', fontSize: '1rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Email Address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john@example.com"
                  style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', color: '#fff', fontSize: '1rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+251 911 234 567"
                  style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', color: '#fff', fontSize: '1rem', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              disabled={submitting || !selectedProduct}
              style={{ width: '100%', marginTop: '2rem', background: 'linear-gradient(135deg, #4F46E5, #6366F1)', color: '#fff', fontWeight: '900', fontSize: '1.1rem', padding: '1.2rem', borderRadius: '16px', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: (submitting || !selectedProduct) ? 'not-allowed' : 'pointer', opacity: (submitting || !selectedProduct) ? 0.5 : 1 }}
            >
              <CreditCard size={24} />
              {submitting ? 'PROCESSING...' : `PAY ETB ${total} SECURELY`}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 'bold' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Shield size={14} /> System Verified</span>
              <span style={{ width: '4px', height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Lock size={14} /> Chapa Secured</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerPay;
