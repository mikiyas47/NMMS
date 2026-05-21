import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3500;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const Login = () => {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [retryInfo, setRetryInfo] = useState(''); // "Server waking up…" message

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRetryInfo('');
    setLoading(true);

    let lastErr = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const u = await login(form.email, form.password);
        setRetryInfo('');
        setLoading(false);

        if (u.role === 'owner') navigate('/owner');
        else if (u.role === 'admin') navigate('/admin');
        else setError('Access denied. Only admins and owners can log in here.');
        return; // success — exit loop
      } catch (err) {
        lastErr = err;
        const status = err.response?.status;
        const isServerError = !status || status >= 500; // network error or 5xx

        // Only retry on server/network errors, not on 401/403 (wrong credentials)
        if (!isServerError || attempt === MAX_RETRIES) break;

        setRetryInfo(`Server is starting up… retrying (${attempt}/${MAX_RETRIES - 1})`);
        await sleep(RETRY_DELAY_MS);
      }
    }

    // All retries exhausted — show the real error
    setRetryInfo('');
    const status = lastErr?.response?.status;
    if (!status || status >= 500) {
      setError(
        'The server is temporarily unavailable (cold start). ' +
        'Please wait 20–30 seconds and try again.'
      );
    } else {
      setError(
        lastErr.response?.data?.message ||
        lastErr.message ||
        'Login failed.'
      );
    }
    setLoading(false);
  };

  return (
    <div className="login-bg">
      {/* Animated orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-icon">
            <ShieldCheck size={28} color="#fff" />
          </div>
          <div>
            <h1 className="logo-title">NetGrow</h1>
            <p className="logo-sub">Admin Portal</p>
          </div>
        </div>

        <h2 className="login-heading">Welcome back</h2>
        <p className="login-subheading">Sign in to access your dashboard</p>

        {error && (
          <div className="login-error" role="alert">
            <span>⚠ {error}</span>
          </div>
        )}

        {retryInfo && (
          <div className="login-retry-info" role="status">
            <span className="retry-spinner" />
            <span>{retryInfo}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field-group">
            <label className="field-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="field-input"
              placeholder="admin@netgrow.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                className="field-input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPwd((p) => !p)}
                aria-label="Toggle password visibility"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading} id="login-submit-btn">
            {loading ? (
              <>
                <span className="btn-spinner" />
                <span>{retryInfo ? 'Retrying…' : 'Signing in…'}</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <p className="login-footer">
          Access restricted to <strong>Admins & Owners</strong> only.
        </p>
      </div>
    </div>
  );
};

export default Login;
