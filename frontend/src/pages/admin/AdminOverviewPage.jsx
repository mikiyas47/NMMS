import { useState, useEffect } from 'react';
import { Users, ShieldCheck, DollarSign, Activity, ArrowUpRight, Star, RefreshCw } from 'lucide-react';
import client from '../../api/client';

const AdminOverviewPage = ({ dark }) => {
  const [adminStats, setAdminStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const [statsRes, prodRes] = await Promise.all([
        client.get('/admin/stats'),
        client.get('/products')
      ]);
      setAdminStats(statsRes.data);
      if (prodRes.data && prodRes.data.data) {
        setProducts(prodRes.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch admin stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const stats = adminStats ? [
    { 
      label: 'Total App Users',  
      value: adminStats.distributors.total, 
      icon: Users,       
      color: '#3B82F6', 
      bg: 'rgba(59,130,246,0.15)',  
      trend: `${adminStats.distributors.active} active`
    },
    { 
      label: 'Paid Distributors',   
      value: adminStats.distributors.paid,          
      icon: ShieldCheck, 
      color: '#10B981', 
      bg: 'rgba(16,185,129,0.15)',  
      trend: `${Math.round((adminStats.distributors.paid / adminStats.distributors.total) * 100)}% conversion`
    },
    { 
      label: 'Total Revenue',      
      value: `${adminStats.transactions.total_revenue.toLocaleString()} ETB`, 
      icon: DollarSign, 
      color: '#F59E0B', 
      bg: 'rgba(245,158,11,0.15)', 
      trend: `${adminStats.transactions.total} transactions`
    },
    { 
      label: 'Products',     
      value: products.length, 
      icon: Activity,    
      color: '#8B5CF6', 
      bg: 'rgba(139,92,246,0.15)',  
      trend: `${adminStats.product_sales.length} selling`
    },
  ] : [];

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div>
          <h2 className="welcome-title">Welcome back, Admin 👋</h2>
          <p className="welcome-sub">Here's what's happening today in your system</p>
        </div>
        <div className="welcome-badge">
          <Star size={14} color="#FCD34D" />
          <span>System Admin</span>
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

      {/* Recent Transactions & Product Sales */}
      {!loading && adminStats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
          {/* Recent Transactions */}
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              Recent Transactions
            </h3>
            {adminStats.recent_transactions.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No transactions yet</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {adminStats.recent_transactions.map((tx) => (
                  <div key={tx.id} style={{ 
                    padding: '0.75rem', 
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ fontWeight: '500', fontSize: '0.875rem', color: '#111827' }}>
                        {tx.customer_name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {tx.product_name} • {tx.distributor_name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: '600', color: '#10B981', fontSize: '0.875rem' }}>
                        {tx.amount.toLocaleString()} {tx.currency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Sales Breakdown */}
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              Product Sales
            </h3>
            {adminStats.product_sales.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No sales yet</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {adminStats.product_sales.map((sale) => (
                  <div key={sale.product_id} style={{ 
                    padding: '0.75rem', 
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ fontWeight: '500', fontSize: '0.875rem', color: '#111827' }}>
                        {sale.product_name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {sale.sales_count} sales
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: '600', color: '#8B5CF6', fontSize: '0.875rem' }}>
                        {parseFloat(sale.total_revenue).toLocaleString()} ETB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminOverviewPage;
