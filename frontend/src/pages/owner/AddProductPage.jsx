import { useState, useEffect, useRef } from 'react';
import {
  Package, Tag, DollarSign, Archive, FileText, Search,
  Edit2, Trash2, Plus, Check, X, Image as ImageIcon,
} from 'lucide-react';
import client from '../../api/client';

const CATEGORIES = ['Electronics', 'Clothing', 'Health', 'Food', 'Digital', 'Other'];

const isVideoUrl = (url) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  // Check for video extensions or Cloudinary video resource type
  return lowerUrl.endsWith('.mp4') || 
         lowerUrl.endsWith('.mov') || 
         lowerUrl.endsWith('.avi') || 
         lowerUrl.endsWith('.mkv') || 
         lowerUrl.includes('/video/upload/') ||
         lowerUrl.includes('/v1/');
};

const secureUrl = (url) => {
  if (!url) return null;
  // Ensure HTTPS for all URLs
  let secure = url.replace(/^http:\/\//i, 'https://');
  
  // For Cloudinary URLs, they should already be HTTPS
  // But we add resource_type=video hint for better browser detection
  if (secure.includes('res.cloudinary.com') && secure.includes('/video/')) {
    // Ensure video URLs have proper format
    return secure;
  }
  
  return secure;
};

const AddProductPage = () => {
  const [form, setForm] = useState({
    name: '', price: '', description: '', stock: '', point: '', image: null,
  });
  const [selCat,      setSelCat]      = useState('');
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [products,    setProducts]    = useState([]);
  const [showList,    setShowList]    = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [searchQ,     setSearchQ]     = useState('');
  const [filterCat,   setFilterCat]   = useState('All');
  const [deleting,    setDeleting]    = useState(null);
  const [viewMedia,   setViewMedia]   = useState(null);
  const fileRef = useRef();

  const fetchProducts = async () => {
    try {
      const res = await client.get('/products');
      setProducts(res.data?.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setForm((p) => ({ ...p, image: file, imagePreview: URL.createObjectURL(file) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !selCat) {
      alert('Please fill in Name, Price, and Category.'); return;
    }
    setLoading(true);
    try {
      let res;
      if (form.image && form.image instanceof File) {
        const fd = new FormData();
        fd.append('name',        form.name);
        fd.append('price',       parseFloat(form.price));
        fd.append('category',    selCat);
        fd.append('stock',       form.stock ? parseInt(form.stock) : 0);
        fd.append('point',       form.point ? parseInt(form.point) : 0);
        fd.append('description', form.description || '');
        fd.append('image',       form.image);
        if (editId) fd.append('_method', 'PUT');
        const url = editId ? `/products/${editId}` : '/products';
        res = await client.post(url, fd);
      } else {
        const payload = {
          name: form.name, price: parseFloat(form.price), category: selCat,
          stock: form.stock ? parseInt(form.stock) : 0,
          point: form.point ? parseInt(form.point) : 0,
          description: form.description || '',
        };
        res = editId
          ? await client.put(`/products/${editId}`, payload)
          : await client.post('/products', payload);
      }

      if (res.data?.status === 'success') {
        await fetchProducts();
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setForm({ name: '', price: '', description: '', stock: '', point: '', image: null, imagePreview: null });
          setSelCat(''); setEditId(null);
        }, 2200);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to save product.');
    } finally { setLoading(false); }
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setForm({
      name: p.name, price: String(p.price),
      description: p.description || '', stock: p.stock ? String(p.stock) : '',
      point: p.point ? String(p.point) : '', image: null, imagePreview: secureUrl(p.image),
    });
    setSelCat(p.category); setShowList(false);
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setDeleting(p.id);
    try {
      await client.delete(`/products/${p.id}`);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } catch { alert('Failed to delete product.'); }
    finally { setDeleting(null); }
  };

  const filteredProds = products.filter((p) => {
    const ms = (p.name || '').toLowerCase().includes(searchQ.toLowerCase()) ||
               (p.description || '').toLowerCase().includes(searchQ.toLowerCase());
    const mc = filterCat === 'All' || p.category === filterCat;
    return ms && mc;
  });

  if (success) {
    return (
      <div className="success-screen">
        <div className="success-circle"><Check size={48} color="#10B981" /></div>
        <h3>{editId ? 'Product Updated!' : 'Product Added!'}</h3>
        <p>{editId ? 'Changes saved successfully.' : 'New product is now live in the catalog.'}</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="product-header">
        <div className="page-title-row">
          <div className="icon-grad" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
            <Package size={20} color="#fff" />
          </div>
          <div>
            <h2 className="page-title">{showList ? 'System Product Catalog' : (editId ? 'Edit Product' : 'Add Product')}</h2>
            <p className="page-sub">{showList ? 'Manage your system catalog' : 'Fill in product details'}</p>
          </div>
        </div>
        <button
          id="toggle-product-view"
          className="btn-secondary"
          onClick={() => {
            if (editId && !showList) { setEditId(null); setForm({ name:'',price:'',description:'',stock:'',point:'',image:null,imagePreview:null }); setSelCat(''); setShowList(true); }
            else { setShowList((p) => !p); }
          }}
        >
          {showList ? <><Plus size={15} /> Add New</> : (editId ? <><X size={15} /> Cancel Edit</> : `View All (${products.length})`)}
        </button>
      </div>

      {showList ? (
        /* ── Product List ── */
        <div>
          <div className="toolbar">
            <div className="search-box">
              <Search size={16} />
              <input id="product-search" type="text" placeholder="Search products…"
                value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
            </div>
            <div className="tab-group" style={{ flexWrap: 'wrap' }}>
              {['All', ...CATEGORIES].map((c) => (
                <button key={c} className={`tab-btn ${filterCat === c ? 'active' : ''}`}
                  onClick={() => setFilterCat(c)}>{c}</button>
              ))}
            </div>
          </div>
          {filteredProds.length === 0 ? (
            <div className="empty-state"><Archive size={48} /><p>No products found</p></div>
          ) : (
            <div className="product-grid">
              {filteredProds.map((p) => {
                const url   = secureUrl(p.image);
                const isVid = isVideoUrl(p.image);
                return (
                  <div key={p.id} className="product-card">
                    <div 
                      className="product-thumb" 
                      onClick={() => url && setViewMedia({ url, isVid })}
                      style={{ cursor: url ? 'pointer' : 'default' }}
                    >
                      {url ? (
                        isVid
                          ? <video src={url} muted autoPlay loop playsInline style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                          : <img src={url} alt={p.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                      ) : (
                        <Package size={32} style={{ opacity: 0.3 }} />
                      )}
                      {p.category && <span className="cat-chip">{p.category.toUpperCase()}</span>}
                    </div>
                    <div className="product-body">
                      <p className="product-name">{p.name}</p>
                      <div className="product-meta">
                        <span className="product-price">${parseFloat(p.price).toFixed(2)}</span>
                        <span className="muted">Stock: {p.stock || 0}</span>
                      </div>
                      <div className="product-actions">
                        <button className="action-btn edit" onClick={() => handleEdit(p)} id={`edit-product-${p.id}`}>
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          className="action-btn deactivate"
                          onClick={() => handleDelete(p)}
                          disabled={deleting === p.id}
                          id={`delete-product-${p.id}`}
                        >
                          <Trash2 size={12} /> {deleting === p.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Add / Edit Form ── */
        <form className="product-form" onSubmit={handleSubmit}>
          {/* Image Upload */}
          <div className="field-group">
            <label className="field-label">Media Cover *</label>
            <div
              className="media-upload"
              onClick={() => fileRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              {form.imagePreview ? (
                isVideoUrl(form.imagePreview)
                  ? <video src={form.imagePreview} muted autoPlay loop style={{ width:'100%',height:'100%',objectFit:'cover',borderRadius:12 }} />
                  : <img src={form.imagePreview} alt="preview" style={{ width:'100%',height:'100%',objectFit:'cover',borderRadius:12 }} />
              ) : (
                <div className="upload-placeholder">
                  <ImageIcon size={32} />
                  <p>Click to upload image or video</p>
                  <span>JPG, PNG, MP4 supported</span>
                </div>
              )}
              <input id="product-image" type="file" accept="image/*,video/*" ref={fileRef} style={{ display:'none' }} onChange={handleFileChange} />
            </div>
          </div>

          {/* Name */}
          <div className="field-group">
            <label className="field-label" htmlFor="prod-name">Product Name *</label>
            <div className="input-wrapper">
              <Tag size={16} className="input-icon" />
              <input id="prod-name" type="text" className="field-input has-icon" placeholder="e.g. Premium Health Kit"
                value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
          </div>

          {/* Price / Stock / Point row */}
          <div className="form-row">
            <div className="field-group">
              <label className="field-label" htmlFor="prod-price">Price (USD) *</label>
              <div className="input-wrapper">
                <DollarSign size={16} className="input-icon" color="#10B981" />
                <input id="prod-price" type="number" step="0.01" className="field-input has-icon" placeholder="0.00"
                  value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="prod-stock">Stock</label>
              <div className="input-wrapper">
                <Archive size={16} className="input-icon" />
                <input id="prod-stock" type="number" className="field-input has-icon" placeholder="Qty"
                  value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="prod-points">Points</label>
              <div className="input-wrapper">
                <Tag size={16} className="input-icon" />
                <input id="prod-points" type="number" className="field-input has-icon" placeholder="Pts"
                  value={form.point} onChange={(e) => setForm((p) => ({ ...p, point: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="field-group">
            <label className="field-label">Category *</label>
            <div className="category-tabs">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" id={`cat-${c}`}
                  className={`tab-btn ${selCat === c ? 'active' : ''}`}
                  onClick={() => setSelCat(c)}>{c}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="field-group">
            <label className="field-label" htmlFor="prod-desc">Description</label>
            <div className="input-wrapper textarea-wrap">
              <FileText size={16} className="input-icon" style={{ marginTop: 14 }} />
              <textarea id="prod-desc" className="field-input has-icon" rows={4} placeholder="Product description…"
                value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>

          <button type="submit" className="btn-primary full-width" disabled={loading} id="submit-product-btn">
            {loading ? <span className="btn-spinner" /> : (
              <>{editId ? <><Check size={16} /> Save Changes</> : <><Plus size={16} /> Create Product</>}</>
            )}
          </button>
        </form>
      )}

      {/* Media Viewer Modal */}
      {viewMedia && (
        <div className="modal-overlay" onClick={() => setViewMedia(null)} style={{ zIndex: 9999 }}>
          <div className="media-viewer-content" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <button 
              className="icon-btn" 
              onClick={() => setViewMedia(null)}
              style={{ position: 'absolute', top: -40, right: -40, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', padding: 8 }}
            >
              <X size={24} />
            </button>
            {viewMedia.isVid ? (
              <video src={viewMedia.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} />
            ) : (
              <img src={viewMedia.url} alt="Product Media" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProductPage;
