import { useState, useEffect } from 'react';
import { ShieldCheck, Search, Edit2, Power, X, Check, AlertCircle } from 'lucide-react';
import client from '../../api/client';

const OwnersPage = ({ dark }) => {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [editingOwner, setEditingOwner] = useState(null);
  const [editForm,     setEditForm]     = useState({ name: '', email: '', phone: '' });
  const [saving,       setSaving]       = useState(false);
  const [toggling,     setToggling]     = useState(null);

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const res = await client.get('/all-users');
      setUsers(res.data.filter((u) => u.role === 'owner'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOwners(); }, []);

  const handleToggle = async (owner) => {
    if (!window.confirm(`Set ${owner.name} ${owner.status === 'active' ? 'inactive' : 'active'}?`)) return;
    setToggling(owner.userid);
    try {
      await client.patch(`/users/${owner.userid}/status`);
      fetchOwners();
    } catch { alert('Failed to update status.'); }
    finally { setToggling(null); }
  };

  const openEdit = (owner) => {
    setEditingOwner(owner);
    setEditForm({ name: owner.name, email: owner.email, phone: owner.phone || '' });
  };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.email) { alert('Name and Email are required.'); return; }
    setSaving(true);
    try {
      await client.put(`/users/${editingOwner.userid}`, editForm);
      setEditingOwner(null);
      fetchOwners();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update.');
    } finally { setSaving(false); }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-row">
          <ShieldCheck size={26} color="#6366F1" />
          <h2 className="page-title">Owners</h2>
        </div>
        <p className="page-sub">Manage system owners and their permissions</p>
      </div>

      {/* Search + Count */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            id="owner-search"
            type="text"
            placeholder="Search owners…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="count-badge">{filtered.length} owner{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>No owners found</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map((u, i) => (
            <div
              key={u.userid || i}
              className={`admin-card ${u.status === 'inactive' ? 'inactive' : ''}`}
            >
              <div className="admin-card-top">
                <div
                  className="user-avatar lg"
                  style={{ background: u.status === 'inactive' ? '#6B7280' : '#6366F1' }}
                >
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div className="admin-info">
                  <p className="admin-name">{u.name}</p>
                  <p className="admin-email">{u.email}</p>
                </div>
                <span className="role-badge owner">Owner</span>
              </div>

              <div className="admin-meta">
                <div>
                  <p className="meta-label">Status</p>
                  <p className="meta-val" style={{ color: u.status === 'inactive' ? '#EF4444' : '#10B981' }}>
                    {(u.status || 'active')}
                  </p>
                </div>
                <div>
                  <p className="meta-label">Phone</p>
                  <p className="meta-val">{u.phone || '—'}</p>
                </div>
                <div>
                  <p className="meta-label">#</p>
                  <p className="meta-val">#{i + 1}</p>
                </div>
              </div>

              <div className="admin-actions">
                <button className="action-btn edit" onClick={() => openEdit(u)} id={`edit-owner-${u.userid}`}>
                  <Edit2 size={13} /> Edit Info
                </button>
                <button
                  className={`action-btn ${u.status === 'inactive' ? 'activate' : 'deactivate'}`}
                  onClick={() => handleToggle(u)}
                  disabled={toggling === u.userid}
                  id={`toggle-owner-${u.userid}`}
                >
                  <Power size={13} />
                  {toggling === u.userid ? '…' : u.status === 'inactive' ? 'Set Active' : 'Set Inactive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingOwner && (
        <div className="modal-overlay" onClick={() => setEditingOwner(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Owner Info</h3>
              <button className="icon-btn" onClick={() => setEditingOwner(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {[['Name', 'name', 'text', 'Full name'],
                ['Email', 'email', 'email', 'owner@example.com'],
                ['Phone', 'phone', 'tel', '+1 234 567 8900']].map(([label, key, type, ph]) => (
                <div className="field-group" key={key}>
                  <label className="field-label">{label}</label>
                  <input
                    id={`edit-${key}`}
                    type={type}
                    className="field-input"
                    placeholder={ph}
                    value={editForm[key]}
                    onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditingOwner(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit} disabled={saving} id="save-edit-btn">
                {saving ? <span className="btn-spinner" /> : <><Check size={15} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnersPage;
