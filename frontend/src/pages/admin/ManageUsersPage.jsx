import { useState, useEffect } from 'react';
import { Users, Search, Edit2, Power, X, Check, AlertCircle, Info } from 'lucide-react';
import client from '../../api/client';

const ManageUsersPage = ({ dark }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tabs: 'admin', 'owner', 'distributor'
  const [activeTab, setActiveTab] = useState('admin');
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);

  // Edit State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Add State
  const [addingUser, setAddingUser] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', password: '', role: 'admin' });
  const [addErrors, setAddErrors] = useState({});
  const [adding, setAdding] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/admin/users');
      setUsers(res.data.data || []);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || e.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggle = async (u) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Are you sure you want to set "${u.name}" as ${newStatus}?`)) return;

    // Optimistic update
    setUsers(prev => prev.map(x =>
      x.userid === u.userid && x.role === u.role ? { ...x, status: newStatus } : x
    ));
    setToggling(u.userid);

    try {
      await client.patch(`/admin/users/${u.userid}/status`, { role: u.role });
    } catch {
      // Revert on failure
      setUsers(prev => prev.map(x =>
        x.userid === u.userid && x.role === u.role ? { ...x, status: u.status } : x
      ));
      alert('Failed to update status. Please try again.');
    } finally {
      setToggling(null);
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, phone: u.phone || '' });
    setEditErrors({});
  };

  const validateEthiopianPhone = (phone) => {
    if (!phone) return true; // nullable backend
    return /^(09\d{8}|\+2519\d{8})$/.test(phone);
  };

  const saveEdit = async () => {
    const errs = {};
    if (!editForm.name.trim()) errs.name = 'Name is required.';
    if (!editForm.email.trim()) errs.email = 'Email is required.';
    if (editForm.phone && !validateEthiopianPhone(editForm.phone)) {
      errs.phone = 'Invalid Ethiopian phone (e.g. 09xxxxxxxx or +2519xxxxxxxx)';
    }

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setSaving(true);
    try {
      await client.put(`/admin/users/${editingUser.userid}`, { ...editForm, role: editingUser.role });
      setEditingUser(null);
      fetchUsers();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  const saveAdd = async () => {
    const errs = {};
    if (!addForm.name.trim()) errs.name = 'Name is required.';
    if (!addForm.email.trim()) errs.email = 'Email is required.';
    if (addForm.phone && !validateEthiopianPhone(addForm.phone)) {
      errs.phone = 'Invalid Ethiopian phone (e.g. 09xxxxxxxx or +2519xxxxxxxx)';
    }
    if (!addForm.password || addForm.password.length < 8) errs.password = 'Password requires min 8 characters.';
    
    if (Object.keys(errs).length > 0) {
      setAddErrors(errs);
      return;
    }

    setAdding(true);
    try {
      await client.post('/admin/users', addForm);
      setAddingUser(false);
      setAddForm({ name: '', email: '', phone: '', password: '', role: 'admin' });
      setAddErrors({});
      fetchUsers();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to add user.');
    } finally {
      setAdding(false);
    }
  };

  const filtered = users.filter((u) => {
    if (u.role !== activeTab) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.phone?.includes(s);
  });

  return (
    <div className={`page-container ${dark ? 'dark' : 'light'}`}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-title-row">
            <Users size={26} color="#3B82F6" />
            <h2 className="page-title">Manage Users</h2>
          </div>
          <p className="page-sub">Centralized overview of Admins, Owners, and Distributors</p>
        </div>
        {activeTab !== 'distributor' && (
          <button 
            className="btn-primary" 
            onClick={() => {
              setAddForm(p => ({ ...p, role: activeTab }));
              setAddErrors({});
              setAddingUser(true);
            }}
          >
            + Add {activeTab === 'admin' ? 'Admin' : 'Owner'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {['admin', 'owner', 'distributor'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearch(''); }}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab ? '600' : '500',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontSize: '15px'
            }}
          >
            {tab}s
          </button>
        ))}
      </div>

      {/* Distributor Info Banner */}
      {activeTab === 'distributor' && (
        <div style={{
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          color: 'var(--text)'
        }}>
          <Info size={20} color="#3B82F6" />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            <strong>Note:</strong> Distributors cannot be created manually by Admins. They must sign up through the standard referral flow to ensure they are correctly placed in the binary tree network.
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder={`Search ${activeTab}s...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="count-badge">{filtered.length} total</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : error ? (
        <div className="empty-state" style={{ color: '#EF4444' }}>
          <AlertCircle size={48} color="#EF4444" />
          <p>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>No records found</p>
        </div>
      ) : (
        <div className="table-card" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>User</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Phone</th>
                <th style={{ padding: '12px' }}>Status</th>
                {activeTab === 'distributor' && <th style={{ padding: '12px' }}>Rank</th>}
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.userid} style={{ borderBottom: '1px solid var(--border)', opacity: u.status === 'inactive' ? 0.6 : 1 }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="user-avatar sm" style={{ background: u.status === 'inactive' ? '#6B7280' : '#3B82F6', flexShrink: 0 }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{u.phone || '—'}</td>
                  <td style={{ padding: '12px' }}>
                     <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8em',
                        fontWeight: '600',
                        background: u.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: u.status === 'active' ? '#10B981' : '#EF4444'
                      }}>
                        {(u.status || 'active').toUpperCase()}
                      </span>
                  </td>
                  {activeTab === 'distributor' && (
                    <td style={{ padding: '12px', fontWeight: 600, color: '#10B981' }}>{u.rank || 'CT'}</td>
                  )}
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="action-btn edit" onClick={() => openEdit(u)} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button
                        className={`action-btn ${u.status === 'inactive' ? 'activate' : 'deactivate'}`}
                        onClick={() => handleToggle(u)}
                        disabled={toggling === u.userid}
                        title={u.status === 'inactive' ? 'Activate User' : 'Deactivate User'}
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
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
              <button className="icon-btn" onClick={() => setEditingUser(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {[['Name', 'name', 'text', 'Full name'],
                ['Email', 'email', 'email', 'user@example.com'],
                ['Phone', 'phone', 'tel', '09xxxxxxxx']].map(([label, key, type, ph]) => (
                <div className="field-group" key={key}>
                  <label className="field-label">{label}</label>
                  <input
                    type={type}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '6px', border: editErrors[key] ? '1px solid #EF4444' : '1px solid var(--border)',
                      background: 'var(--input-bg)', color: 'var(--text)', outline: 'none'
                    }}
                    placeholder={ph}
                    value={editForm[key]}
                    onChange={(e) => {
                      setEditForm((p) => ({ ...p, [key]: e.target.value }));
                      if (editErrors[key]) setEditErrors(p => ({ ...p, [key]: null }));
                    }}
                  />
                  {editErrors[key] && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{editErrors[key]}</span>}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? <span className="btn-spinner" /> : <><Check size={15} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal (Admins/Owners only) */}
      {addingUser && (
        <div className="modal-overlay" onClick={() => setAddingUser(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New {addForm.role.charAt(0).toUpperCase() + addForm.role.slice(1)}</h3>
              <button className="icon-btn" onClick={() => setAddingUser(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {[['Name', 'name', 'text', 'Full name'],
                ['Email', 'email', 'email', 'user@example.com'],
                ['Phone', 'phone', 'tel', '09xxxxxxxx'],
                ['Password', 'password', 'password', 'Min 8 chars, 1 number']].map(([label, key, type, ph]) => (
                <div className="field-group" key={key}>
                  <label className="field-label">{label}</label>
                  <input
                    type={type}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '6px', border: addErrors[key] ? '1px solid #EF4444' : '1px solid var(--border)',
                      background: 'var(--input-bg)', color: 'var(--text)', outline: 'none'
                    }}
                    placeholder={ph}
                    value={addForm[key]}
                    onChange={(e) => {
                      setAddForm((p) => ({ ...p, [key]: e.target.value }));
                      if (addErrors[key]) setAddErrors(p => ({ ...p, [key]: null }));
                    }}
                  />
                  {addErrors[key] && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{addErrors[key]}</span>}
                </div>
              ))}
              <div className="field-group">
                <label className="field-label">Role</label>
                <select
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}
                  value={addForm.role}
                  onChange={(e) => setAddForm(p => ({ ...p, role: e.target.value }))}
                >
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setAddingUser(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveAdd} disabled={adding}>
                {adding ? <span className="btn-spinner" /> : <><Check size={15} /> Add User</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsersPage;
