import { useState, useEffect } from 'react';
import { BarChart2, DollarSign, Activity, ShoppingCart, AlertCircle } from 'lucide-react';
import client from '../../api/client';

const SalesReportsPage = ({ dark }) => {
  const [report,   setReport]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const fetchReport = async (from, to) => {
    setLoading(true);
    setError(null);
    try {
      const p = {};
      if (from) p.date_from = from;
      if (to)   p.date_to   = to;
      const res = await client.get('/admin/sales-report', { params: p });
      setReport(res.data.data);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || 'Failed to load sales report. The server may still be starting up.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(dateFrom, dateTo); }, [dateFrom, dateTo]);

  const exportCSV = () => {
    if (!report) return;
    let csv = "Product,Sales Count,Revenue (ETB)\n";
    report.products.forEach(p => {
      csv += `"${p.product_name}",${p.sales_count},${p.revenue}\n`;
    });
    csv += "\nDistributor,Sales Count,Revenue (ETB)\n";
    report.distributors.forEach(d => {
      csv += `"${d.distributor_name}",${d.sales_count},${d.revenue}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const maxMonthRev = report?.trend?.reduce((max, m) => Math.max(max, Number(m.revenue)), 0) || 1;

  return (
    <div className={`page-container ${dark ? 'dark' : 'light'}`}>
      <div className="page-header">
        <div className="page-title-row">
          <BarChart2 size={26} color="#EC4899" />
          <h2 className="page-title">Sales Reports</h2>
        </div>
        <p className="page-sub">Comprehensive analytics and revenue tracking</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Date From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Date To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }} />
        </div>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : error ? (
        <div className="empty-state">
          <AlertCircle size={48} color="#EF4444" />
          <p style={{ color: '#EF4444' }}>{error}</p>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => fetchReport(dateFrom, dateTo)}>Retry</button>
        </div>
      ) : report && report.overview.total_transactions === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={48} />
          <p>No successful transactions found for the selected period.</p>
        </div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            {[
              { label: 'Total Revenue', value: `${Number(report.overview.total_revenue).toLocaleString()} ETB`, icon: DollarSign, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
              { label: 'Total Transactions', value: report.overview.total_transactions, icon: ShoppingCart, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
              { label: 'Pending Sales', value: report.overview.pending_transactions, icon: Activity, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
              { label: 'Failed/Rejected', value: report.overview.failed_transactions, icon: Activity, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' }
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ padding: '20px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <s.icon size={20} color={s.color} />
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>{s.value}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', marginBottom: '24px' }}>
            {/* Monthly Trend Chart */}
            <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border)', gridColumn: '1 / -1' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>Monthly Revenue Trend</h3>
              {report.trend.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No trending data available.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '200px', paddingBottom: '30px', position: 'relative' }}>
                  {report.trend.map(m => (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '100%', maxWidth: '40px', height: `${(Number(m.revenue) / maxMonthRev) * 100}%`, minHeight: '4px', background: 'linear-gradient(to top, #3B82F6, #60A5FA)', borderRadius: '4px 4px 0 0', position: 'relative', transition: 'height 0.3s' }}>
                        <span style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {Number(m.revenue) >= 1000 ? (Number(m.revenue)/1000).toFixed(1)+'k' : Number(m.revenue)}
                        </span>
                      </div>
                      <span style={{ position: 'absolute', bottom: '0', fontSize: '12px', color: 'var(--text-muted)' }}>{m.month}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Sales Breakdown */}
            <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>Revenue by Product</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {report.products.map(p => {
                  const maxProd = report.products[0]?.revenue || 1;
                  const pct = (Number(p.revenue) / Number(maxProd)) * 100;
                  return (
                    <div key={p.product_name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text)', fontWeight: '500' }}>{p.product_name} ({p.sales_count})</span>
                        <span style={{ color: 'var(--text-muted)' }}>{Number(p.revenue).toLocaleString()} ETB</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#8B5CF6', borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })}
                {report.products.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No product sales.</p>}
              </div>
            </div>

            {/* Top Distributors */}
            <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>Top Distributors (Sales)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {report.distributors.map((d, i) => (
                  <div key={d.distributor_name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: i < 3 ? '#F59E0B' : 'var(--border)', color: i < 3 ? '#fff' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                        {i + 1}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{d.distributor_name}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{d.sales_count} sales</p>
                      </div>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#10B981' }}>{Number(d.revenue).toLocaleString()} ETB</span>
                  </div>
                ))}
                {report.distributors.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No distributor sales.</p>}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default SalesReportsPage;
