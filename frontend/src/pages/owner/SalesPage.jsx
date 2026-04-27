import { useState, useEffect } from 'react';
import { DollarSign, Search, Filter, X, ChevronDown, Calendar } from 'lucide-react';
import client from '../../api/client';

const SalesPage = ({ dark }) => {
  const [sales, setSales] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    distributor_id: '',
    distributor_name: '',
    product_id: '',
    status: '',
    date_from: '',
    date_to: ''
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Debounce filter changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters({ ...filters });
      setPage(1); // Reset to first page when filters change
    }, 500);
    return () => clearTimeout(handler);
  }, [filters]);

  // Fetch sales with filters
  useEffect(() => {
    setLoading(true);
    const params = {
      page,
      per_page: perPage,
      ...Object.fromEntries(
        Object.entries(debouncedFilters).filter(([_, v]) => v !== '')
      )
    };
    
    client.get('/payments', { params })
      .then((r) => {
        if (r.data.status === 'success') {
          setSales(r.data.data);
          if (r.data.meta) setMeta(r.data.meta);
        }
      })
      .catch((err) => console.error('Error fetching sales:', err))
      .finally(() => setLoading(false));
  }, [page, perPage, debouncedFilters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      distributor_id: '',
      distributor_name: '',
      product_id: '',
      status: '',
      date_from: '',
      date_to: ''
    });
    setPage(1);
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className={`page-container ${dark ? 'dark' : 'light'}`}>
      <div className="page-title-row">
        <DollarSign size={26} color="#10B981" />
        <h2 className="page-title">Sales & Transactions</h2>
      </div>
      <p className="page-sub" style={{ marginBottom: 24 }}>View and manage all product sales with advanced filtering</p>

      {/* Toolbar with Filters */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'var(--card-bg)', 
            padding: '10px 14px', 
            borderRadius: '8px',
            border: '1px solid var(--border)',
            minWidth: '300px',
            flex: '1'
          }}>
            <Search size={18} color="var(--text-muted)" style={{ marginRight: 8 }} />
            <input
              type="text"
              placeholder="Quick search..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', width: '100%' }}
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              background: showFilters || activeFiltersCount > 0 ? 'var(--primary)' : 'var(--card-bg)',
              color: showFilters || activeFiltersCount > 0 ? '#fff' : 'var(--text)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            <Filter size={16} />
            Filters
            {activeFiltersCount > 0 && (
              <span style={{
                background: '#fff',
                color: 'var(--primary)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: '700'
              }}>
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              <X size={14} />
              Clear All
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div style={{
            marginTop: '16px',
            padding: '20px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}>
            {/* Distributor ID */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                Distributor ID
              </label>
              <input
                type="number"
                placeholder="e.g. 123"
                value={filters.distributor_id}
                onChange={(e) => handleFilterChange('distributor_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Distributor Name */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                Distributor Name
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={filters.distributor_name}
                onChange={(e) => handleFilterChange('distributor_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Product ID */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                Product ID
              </label>
              <input
                type="number"
                placeholder="e.g. 456"
                value={filters.product_id}
                onChange={(e) => handleFilterChange('product_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Date From
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Date To */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Date To
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : sales.length === 0 ? (
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
              {sales.map((s) => (
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

      {/* Pagination Controls */}
      {!loading && meta && meta.last_page > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: 24, 
          padding: '16px 20px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          color: 'var(--text-muted)', 
          fontSize: '14px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Info */}
          <div>
            Showing <strong style={{ color: 'var(--text)' }}>{((meta.current_page - 1) * meta.per_page) + 1}</strong> to{' '}
            <strong style={{ color: 'var(--text)' }}>{Math.min(meta.current_page * meta.per_page, meta.total)}</strong> of{' '}
            <strong style={{ color: 'var(--text)' }}>{meta.total}</strong> entries
          </div>

          {/* Per Page Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px' }}>Rows per page:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontSize: '13px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Page Navigation */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ 
                padding: '8px 14px', 
                borderRadius: '6px', 
                background: page === 1 ? 'var(--card-bg)' : 'var(--primary)', 
                color: page === 1 ? 'var(--text-muted)' : '#fff', 
                border: '1px solid var(--border)', 
                cursor: page === 1 ? 'not-allowed' : 'pointer', 
                fontWeight: '500',
                opacity: page === 1 ? 0.5 : 1
              }}
            >
              ← Previous
            </button>
            
            {/* Page Numbers */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => {
                let pageNum;
                if (meta.last_page <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= meta.last_page - 2) {
                  pageNum = meta.last_page - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: page === pageNum ? 'var(--primary)' : 'var(--card-bg)',
                      color: page === pageNum ? '#fff' : 'var(--text)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      fontWeight: page === pageNum ? '700' : '500',
                      minWidth: '40px',
                      fontSize: '13px'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              disabled={page === meta.last_page}
              onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
              style={{ 
                padding: '8px 14px', 
                borderRadius: '6px', 
                background: page === meta.last_page ? 'var(--card-bg)' : 'var(--primary)', 
                color: page === meta.last_page ? 'var(--text-muted)' : '#fff', 
                border: '1px solid var(--border)', 
                cursor: page === meta.last_page ? 'not-allowed' : 'pointer', 
                fontWeight: '500',
                opacity: page === meta.last_page ? 0.5 : 1
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
