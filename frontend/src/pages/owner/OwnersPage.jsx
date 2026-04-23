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

  const [addingOwner, setAddingOwner] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', password: '', role: 'owner' });
  const [adding, setAdding] = useState(false);

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

  const saveAdd = async () => {
    if (!addForm.name || !addForm.email || !addForm.password) { alert('Name, Email and Password are required.'); return; }
    setAdding(true);
    try {
      await client.post('/users', addForm);
      setAddingOwner(false);
      setAddForm({ name: '', email: '', phone: '', password: '', role: 'owner' });
      fetchOwners();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to add owner.');
    } finally { setAdding(false); }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-title-row">
            <ShieldCheck size={26} color="#6366F1" />
            <h2 className="page-title">System Owners</h2>
          </div>
          <p className="page-sub">Manage top-level system owners and their permissions</p>
        </div>
        <button className="btn-primary" onClick={() => setAddingOwner(true)}>
          + Add Owner
        </button>
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
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.userid ? `${u.role}-${u.userid}` : i} style={{ opacity: u.status === 'inactive' ? 0.6 : 1 }}>
                  <td>
                    <div className="user-cell">
                      <div
                        className="user-avatar sm"
                        style={{ background: u.status === 'inactive' ? '#6B7280' : '#6366F1' }}
                      >
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="muted">{u.email}</td>
                  <td className="muted">{u.phone || '—'}</td>
                  <td>
                    <span className={`status-badge ${u.status === 'inactive' ? 'unpaid' : 'paid'}`}>
                      {(u.status || 'active').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="action-btn edit" onClick={() => openEdit(u)} id={`edit-owner-${u.userid}`}>
                        <Edit2 size={14} />
                      </button>
                      <button
                        className={`action-btn ${u.status === 'inactive' ? 'activate' : 'deactivate'}`}
                        onClick={() => handleToggle(u)}
                        disabled={toggling === u.userid}
                        id={`toggle-owner-${u.userid}`}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Add Modal */}
      {addingOwner && (
        <div className="modal-overlay" onClick={() => setAddingOwner(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Owner</h3>
              <button className="icon-btn" onClick={() => setAddingOwner(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {[['Name', 'name', 'text', 'Full name'],
                ['Email', 'email', 'email', 'owner@example.com'],
                ['Phone', 'phone', 'tel', '+1 234 567 8900'],
                ['Password', 'password', 'password', 'Min 8 chars']].map(([label, key, type, ph]) => (
                <div className="field-group" key={key}>
                  <label className="field-label">{label}</label>
                  <input
                    id={`add-${key}`}
                    type={type}
                    className="field-input"
                    placeholder={ph}
                    value={addForm[key]}
                    onChange={(e) => setAddForm((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="field-group">
                <label className="field-label">Role</label>
                <input
                  type="text"
                  className="field-input"
                  value="Owner"
                  disabled
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setAddingOwner(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveAdd} disabled={adding} id="save-add-btn">
                {adding ? <span className="btn-spinner" /> : <><Check size={15} /> Add Owner</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnersPage;
