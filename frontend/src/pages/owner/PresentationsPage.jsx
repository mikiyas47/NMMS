import { useState, useEffect } from 'react';
import { FileText, Video, Trash2, Link as LinkIcon, RefreshCw, Network } from 'lucide-react';
import client from '../../api/client';

// Resolve a relative storage path to a full backend URL
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace('/api', '');
const resolveUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url; // already absolute
  return `${API_BASE}${url}`; // e.g. /storage/presentations/abc.jpg → http://127.0.0.1:8000/storage/...
};

const PresentationsPage = ({ dark }) => {
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('video');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState(null);

  const fetchPresentations = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/owner/presentations');
      setPresentations(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresentations();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title) return alert('Title is required');
    if (!file && !externalUrl && type !== 'compensation_plan') return alert('Please provide a file or an external URL');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('content_type', type);
      if (description) fd.append('description', description);
      if (externalUrl) fd.append('external_url', externalUrl);
      if (file) fd.append('file', file);

      await client.post('/owner/presentations', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTitle('');
      setDescription('');
      setExternalUrl('');
      setFile(null);
      fetchPresentations();
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this presentation?')) return;
    try {
      await client.delete(`/owner/presentations/${id}`);
      fetchPresentations();
    } catch (e) {
      alert('Delete failed');
    }
  };

  return (
    <div className={`p-6 ${dark ? 'text-white' : 'text-gray-900'}`} style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>Global Presentations</h1>
        <button onClick={fetchPresentations} style={{ padding: '8px 12px', background: '#3B82F6', color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Upload Form */}
        <div style={{ flex: '1 1 300px', background: dark ? '#1E293B' : '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Upload New</h2>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ccc', background: dark ? '#334155' : '#fff', color: dark ? '#fff' : '#000' }}>
                <option value="video">Video Presentation</option>
                <option value="pdf">PDF Document</option>
                <option value="compensation_plan">Compensation Plan (Animated)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. 2026 Welcome Overview" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ccc', background: dark ? '#334155' : '#fff', color: dark ? '#fff' : '#000' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description..." style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ccc', background: dark ? '#334155' : '#fff', color: dark ? '#fff' : '#000' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>External URL (Optional)</label>
              <input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://youtube.com/..." style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ccc', background: dark ? '#334155' : '#fff', color: dark ? '#fff' : '#000' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>File Upload (Optional if URL provided)</label>
              <input type="file" onChange={(e) => setFile(e.target.files[0])} accept={type === 'pdf' ? '.pdf' : type === 'video' ? 'video/*' : type === 'compensation_plan' ? 'image/*,.pdf' : '*/*'} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ccc', background: dark ? '#334155' : '#fff', color: dark ? '#fff' : '#000' }} />
            </div>

            {type === 'compensation_plan' && (
              <p style={{ fontSize: 12, color: '#F59E0B' }}>You can upload an image or PDF of your compensation plan. The system will automatically generate interactive animations based on the provided file or structural data.</p>
            )}

            <button type="submit" disabled={uploading} style={{ padding: '12px', background: '#10B981', color: '#fff', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: 8 }}>
              {uploading ? 'Uploading...' : 'Save Presentation'}
            </button>
          </form>
        </div>

        {/* List */}
        <div style={{ flex: '2 1 400px' }}>
          {loading ? (
            <p>Loading...</p>
          ) : presentations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, background: dark ? '#1E293B' : '#fff', borderRadius: 16 }}>
              <p style={{ color: '#64748B' }}>No presentations found. Upload one to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {presentations.map(p => (
                <div key={p.id} style={{ background: dark ? '#1E293B' : '#fff', borderRadius: 16, padding: 16, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.content_type === 'video' ? <Video size={20} color="#3B82F6" /> : p.content_type === 'compensation_plan' ? <Network size={20} color="#F59E0B" /> : <FileText size={20} color="#EF4444" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>{p.title}</h3>
                      <p style={{ fontSize: 12, color: '#64748B', margin: 0, textTransform: 'capitalize' }}>{p.content_type.replace('_', ' ')}</p>
                    </div>
                  </div>

                  {p.description && <p style={{ fontSize: 13, color: dark ? '#cbd5e1' : '#475569', marginBottom: 16, flex: 1 }}>{p.description}</p>}

                  {/* Image preview for compensation plan images */}
                  {p.content_type === 'compensation_plan' && p.file_url && (p.file_url.endsWith('.jpg') || p.file_url.endsWith('.jpeg') || p.file_url.endsWith('.png') || p.file_url.endsWith('.webp')) && (
                    <img
                      src={resolveUrl(p.file_url)}
                      alt={p.title}
                      style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }}
                    />
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, paddingTop: 12 }}>
                    {(p.file_url || p.external_url) ? (
                      <a
                        href={resolveUrl(p.file_url) || p.external_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <LinkIcon size={12} /> View File
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>No file</span>
                    )}
                    <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresentationsPage;
