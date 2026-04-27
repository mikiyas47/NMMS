import { useState, useEffect } from 'react';
import { DollarSign, Search } from 'lucide-react';
import client from '../../api/client';

const SalesPage = ({ dark }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    client.get('/payments')
      .then((r) => {
        if (r.data.status === 'success') {
          setSales(r.data.data);
        }
      })
      .catch((err) => console.error('Error fetching sales:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sales.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.product?.toLowerCase().includes(term) ||
      s.distributor_name?.toLowerCase().includes(term) ||
      s.customer_name?.toLowerCase().includes(term) ||
      s.tx_ref?.toLowerCase().includes(term)
    );
  });

  return (
    <div className={`page-container ${dark ? 'dark' : 'light'}`}>
      <div className="page-title-row">
        <DollarSign size={26} color="#10B981" />
        <h2 className="page-title">Sales & Transactions</h2>
      </div>
      <p className="page-sub" style={{ marginBottom: 24 }}>View all successful product sales</p>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--card-bg)', padding: '8px 12px', borderRadius: '8px', width: '300px' }}>
          <Search size={18} color="var(--text-muted)" style={{ marginRight: 8 }} />
          <input
            type="text"
            placeholder="Search sales..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', width: '100%' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No sales found.
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Tx Ref</th>
                <th style={{ padding: '12px' }}>Product</th>
                <th style={{ padding: '12px' }}>Distributor</th>
                <th style={{ padding: '12px' }}>Customer</th>
                <th style={{ padding: '12px' }}>Qty</th>
                <th style={{ padding: '12px' }}>Amount</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.9em' }}>{s.tx_ref}</td>
                  <td style={{ padding: '12px', fontWeight: '500', color: 'var(--text)' }}>{s.product}</td>
                  <td style={{ padding: '12px', color: 'var(--text)' }}>{s.distributor_name}</td>
                  <td style={{ padding: '12px', color: 'var(--text)' }}>{s.customer_name}</td>
                  <td style={{ padding: '12px', color: 'var(--text)' }}>{s.quantity}</td>
                  <td style={{ padding: '12px', fontWeight: '600', color: '#10B981' }}>{s.amount} ETB</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8em',
                      fontWeight: '600',
                      background: s.status === 'success' ? 'rgba(16,185,129,0.15)' : s.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color: s.status === 'success' ? '#10B981' : s.status === 'pending' ? '#F59E0B' : '#EF4444'
                    }}>
                      {s.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SalesPage;
