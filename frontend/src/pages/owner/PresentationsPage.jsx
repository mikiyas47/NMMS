import { useState, useEffect, useRef } from 'react';
import { Play, FileText, DollarSign, Plus, Trash2, Upload, X, Check, AlertCircle } from 'lucide-react';
import client from '../../api/client';

const TYPE_META = {
  video:            { label: 'Video',            icon: Play,       color: '#3B82F6', accept: 'video/*' },
  pdf:              { label: 'PDF',               icon: FileText,   color: '#EF4444', accept: 'application/pdf' },
  compensation_plan:{ label: 'Compensation Plan', icon: DollarSign, color: '#10B981', accept: 'application/pdf,image/*' },
};

// ── Animated Compensation Plan Viewer ────────────────────────────────────────
const CompPlanViewer = ({ data }) => {
  if (!data) return null;
  const { ranks = [], commissions = [], requirements = [], tree_structure } = data;

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Rank Ladder */}
      <h4 style={{ color: 'var(--text)', fontWeight: 800, marginBottom: 16, fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        🏆 Rank Progression
      </h4>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {ranks.map((rank, i) => (
          <div key={rank.name} style={{
            background: rank.color + '22',
            border: `2px solid ${rank.color}`,
            borderRadius: 12,
            padding: '8px 14px',
            textAlign: 'center',
            minWidth: 80,
            animation: `fadeInUp 0.4s ease ${i * 0.08}s both`,
          }}>
            <div style={{ fontWeight: 900, color: rank.color, fontSize: '1rem' }}>{rank.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{rank.label}</div>
            {rank.bonus && (
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10B981', marginTop: 4 }}>
                +${rank.bonus.toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Commission Structure */}
      <h4 style={{ color: 'var(--text)', fontWeight: 800, marginBottom: 12, fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        💰 Commission Structure
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {commissions.map((c, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            borderLeft: '4px solid #10B981',
          }}>
            <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{c.type}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10B981', marginBottom: 6 }}>{c.rate}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.description}</div>
          </div>
        ))}
      </div>

      {/* Rank Requirements */}
      {requirements.length > 0 && (
        <>
          <h4 style={{ color: 'var(--text)', fontWeight: 800, marginBottom: 12, fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            📋 Rank Requirements
          </h4>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Points</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Leg Requirement</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 800, color: 'var(--text)' }}>{r.rank}</td>
                    <td style={{ padding: '10px 16px', color: '#6366F1', fontWeight: 700 }}>{r.total_pts?.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{r.legs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tree Structure */}
      {tree_structure && (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 800, color: '#6366F1', marginBottom: 6 }}>🌳 Network Structure</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Max legs per distributor: <strong style={{ color: 'var(--text)' }}>{tree_structure.max_legs}</strong> &nbsp;|&nbsp;
            Depth: <strong style={{ color: 'var(--text)' }}>{tree_structure.max_depth}</strong>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>{tree_structure.description}</div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ── Upload Modal ──────────────────────────────────────────────────────────────
const UploadModal = ({ onClose, onSaved }) => {
  const [form, setForm]         = useState({ title: '', content_type: 'video', description: '', external_url: '' });
  const [file, setFile]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [preview, setPreview]   = useState(null);
  const fileRef                 = useRef();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('video/')) setPreview({ type: 'video', url: URL.createObjectURL(f) });
    else if (f.type === 'application/pdf') setPreview({ type: 'pdf', name: f.name });
    else setPreview({ type: 'image', url: URL.createObjectURL(f) });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!file && !form.external_url.trim()) { setError('Upload a file or provide an external URL.'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('content_type', form.content_type);
      if (form.description) fd.append('description', form.description);
      if (form.external_url) fd.append('external_url', form.external_url);
      if (file) fd.append('file', file);
      await client.post('/owner/presentations', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Upload failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3>Upload Presentation</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {/* Content type selector */}
          <div className="field-group">
            <label className="field-label">Content Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(TYPE_META).map(([key, meta]) => {
                const Icon = meta.icon;
                const active = form.content_type === key;
                return (
                  <button key={key} onClick={() => set('content_type', key)} style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, border: `2px solid ${active ? meta.color : 'var(--border)'}`,
                    background: active ? meta.color + '18' : 'var(--bg-input)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    <Icon size={18} color={active ? meta.color : 'var(--text-muted)'} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: active ? meta.color : 'var(--text-muted)' }}>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Title *</label>
            <input className="field-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Business Opportunity Overview" />
          </div>

          <div className="field-group">
            <label className="field-label">Description</label>
            <input className="field-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description..." />
          </div>

          {/* File upload area */}
          <div className="field-group">
            <label className="field-label">Upload File</label>
            <div onClick={() => fileRef.current?.click()} style={{
              border: '2px dashed var(--border)', borderRadius: 12, padding: 24,
              textAlign: 'center', cursor: 'pointer', background: 'var(--bg-input)',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#6366F1'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {preview ? (
                preview.type === 'video' ? (
                  <video src={preview.url} style={{ maxHeight: 120, borderRadius: 8 }} controls />
                ) : preview.type === 'pdf' ? (
                  <div style={{ color: '#EF4444', fontWeight: 700 }}>📄 {preview.name}</div>
                ) : (
                  <img src={preview.url} alt="preview" style={{ maxHeight: 120, borderRadius: 8 }} />
                )
              ) : (
                <>
                  <Upload size={28} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                  <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>Click to upload</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {TYPE_META[form.content_type]?.label} — max 200MB
                  </div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept={TYPE_META[form.content_type]?.accept} onChange={handleFile} style={{ display: 'none' }} />
          </div>

          <div className="field-group">
            <label className="field-label">Or External URL</label>
            <input className="field-input" value={form.external_url} onChange={e => set('external_url', e.target.value)} placeholder="https://..." />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#EF4444', fontSize: '0.875rem', marginBottom: 12 }}>
              ⚠ {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : <><Upload size={15} /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const PresentationsPage = ({ dark }) => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewComp, setViewComp] = useState(null); // presentation with comp_plan_data
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    client.get('/owner/presentations')
      .then(r => setItems(r.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this presentation? This cannot be undone.')) return;
    setDeleting(id);
    try { await client.delete(`/owner/presentations/${id}`); load(); }
    catch (e) { alert(e.response?.data?.message || 'Delete failed.'); }
    finally { setDeleting(null); }
  };

  const grouped = {
    video:             items.filter(i => i.content_type === 'video'),
    pdf:               items.filter(i => i.content_type === 'pdf'),
    compensation_plan: items.filter(i => i.content_type === 'compensation_plan'),
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-title-row">
            <Play size={26} color="#6366F1" />
            <h2 className="page-title">Presentation Library</h2>
          </div>
          <p className="page-sub">Upload videos, PDFs, and compensation plans for distributors to share with prospects</p>
        </div>
        <button className="btn-primary" onClick={() => setShowUpload(true)}>
          <Plus size={15} /> Upload New
        </button>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : (
        <>
          {Object.entries(grouped).map(([type, list]) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            if (list.length === 0) return null;
            return (
              <div key={type} style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: meta.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={meta.color} />
                  </div>
                  <h3 style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem' }}>{meta.label}s</h3>
                  <span className="count-badge">{list.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {list.map(p => (
                    <div key={p.id} className="table-card" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} color={meta.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                          {p.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.description}</div>}
                        </div>
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: '0.8rem' }}>
                        <span style={{ color: '#10B981', fontWeight: 700 }}>{p.conversion_rate ?? 0}% conv.</span>
                        <span style={{ color: 'var(--text-muted)' }}>Avg score: {p.avg_engagement_score ?? 0}</span>
                        <span className={`status-badge ${p.is_active ? 'paid' : 'unpaid'}`}>{p.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {p.file_url && (
                          <a href={p.file_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem', padding: '6px 10px', textDecoration: 'none' }}>
                            View
                          </a>
                        )}
                        {type === 'compensation_plan' && p.comp_plan_data && (
                          <button className="btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => setViewComp(p)}>
                            Preview
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#EF4444' }}
                        >
                          {deleting === p.id ? <span className="btn-spinner" style={{ borderTopColor: '#EF4444' }} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="empty-state">
              <AlertCircle size={48} />
              <p>No presentations uploaded yet. Click "Upload New" to add your first one.</p>
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSaved={load} />}

      {/* Compensation Plan Viewer Modal */}
      {viewComp && (
        <div className="modal-overlay" onClick={() => setViewComp(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>📊 {viewComp.title} — Animated Preview</h3>
              <button className="icon-btn" onClick={() => setViewComp(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <CompPlanViewer data={viewComp.comp_plan_data} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentationsPage;
