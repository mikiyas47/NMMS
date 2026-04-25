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
    // If returning from Chapa, verify the payment status
    if (returnTxRef) {
      verifyPayment(returnTxRef);
    } else {
      loadProducts();
    }
  }, [returnTxRef]);

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
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
        throw new Error(data.message || 'Payment initiation failed.');
      }

      if (data.payment_url) {
        // Redirect browser to Chapa checkout
        window.location.href = data.payment_url;
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // ── RESULT SCREEN (Returned from Chapa) ──
  if (paymentResult) {
    const isSuccess = paymentResult === 'success';
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isSuccess ? 'bg-emerald-950' : 'bg-red-950'}`}>
        <div className="max-w-md w-full bg-gray-900 rounded-3xl p-8 border border-white/10 text-center shadow-2xl">
          <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ${isSuccess ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
            {isSuccess ? <CheckCircle className="text-white" size={48} /> : <XCircle className="text-white" size={48} />}
          </div>
          <h2 className="text-3xl font-black text-white mb-2">
            {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
          </h2>
          <p className="text-gray-400 mb-8">
            {isSuccess 
              ? 'Your order has been confirmed. A receipt has been sent to your email.'
              : 'Your payment could not be processed. Please try again.'}
          </p>
          <button 
            onClick={() => window.location.href = window.location.pathname + `?distributor_id=${distributorId}`}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all ${isSuccess ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
          >
            {isSuccess ? 'Done' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  const total = selectedProduct ? (parseFloat(selectedProduct.price) * quantity).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col font-sans">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-600 p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5 blur-xl"></div>
        <div className="max-w-2xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <ShoppingBag className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Secure Checkout</h1>
              <p className="text-indigo-200 font-medium mt-1">Official Product Portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 -mt-6 sm:-mt-8 relative z-20">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-6">
            {/* Product Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2 uppercase">Selected Product</label>
              <select 
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find(p => String(p.id) === e.target.value);
                  setSelected(p);
                }}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                required
              >
                <option value="" disabled>Choose a product...</option>
                {products.filter(p => p.stock > 0).map(p => (
                  <option key={p.id} value={p.id}>{p.name} - ETB {parseFloat(p.price).toFixed(2)}</option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2 uppercase">Quantity</label>
                  <div className="flex items-center bg-gray-800/50 border border-gray-700 rounded-xl p-2">
                    <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition">-</button>
                    <span className="flex-1 text-center font-bold text-white text-lg">{quantity}</span>
                    <button type="button" onClick={() => setQuantity(q => Math.min(selectedProduct.stock, q + 1))} className="w-10 h-10 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition">+</button>
                  </div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase mb-1">Total Due</span>
                  <span className="text-2xl font-black text-indigo-400">ETB {total}</span>
                </div>
              </div>
            )}

            <hr className="border-gray-800 my-6" />

            {/* Customer Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2 uppercase">Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2 uppercase">Email Address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2 uppercase">Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="+251 911 234 567" />
              </div>
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              disabled={submitting || !selectedProduct}
              className="w-full mt-8 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-lg p-5 rounded-2xl shadow-xl shadow-indigo-900/50 transition-all flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <CreditCard size={24} />
                  PAY ETB {total} SECURELY
                </>
              )}
            </button>
            
            <div className="flex items-center justify-center gap-4 mt-6 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1"><Shield size={14} /> System Verified</span>
              <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
              <span className="flex items-center gap-1"><Lock size={14} /> Chapa Secured</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerPay;
