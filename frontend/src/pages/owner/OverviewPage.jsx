import { useState, useEffect } from 'react';
import { Users, ShieldCheck, DollarSign, Activity, ArrowUpRight, Star, RefreshCw } from 'lucide-react';
import client from '../../api/client';

const OverviewPage = ({ dark }) => {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const res = await client.get('/all-users');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const paid    = users.filter((u) => u.isPaid).length;
  const admins  = users.filter((u) => u.role === 'admin').length;
  const revenue = paid * 50;

  const stats = [
    { label: 'Total Users',  value: users.length, icon: Users,       color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  trend: '+12%' },
    { label: 'Paid Users',   value: paid,          icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.15)',  trend: '+8%'  },
    { label: 'Revenue',      value: `$${revenue.toLocaleString()}`, icon: DollarSign, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', trend: '+23%' },
    { label: 'Admins',       value: admins,        icon: Activity,    color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)',  trend: '0%'   },
  ];

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div>
          <h2 className="welcome-title">Welcome back, Admin 👋</h2>
          <p className="welcome-sub">Here's what's happening today</p>
        </div>
        <div className="welcome-badge">
          <Star size={14} color="#FCD34D" />
          <span>Super Admin</span>
        </div>
        <button
          className="refresh-btn"
          onClick={() => fetchUsers(true)}
          disabled={refreshing}
          id="overview-refresh"
        >
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ '--card-accent': s.color }}>
            <div className="stat-icon-wrap" style={{ background: s.bg }}>
              <s.icon size={22} color={s.color} />
            </div>
            {loading ? (
              <div className="skeleton-val" />
            ) : (
              <p className="stat-value" style={{ color: s.color }}>{s.value}</p>
            )}
            <p className="stat-label">{s.label}</p>
            <div className="stat-trend">
              <ArrowUpRight size={12} color="#10B981" />
              <span style={{ color: '#10B981' }}>{s.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Users */}
      <div className="section-header">
        <h3 className="section-title">Recent Users</h3>
        <span className="section-count">{users.length} total</span>
      </div>
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(4)].map((__, j) => <td key={j}><div className="skeleton-row" /></td>)}
                  </tr>
                ))
              : users.slice(0, 8).map((u, i) => (
                  <tr key={u.userid || i}>
                    <td>
                      <div className="user-cell">
                        <div
                          className="user-avatar sm"
                          style={{ background: u.role === 'admin' ? '#EF4444' : '#6366F1' }}
                        >
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td className="muted">{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.isPaid ? 'paid' : 'unpaid'}`}>
                        {u.isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OverviewPage;
