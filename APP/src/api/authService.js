import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://nmms-backend.onrender.com/api';

import Pusher from 'pusher-js/react-native';
import Echo from 'laravel-echo';

// Global echo instance
let echoInstance = null;

export const initEcho = async () => {
  if (echoInstance) return echoInstance;
  
  const token = await AsyncStorage.getItem('userToken');
  if (!token) return null;



  echoInstance = new Echo({
    broadcaster: 'pusher',
    Pusher: Pusher,
    key: 'reverbkey123',
    wsHost: 'nmms-backend.onrender.com', // Replace with Reverb prod URL when deployed
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${API_BASE_URL.replace('/api', '')}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  return echoInstance;
};

export const getEcho = () => echoInstance;

// ── Simple in-memory cache for GET requests ───────────────────────────────────
// Prevents hammering the server when multiple screens mount simultaneously.
const _cache = {};
const CACHE_TTL = 30000; // 30 seconds

const cachedGet = async (url, params = {}) => {
  const key = url + JSON.stringify(params);
  const now = Date.now();
  if (_cache[key] && now - _cache[key].ts < CACHE_TTL) {
    return _cache[key].data;
  }
  const response = await apiClient.get(url, params ? { params } : {});
  _cache[key] = { data: response.data, ts: now };
  return response.data;
};

export const invalidateCache = (urlPrefix) => {
  Object.keys(_cache).forEach(k => { if (k.startsWith(urlPrefix)) delete _cache[k]; });
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  transformResponse: [function (data) {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        const match = data.match(/^(\{.*?\})(?=\{|$)/);
        if (match) { try { return JSON.parse(match[1]); } catch {} }
        try { return JSON.parse('[' + data.replace(/\}\{/g, '},{') + ']')[0]; } catch {}
        return data;
      }
    }
    return data;
  }],
});

// ── Keep-alive ping: wake the Render server every 10 minutes ─────────────────
// Render free-tier sleeps after 15 min of inactivity. This prevents cold starts.
let _pingInterval = null;
export const startKeepAlive = () => {
  if (_pingInterval) return;
  // Ping immediately on app start
  axios.get(API_BASE_URL + '/products', { timeout: 10000 }).catch(() => {});
  // Then every 10 minutes
  _pingInterval = setInterval(() => {
    axios.get(API_BASE_URL + '/products', { timeout: 10000 }).catch(() => {});
  }, 10 * 60 * 1000);
};
export const stopKeepAlive = () => {
  if (_pingInterval) { clearInterval(_pingInterval); _pingInterval = null; }
};

