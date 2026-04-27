import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShieldCheck, Users, Package, BarChart2, DollarSign,
  LogOut, Menu, X, Bell, Sun, Moon, ChevronRight,
} from 'lucide-react';
import OverviewPage    from './OverviewPage';
import OwnersPage      from './OwnersPage';
import ProspectsPage   from './ProspectsPage';
import AddProductPage  from './AddProductPage';
import ReportPage      from './ReportPage';
import SalesPage       from './SalesPage';

const MENU = [
  { id: 'overview',   label: 'System Overview',     icon: LayoutDashboard, grad: ['#6366F1','#818CF8'] },
  { id: 'owners',     label: 'Manage Owners',       icon: ShieldCheck,     grad: ['#8B5CF6','#A78BFA'] },
  { id: 'prospects',  label: 'Distributors DB',     icon: Users,           grad: ['#10B981','#34D399'] },
  { id: 'product',    label: 'Product Catalog',     icon: Package,         grad: ['#F59E0B','#FCD34D'] },
  { id: 'report',     label: 'System Analytics',    icon: BarChart2,       grad: ['#EC4899','#F472B6'] },
  { id: 'sales',      label: 'Sales & Transactions',icon: DollarSign,      grad: ['#10B981','#10B981'] },
];

const OwnerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [active,      setActive]      = useState('overview');
  const [sideOpen,    setSideOpen]    = useState(true);
  const [darkMode,    setDarkMode]    = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentMenu = MENU.find((m) => m.id === active);

  const renderContent = () => {
    switch (active) {
      case 'overview':  return <OverviewPage   dark={darkMode} />;
      case 'owners':    return <OwnersPage     dark={darkMode} />;
      case 'prospects': return <ProspectsPage  dark={darkMode} />;
      case 'product':   return <AddProductPage dark={darkMode} />;
      case 'report':    return <ReportPage     dark={darkMode} />;
      case 'sales':     return <SalesPage      dark={darkMode} />;
      default:          return <OverviewPage   dark={darkMode} />;
    }
  };

  return (
    <div className={`dashboard-root ${darkMode ? 'dark' : 'light'}`}>
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sideOpen ? 'open' : 'collapsed'}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon"><ShieldCheck size={22} color="#fff" /></div>
          {sideOpen && (
            <div className="brand-text">
              <span className="brand-name">NetGrow Sys</span>
              <span className="brand-role">Owner Console</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <p className="nav-section-label">{sideOpen ? 'NAVIGATION' : ''}</p>
          {MENU.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                onClick={() => setActive(item.id)}
              >
                <span
                  className="nav-icon"
                  style={isActive ? { background: `linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})` } : {}}
                >
                  <item.icon size={18} color={isActive ? '#fff' : undefined} />
                </span>
                {sideOpen && <span className="nav-label">{item.label}</span>}
                {sideOpen && isActive && <ChevronRight size={14} className="nav-chevron" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {sideOpen && user && (
            <div className="user-info">
              <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
              <div>
                <p className="user-name">{user.name}</p>
                <p className="user-role-badge">Owner</p>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout} id="logout-btn">
            <LogOut size={16} />
            {sideOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        {/* Header */}
        <header className="top-header">
          <div className="header-left">
            <button className="icon-btn" onClick={() => setSideOpen((p) => !p)} id="sidebar-toggle">
              {sideOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="header-title">
              {currentMenu && (
                <span
                  className="header-icon"
                  style={{ background: `linear-gradient(135deg, ${currentMenu.grad[0]}, ${currentMenu.grad[1]})` }}
                >
                  <currentMenu.icon size={16} color="#fff" />
                </span>
              )}
              <h2>{currentMenu?.label || 'Dashboard'}</h2>
            </div>
          </div>

          <div className="header-right">
            <button className="icon-btn" onClick={() => setDarkMode((p) => !p)} id="theme-toggle">
              {darkMode ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} />}
            </button>
            <button className="icon-btn notif-btn" id="notif-btn">
              <Bell size={18} />
              <span className="notif-dot" />
            </button>
            <div className="header-user">
              <div className="user-avatar sm">{user?.name?.charAt(0).toUpperCase()}</div>
              <span>{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="content-area">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default OwnerDashboard;
