import { useState, useEffect } from 'react';
import { ShieldCheck, Search, Edit2, Power, X, Check, AlertCircle } from 'lucide-react';
import client from '../../api/client';

const AdminsPage = () => {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editForm,     setEditForm]     = useState({ name: '', email: '', phone: '' });
  const [saving,       setSaving]       = useState(false);
  const [toggling,     setToggling]     = useState(null);

  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', password: '', role: 'admin' });
  const [adding, setAdding] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await client.get('/all-users');
      setUsers(res.data.filter((u) => u.role === 'admin'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleToggle = async (admin) => {
    if (!window.confirm(`Set ${admin.name} ${admin.status === 'active' ? 'inactive' : 'active'}?`)) return;
    setToggling(admin.userid);
    try {
      await client.patch(`/users/${admin.userid}/status`);
      fetchAdmins();
    } catch { alert('Failed to update status.'); }
    finally { setToggling(null); }
  };

  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setEditForm({ name: admin.name, email: admin.email, phone: admin.phone || '' });
  };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.email) { alert('Name and Email are required.'); return; }
    setSaving(true);
    try {
      await client.put(`/users/${editingAdmin.userid}`, editForm);
      setEditingAdmin(null);
      fetchAdmins();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update.');
    } finally { setSaving(false); }
  };

  const saveAdd = async () => {
    if (!addForm.name || !addForm.email || !addForm.password) { alert('Name, Email and Password are required.'); return; }
    setAdding(true);
    try {
      await client.post('/users', addForm);
      setAddingAdmin(false);
      setAddForm({ name: '', email: '', phone: '', password: '', role: 'admin' });
      fetchAdmins();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to add admin.');
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
            <ShieldCheck size={26} color="#3B82F6" />
            <h2 className="page-title">Administrators</h2>
          </div>
          <p className="page-sub">Manage system administrators and their permissions</p>
        </div>
        <button className="btn-primary" onClick={() => setAddingAdmin(true)}>
          + Add Admin
        </button>
      </div>

      {/* Search + Count */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            id="admin-search"
            type="text"
            placeholder="Search admins…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="count-badge">{filtered.length} admin{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>No admins found</p>
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
                  style={{ background: u.status === 'inactive' ? '#6B7280' : '#3B82F6' }}
                >
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div className="admin-info">
                  <p className="admin-name">{u.name}</p>
                  <p className="admin-email">{u.email}</p>
                </div>
                <span className="role-badge admin">Admin</span>
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
                <button className="action-btn edit" onClick={() => openEdit(u)} id={`edit-admin-${u.userid}`}>
                  <Edit2 size={13} /> Edit Info
                </button>
                <button
                  className={`action-btn ${u.status === 'inactive' ? 'activate' : 'deactivate'}`}
                  onClick={() => handleToggle(u)}
                  disabled={toggling === u.userid}
                  id={`toggle-admin-${u.userid}`}
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
      {editingAdmin && (
        <div className="modal-overlay" onClick={() => setEditingAdmin(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Admin Info</h3>
              <button className="icon-btn" onClick={() => setEditingAdmin(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {[['Name', 'name', 'text', 'Full name'],
                ['Email', 'email', 'email', 'admin@example.com'],
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
              <button className="btn-secondary" onClick={() => setEditingAdmin(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit} disabled={saving} id="save-edit-btn">
                {saving ? <span className="btn-spinner" /> : <><Check size={15} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addingAdmin && (
        <div className="modal-overlay" onClick={() => setAddingAdmin(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Admin</h3>
              <button className="icon-btn" onClick={() => setAddingAdmin(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {[['Name', 'name', 'text', 'Full name'],
                ['Email', 'email', 'email', 'admin@example.com'],
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
                <select 
                  className="field-input" 
                  value={addForm.role}
                  onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
                >
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setAddingAdmin(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveAdd} disabled={adding} id="save-add-btn">
                {adding ? <span className="btn-spinner" /> : <><Check size={15} /> Add Admin</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminsPage;