// Add request interceptor to attach auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Detect FormData in React Native
    const isFormData =
      config.data instanceof FormData ||
      (config.data && typeof config.data === 'object' && config.data._parts);
    if (isFormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/login', { email, password });
    if (response.data.access_token) {
      await AsyncStorage.setItem('authToken', response.data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    if (error.response) {
      // Server replied with a non-2xx status
      const data = error.response.data;
      const msg =
        data?.message ||
        (data?.errors ? Object.values(data.errors).flat()[0] : null) ||
        'Login failed. Please check your credentials.';
      throw new Error(msg);
    }
    // No response — server is unreachable (sleeping on Render, no internet, etc.)
    throw new Error(
      'Cannot reach the server. The server may be starting up — please wait 30 seconds and try again.'
    );
  }
};

export const register = async (userData) => {
  try {
    const response = await apiClient.post('/register', userData);
    if (response.data.access_token) {
      await AsyncStorage.setItem('authToken', response.data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

export const logout = async () => {
  try {
    await apiClient.post('/logout');
  } catch {
    // ignore logout errors
  } finally {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  }
};

export const getProducts = async () => {
  try {
    return await cachedGet('/products');
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

export const deleteProduct = async (productId) => {
  try {
    const response = await apiClient.delete(`/products/${productId}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

export const getUser = async () => {
  try {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

/**
 * Refresh the user data from the server and update AsyncStorage.
 */
export const refreshUserFromServer = async () => {
  try {
    const response = await apiClient.get('/user');
    const user = response.data;
    if (user) {
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }
    return user;
  } catch {
    return null;
  }
};

// ── Prospects ─────────────────────────────────────────────────────────────────
export const getProspectDashboard = async () => (await apiClient.get('/prospect-dashboard')).data;
export const getProspects = async (params) => (await apiClient.get('/prospects', { params })).data;
export const createProspect = async (data) => (await apiClient.post('/prospects', data)).data;
export const updateProspect = async (id, data) => (await apiClient.put(`/prospects/${id}`, data)).data;
export const deleteProspect = async (id) => (await apiClient.delete(`/prospects/${id}`)).data;
export const moveProspectStage = async (id, payload) => (await apiClient.patch(`/prospects/${id}/stage`, typeof payload === 'string' ? { stage: payload } : payload)).data;
export const addProspectFollowup = async (id, data) => (await apiClient.post(`/prospects/${id}/followups`, data)).data;
export const addProspectClosing = async (id, data) => (await apiClient.post(`/prospects/${id}/closings`, data)).data;
export const addProspectNote = async (id, data) => (await apiClient.post(`/prospects/${id}/notes`, data)).data;

// ── Followups & Closings ──────────────────────────────────────────────────────
export const getFollowups = async (params) => (await apiClient.get('/contacts/followups', { params })).data;
export const createFollowup = async (prospectId, data) => (await apiClient.post(`/contacts/${prospectId}/followups`, data)).data;
export const getClosings = async (params) => (await apiClient.get('/contacts/closings', { params })).data;
export const createClosing = async (prospectId, data) => (await apiClient.post(`/contacts/${prospectId}/closings`, data)).data;

// ── Presentations ─────────────────────────────────────────────────────────────
// Fetch owner-uploaded global presentations for the distributor library (used in Send Presentation flow)
export const getPresentations = async () => (await apiClient.get('/presentations/library')).data;
// Fetch the distributor's own presentations
export const getDistributorPresentations = async () => (await apiClient.get('/presentations')).data;
export const createPresentation = async (data) => (await apiClient.post('/presentations', data)).data;
export const updatePresentation = async (id, data) => (await apiClient.put(`/presentations/${id}`, data)).data;
export const deletePresentation = async (id) => (await apiClient.delete(`/presentations/${id}`)).data;
export const assignPresentation = async (data) => (await apiClient.post('/presentations/assign', data)).data;
export const logPresentationCallOutcome = async (data) => (await apiClient.post('/presentations/call-outcome', data)).data;
export const getPresentationLibrary = async () => (await apiClient.get('/presentations/library')).data;
export const getProspectAssignments = async (prospectId) => (await apiClient.get(`/prospects/${prospectId}/assignments`)).data;
export const getProspectWatchingStatus = async (prospectId) => (await apiClient.get(`/prospects/${prospectId}/watching`)).data;
export const getProspectScoreBreakdown = async (prospectId) => (await apiClient.get(`/prospects/${prospectId}/score`)).data;

// ── Invitations ───────────────────────────────────────────────────────────────
export const createInvitation = async (data) => (await apiClient.post('/invitations', data)).data;
export const getProspectInvitations = async (prospectId) => (await apiClient.get(`/prospects/${prospectId}/invitations`)).data;
export const updateInvitationStatus = async (id, status) => (await apiClient.patch(`/invitations/${id}/status`, { status })).data;
export const updateTextInvitationResponse = async (id, data) => (await apiClient.patch(`/invitations/${id}/response`, data)).data;
export const getInvitationSmartCheck = async (id) => (await apiClient.get(`/invitations/${id}/smart-check`)).data;
export const getScript = async (invitationType, prospectId) => (await apiClient.get('/scripts', { params: { invitation_type: invitationType, prospect_id: prospectId } })).data;

// ── Automation ────────────────────────────────────────────────────────────────
export const getAutomationRules = async () => (await apiClient.get('/automation-rules')).data;
export const createAutomationRule = async (data) => (await apiClient.post('/automation-rules', data)).data;
export const toggleAutomationRule = async (id) => (await apiClient.patch(`/automation-rules/${id}/toggle`)).data;

// ── Priority ──────────────────────────────────────────────────────────────────
export const getPriorityLeads = async () => (await apiClient.get('/prospect-priority')).data;
export const updateProspectPriority = async (id, data) => (await apiClient.patch(`/prospects/${id}/priority`, data)).data;

// ── Goals ─────────────────────────────────────────────────────────────────────
export const getGoals = async () => (await apiClient.get('/goals')).data;
export const createGoal = async (data) => (await apiClient.post('/goals', data)).data;
export const updateGoal = async (id, data) => (await apiClient.put(`/goals/${id}`, data)).data;
export const deleteGoal = async (id) => (await apiClient.delete(`/goals/${id}`)).data;
export const updateGoalProgress = async (id, progress) => (await apiClient.patch(`/goals/${id}/progress`, { progress })).data;

// ── Contacts ──────────────────────────────────────────────────────────────────
export const getContacts = async (params) => (await apiClient.get('/contacts', { params })).data;
export const createContact = async (data) => (await apiClient.post('/contacts', data)).data;
export const updateContact = async (id, data) => (await apiClient.put(`/contacts/${id}`, data)).data;
export const deleteContact = async (id) => (await apiClient.delete(`/contacts/${id}`)).data;
export const importContacts = async (data) => (await apiClient.post('/contacts/import', data)).data;
export const getContactActivities = async (id) => (await apiClient.get(`/contacts/${id}/activities`)).data;
export const addContactActivity = async (id, data) => (await apiClient.post(`/contacts/${id}/activities`, data)).data;
export const convertContactToProspect = async (id, data) => (await apiClient.post(`/contacts/${id}/convert`, data)).data;

// ── Analytics / Performance ───────────────────────────────────────────────────
export const getPerformanceStats = async (params) => (await apiClient.get('/performance', { params })).data;
export const getNetworkStats = async () => (await apiClient.get('/network/stats')).data;
export const getRankHistory = async () => (await apiClient.get('/rank/history')).data;
export const getDailyDashboard = async () => (await apiClient.get('/daily-dashboard')).data;
export const completeTask = async (data) => (await apiClient.post('/daily-dashboard/complete', data)).data;
export const getActiveRecommendations = async () => (await apiClient.get('/recommendations/active')).data;
export const markRecommendationRead = async (id) => (await apiClient.patch(`/recommendations/${id}/read`)).data;
export const getFunnelReport = async () => (await apiClient.get('/funnel/report')).data;
export const getWeeklyGoals = async () => (await apiClient.get('/duplication/weekly-goals')).data;
export const getPlaybooks = async () => (await apiClient.get('/playbooks')).data;
export const getOnboardingStatus = async () => (await apiClient.get('/onboarding/status')).data;


// ── Earnings ──────────────────────────────────────────────────────────────────
export const getEarnings = async (params) => (await apiClient.get('/earnings', { params })).data;
export const getEarningsSummary = async () => (await apiClient.get('/earnings/summary')).data;

// ── Payments / Sales ──────────────────────────────────────────────────────────
export const initiatePayment = async (paymentData) => {
  try {
    const response = await apiClient.post('/payments/initiate', paymentData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

/**
 * Verify a payment by its tx_ref.
 * The backend will check Chapa if the payment is still pending.
 * Used by CustomerPayScreen to poll for payment confirmation.
 */
export const verifyPayment = async (txRef) => {
  try {
    const response = await apiClient.get(`/payments/verify/${txRef}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

/**
 * Fetch the distributor's sales / commission history.
 * Pass distributor_id to filter by distributor.
 */
export const getSalesHistory = async (distributorId) => {
  try {
    const response = await apiClient.get('/payments', {
      params: distributorId ? { distributor_id: distributorId } : {},
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

// ── MLM Wallet & Stats ────────────────────────────────────────────────────────
const WALLET_CACHE_KEY = 'nmms_wallet_cache';

export const getWallet = async () => {
  // Return cached data immediately if available, then refresh in background
  const response = await apiClient.get('/wallet');
  // Persist to AsyncStorage for instant load next time
  AsyncStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(response.data)).catch(() => {});
  return response.data;
};

export const getWalletCached = async () => {
  // Returns cached wallet data instantly (no network), then triggers background refresh
  try {
    const cached = await AsyncStorage.getItem(WALLET_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

// ── Customer → Distributor Upgrade ────────────────────────────────────────────
/**
 * Called after a successful customer payment when the customer chooses to
 * become a distributor. Sets their real password and activates their account.
 * Returns a Sanctum token so they can log in immediately.
 */
export const upgradeToDistributor = async ({ email, password, password_confirmation, tx_ref }) => {
  try {
    const response = await apiClient.post('/customer/upgrade', {
      email,
      password,
      password_confirmation,
      tx_ref,
    });
    if (response.data.access_token) {
      await AsyncStorage.setItem('authToken', response.data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    const errData = error.response?.data;
    let msg = errData?.message ?? 'Upgrade failed. Please try again.';
    if (errData?.errors) {
      const first = Object.values(errData.errors)[0];
      msg = Array.isArray(first) ? first[0] : first;
    }
    throw new Error(msg);
  }
};

/**
 * Called when the customer taps "No thanks, stay as customer" after a
 * successful Chapa payment. Ensures the node is created in the tree
 * with status=inactive even if the Chapa webhook never fired.
 */
export const stayAsCustomer = async ({ tx_ref, customer_email }) => {
  try {
    const response = await apiClient.post('/payments/stay-as-customer', { tx_ref, customer_email });
    return response.data;
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};
export const checkCustomerStatus = async (email, txRef) => {
  try {
    const response = await apiClient.get('/customer/status', {
      params: { email, tx_ref: txRef },
    });
    return response.data;
  } catch {
    return { is_distributor: false };
  }
};

// ── Account Product Upgrade ───────────────────────────────────────────────────
export const getUpgradeOptions = async (nodeId) => {
  const response = await apiClient.get('/account/upgrade/options', { params: { node_id: nodeId } });
  return response.data;
};

export const initiateAccountUpgrade = async ({ node_id, new_product_id, distributor_id }) => {
  try {
    const response = await apiClient.post('/account/upgrade/initiate', { node_id, new_product_id, distributor_id });
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const msg = typeof data?.message === 'string' ? data.message : (data ? JSON.stringify(data) : 'Could not initiate upgrade.');
    throw new Error(msg);
  }
};

export const completeAccountUpgrade = async ({ tx_ref, node_id, new_product_id }) => {
  try {
    const response = await apiClient.post('/account/upgrade/complete', { tx_ref, node_id, new_product_id });
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const msg = typeof data?.message === 'string' ? data.message : (data ? JSON.stringify(data) : 'Upgrade failed.');
    throw new Error(msg);
  }
};
export const getMyTree = async () => {
  const response = await apiClient.get('/tree');
  return response.data;
};

export const getSubtreeData = async (nodeId) => {
  const response = await apiClient.get(`/tree/${nodeId}`);
  return response.data;
};

// ── Distributor MLM Join ──────────────────────────────────────────────────────
/**
 * Join the MLM network by purchasing a product package.
 * quantity: 1=single, 2=double, 3=triple, 4=quadruple (more legs)
 *
 * Uses a longer timeout (120s) because the tree placement + commission
 * calculation is heavy and Render free-tier cold starts can be slow.
 *
 * IMPORTANT: Do NOT retry on timeout — the server may have processed the
 * request successfully even though the client timed out. Retrying would
 * create duplicate accounts/nodes.
 */
export const joinNetwork = async ({ product_id, sponsor_id, quantity = 1, preferred_leg = null }) => {
  const payload = { product_id, sponsor_id, quantity };
  if (preferred_leg) payload.preferred_leg = preferred_leg;

  try {
    const response = await apiClient.post('/distributor/join', payload, { timeout: 90000 });
    return response.data;
  } catch (error) {
    if (!error.response) {
      try {
        const statusRes = await apiClient.get('/distributor/status', { timeout: 30000 });
        if (statusRes.data?.has_joined && statusRes.data?.account_count > 0) {
          return {
            status: 'success',
            message: `Successfully joined with ${statusRes.data.account_count} account(s).`,
            accounts: statusRes.data.accounts || [],
          };
        }
      } catch {}
      throw new Error('The server is starting up. Please wait 30 seconds and try again.');
    }
    if (error.response?.data?.message) throw new Error(error.response.data.message);
    throw new Error(error.message || 'Could not connect to the server.');
  }
};

export const getDistributorStatus = async () => {
  try {
    const response = await apiClient.get('/distributor/status');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

export default apiClient;
