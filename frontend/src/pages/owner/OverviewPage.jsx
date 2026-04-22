import { useState, useEffect } from 'react';
import { Users, ShieldCheck, DollarSign, Activity, ArrowUpRight, Star, RefreshCw } from 'lucide-react';
import client from '../../api/client';

const OverviewPage = ({ dark }) => {
  const [users,      setUsers]      = useState([]);
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const [userRes, prodRes] = await Promise.all([
        client.get('/all-users'),
        client.get('/products')
      ]);
      // Filter out admins so they are not shown at all in any stats
      const nonAdmins = userRes.data.filter(u => u.role !== 'admin');
      setUsers(nonAdmins);
      if (prodRes.data && prodRes.data.data) {
        setProducts(prodRes.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const paid    = users.filter((u) => u.isPaid).length;
  const revenue = paid * 50;

  const stats = [
    { label: 'Total Users',  value: users.length, icon: Users,       color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  trend: '+12%' },
    { label: 'Paid Users',   value: paid,          icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.15)',  trend: '+8%'  },
    { label: 'Revenue',      value: `$${revenue.toLocaleString()}`, icon: DollarSign, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', trend: '+23%' },
    { label: 'Products',     value: products.length, icon: Activity,    color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)',  trend: '0%'   },
  ];

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div>
          <h2 className="welcome-title">Welcome back, Owner 👋</h2>
          <p className="welcome-sub">Here's what's happening today in your system</p>
        </div>
        <div className="welcome-badge">
          <Star size={14} color="#FCD34D" />
          <span>System Owner</span>
        </div>
        <button
          className="refresh-btn"
          onClick={() => fetchData(true)}
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

    </div>
  );
};

export default OverviewPage;
