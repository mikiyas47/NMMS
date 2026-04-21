import { useState, useEffect } from 'react';
import {
  BarChart2, DollarSign, TrendingUp, ShieldCheck,
  AlertCircle, Users, Activity,
} from 'lucide-react';
import client from '../../api/client';

const ReportPage = () => {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/all-users')
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total    = users.length;
  const paid     = users.filter((u) => u.isPaid).length;
  const unpaid   = total - paid;
  const admins   = users.filter((u) => u.role === 'admin').length;
  const revenue  = paid * 50;
  const convRate = total > 0 ? ((paid / total) * 100).toFixed(1) : '0';
  const paidPct  = total > 0 ? (paid / total) * 100 : 0;
  const unpaidPct= total > 0 ? (unpaid / total) * 100 : 0;

  const kpis = [
    { label: 'Total Revenue',    value: `$${revenue.toLocaleString()}`, icon: DollarSign, color: '#10B981', bg: 'rgba(16,185,129,0.15)'  },
    { label: 'Conversion Rate',  value: `${convRate}%`,                 icon: TrendingUp, color: '#3B82F6', bg: 'rgba(59,130,246,0.15)'   },
    { label: 'Paid Members',     value: paid,                            icon: ShieldCheck,color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)'   },
    { label: 'Unpaid Members',   value: unpaid,                          icon: AlertCircle,color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'   },
    { label: 'Total Admins',     value: admins,                          icon: Users,      color: '#EC4899', bg: 'rgba(236,72,153,0.15)'   },
    { label: 'Avg Rev / User',   value: total > 0 ? `$${(revenue/total).toFixed(0)}` : '$0', icon: Activity, color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  ];

  const summaryRows = [
    ['Total Users',  total,           '#fff'],
    ['Paid',         paid,            '#10B981'],
    ['Unpaid',       unpaid,          '#F59E0B'],
    ['Admins',       admins,          '#3B82F6'],
    ['Revenue',      `$${revenue}`,   '#10B981'],
    ['Conversion',   `${convRate}%`,  '#8B5CF6'],
  ];

  return (
    <div className="page-container">
      <div className="page-title-row">
        <BarChart2 size={26} color="#EC4899" />
        <h2 className="page-title">Analytics Report</h2>
      </div>
      <p className="page-sub" style={{ marginBottom: 24 }}>Overall system performance and key metrics</p>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="kpi-grid">
            {kpis.map((k, i) => (
              <div key={i} className="kpi-card">
                <div className="kpi-icon" style={{ background: k.bg }}>
                  <k.icon size={22} color={k.color} />
                </div>
                <p className="kpi-value" style={{ color: k.color }}>{k.value}</p>
                <p className="kpi-label">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Membership Breakdown */}
          <h3 className="section-title" style={{ marginBottom: 12 }}>Membership Breakdown</h3>
          <div className="table-card" style={{ padding: '24px', marginBottom: 24 }}>
            {[
              { label: 'Paid Members',   pct: paidPct,   color: '#10B981' },
              { label: 'Unpaid Members', pct: unpaidPct, color: '#F59E0B' },
            ].map((b, i) => (
              <div key={i} style={{ marginBottom: i === 0 ? 20 : 0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 8 }}>
                  <span style={{ color:'var(--text)' }}>{b.label}</span>
                  <span style={{ color: b.color, fontWeight: 700 }}>{b.pct.toFixed(1)}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${b.pct}%`, background: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Summary Table */}
          <h3 className="section-title" style={{ marginBottom: 12 }}>Summary Table</h3>
          <div className="table-card">
            <table className="data-table">
              <tbody>
                {summaryRows.map(([label, val, color], i) => (
                  <tr key={i}>
                    <td className="muted">{label}</td>
                    <td style={{ textAlign:'right', fontWeight:700, color }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportPage;
