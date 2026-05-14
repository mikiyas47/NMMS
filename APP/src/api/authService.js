import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://nmms-backend.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 s — allows Render's free-tier cold start to complete
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  transformResponse: [function (data) {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        // Try to handle concatenated JSON strings (e.g., from Laravel errors appended to response)
        const match = data.match(/^(\{.*?\})(?=\{|$)/);
        if (match) {
          try {
            return JSON.parse(match[1]);
          } catch (e2) {}
        }
        
        try {
          const arrayStr = '[' + data.replace(/\}\{/g, '},{') + ']';
          const arr = JSON.parse(arrayStr);
          return arr[0];
        } catch (e3) {}
        return data;
      }
    }
    return data;
  }],
});

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
    
    // Detect FormData in React Native (can be _parts or FormData instance)
    const isFormData =
      config.data instanceof FormData ||
      (config.data && typeof config.data === 'object' && config.data._parts);

    if (isFormData) {
      // Let the browser/RN set the correct multipart boundary automatically
      delete config.headers['Content-Type'];
    }

    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    if (token) {
       console.log(`[API Token] length: ${token.length}, starts with: ${token.substring(0, 5)}...`);
    } else {
       console.log(`[API Token] No token found in AsyncStorage!`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
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
  } catch (error) {
    console.log('Logout error:', error);
  } finally {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  }
};

export const getProducts = async () => {
  try {
    const response = await apiClient.get('/products');
    return response.data;
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
  } catch (error) {
    console.log('Get user error:', error);
    return null;
  }
};

/**
 * Refresh the user data from the server and update AsyncStorage.
 * Call this after account upgrade to ensure the UI reflects the latest state.
 */
export const refreshUserFromServer = async () => {
  try {
    const response = await apiClient.get('/user');
    const user = response.data;
    if (user) {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      console.log('[refreshUserFromServer] User data updated:', user.email, 'role:', user.role, 'status:', user.status);
    }
    return user;
  } catch (error) {
    console.log('[refreshUserFromServer] Error:', error.message);
    return null;
  }
};

// ── Prospects ─────────────────────────────────────────────────────────────────
export const getProspectDashboard = async () => (await apiClient.get('/prospects/dashboard')).data;
export const getProspects = async (params) => (await apiClient.get('/prospects', { params })).data;
export const createProspect = async (data) => (await apiClient.post('/prospects', data)).data;
export const updateProspect = async (id, data) => (await apiClient.put(`/prospects/${id}`, data)).data;
export const deleteProspect = async (id) => (await apiClient.delete(`/prospects/${id}`)).data;
export const moveProspectStage = async (id, stage) => (await apiClient.patch(`/prospects/${id}/stage`, { stage })).data;
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

// ── Invitations ───────────────────────────────────────────────────────────────
export const createInvitation = async (data) => (await apiClient.post('/invitations', data)).data;
export const getProspectInvitations = async (prospectId) => (await apiClient.get(`/prospects/${prospectId}/invitations`)).data;
export const updateInvitationStatus = async (id, status) => (await apiClient.patch(`/invitations/${id}/status`, { status })).data;
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
    console.log(`[verifyPayment] tx_ref=${txRef}, status=${response.data?.status}`);
    return response.data;
  } catch (error) {
    console.log(`[verifyPayment] Error for tx_ref=${txRef}:`, error.message);
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
export const getWallet = async () => {
  const response = await apiClient.get('/wallet');
  return response.data;
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
    const response = await apiClient.post('/payments/stay-as-customer', {
      tx_ref,
      customer_email,
    });
    return response.data;
  } catch (error) {
    // Non-fatal — log but don't throw. The webhook may have already handled it.
    console.log('[stayAsCustomer] Error (non-fatal):', error.message);
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

// ── Tree ──────────────────────────────────────────────────────────────────────
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
  console.log('[joinNetwork] Requesting with:', payload);

  try {
    // 90s timeout — Render free-tier cold start takes ~30s, plus tree processing.
    const response = await apiClient.post('/distributor/join', payload, {
      timeout: 90000,
    });
    console.log('[joinNetwork] Success:', response.data?.status);
    return response.data;
  } catch (error) {
    console.log('[joinNetwork] Error:', error.message, error.code, error.response?.status, error.response?.data);

    // If it was a timeout or network error (no server response), the server may
    // have actually processed the request. Check status before reporting failure.
    if (!error.response) {
      console.log('[joinNetwork] No server response — checking if join succeeded anyway...');
      try {
        // Give the server up to 30s to respond to the status check
        const statusRes = await apiClient.get('/distributor/status', { timeout: 30000 });
        if (statusRes.data?.has_joined && statusRes.data?.account_count > 0) {
          console.log('[joinNetwork] Server confirmed join succeeded despite timeout!', statusRes.data);
          // Return success — the account was created, just the response was slow
          return {
            status: 'success',
            message: `Successfully joined with ${statusRes.data.account_count} account(s).`,
            accounts: statusRes.data.accounts || [],
          };
        }
      } catch (checkErr) {
        console.log('[joinNetwork] Status check also failed:', checkErr.message);
      }
      // Only show the scary message if we truly cannot confirm success
      throw new Error('The server is starting up. Please wait 30 seconds and try again.');
    }

    // Server responded with an error — surface the real message
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(error.message || 'Could not connect to the server.');
  }
};

export const getDistributorStatus = async () => {
  try {
    const response = await apiClient.get('/distributor/status');
    return response.data;
  } catch (error) {
    console.log('[getDistributorStatus] Error:', error.message, error.response?.status);
    throw error.response ? error.response.data : new Error('Network Error');
  }
};

export default apiClient;
