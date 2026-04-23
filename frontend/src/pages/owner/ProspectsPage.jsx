import { useState, useEffect } from 'react';
import { Users, Search, ChevronRight } from 'lucide-react';
import client from '../../api/client';

const ProspectsPage = () => {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    client.get('/all-users')
      .then((r) => setUsers(r.data.filter((u) => u.role !== 'admin' && u.role !== 'owner')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users
    .filter((u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-row">
          <Users size={26} color="#10B981" />
          <h2 className="page-title">System Distributors</h2>
        </div>
        <p className="page-sub">Monitor and manage all registered distributors</p>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            id="prospects-search"
            type="text"
            placeholder="Search distributors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="count-badge">{filtered.length} distributor{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>No distributors found</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.userid ? `${u.role}-${u.userid}` : i}>
                  <td>
                    <div className="user-cell">
                      <div
                        className="user-avatar sm"
                        style={{
                          background: 'rgba(16,185,129,0.8)',
                        }}
                      >
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td className="muted">{u.email}</td>
                  <td className="muted">{u.phone || '—'}</td>
                  <td className="font-bold" style={{ color: '#10B981', fontWeight: 600 }}>{u.rank || 'CT'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProspectsPage;
